#!/usr/bin/env node
/**
 * MySteam Dev Server Tool
 * One place to check status and control the Next.js dev server.
 *
 * Usage:
 *   node scripts/devctl.mjs          Interactive menu
 *   node scripts/devctl.mjs status   Show status
 *   node scripts/devctl.mjs start    Start server (new window on Windows)
 *   node scripts/devctl.mjs stop     Stop server
 *   node scripts/devctl.mjs restart  Restart server
 *   node scripts/devctl.mjs clean    Clear .next cache
 *   node scripts/devctl.mjs build    Production build
 *   node scripts/devctl.mjs open     Open in browser
 */

import { spawn, spawnSync, execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { createInterface } from "node:readline";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 3000;
const URL = `http://localhost:${PORT}`;
const isWin = process.platform === "win32";
const CACHE_DIRS = [".next", "node_modules/.cache"];

// ─── Helpers ───────────────────────────────────────────────────────────────

function log(msg = "") {
  console.log(msg);
}

function runQuiet(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function checkProject() {
  if (!existsSync(path.join(ROOT, "package.json"))) {
    log("ERROR: Run this from the MySteam project folder (package.json not found).");
    process.exit(1);
  }
}

function ensureDeps() {
  if (!existsSync(path.join(ROOT, "node_modules", "next", "package.json"))) {
    log("Dependencies are missing. Running npm install...\n");
    const r = spawnSyncCompat("npm", ["install"], { stdio: "inherit" });
    if (r !== 0) {
      log("\nERROR: npm install failed.");
      process.exit(1);
    }
    log("");
  }
}

function spawnSyncCompat(cmd, args, opts = {}) {
  const bin = isWin && !cmd.endsWith(".cmd") && !cmd.includes("/") ? `${cmd}.cmd` : cmd;
  const result = spawnSync(bin, args, { cwd: ROOT, shell: false, ...opts });
  return result.status ?? 1;
}

// ─── Status detection ───────────────────────────────────────────────────────

function getPidsOnPort(port) {
  if (isWin) {
    const out = runQuiet(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`
    );
    return [...new Set(out.split(/\s+/).map(Number).filter((n) => n > 0))];
  }
  const out = runQuiet(`lsof -ti :${port} -sTCP:LISTEN 2>/dev/null`);
  return out ? [...new Set(out.split(/\s+/).map(Number).filter((n) => n > 0))] : [];
}

function getNextDevPids() {
  const rootEsc = isWin ? ROOT.replace(/\\/g, "\\\\") : ROOT;
  if (isWin) {
    const ps = `
      $root = '${rootEsc.replace(/'/g, "''")}'
      Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -match 'next' -and $_.CommandLine -match [regex]::Escape($root) } |
        Select-Object -ExpandProperty ProcessId
    `;
    const out = runQuiet(`powershell -NoProfile -Command "${ps.replace(/\n/g, " ")}"`);
    return [...new Set(out.split(/\s+/).map(Number).filter((n) => n > 0))];
  }
  const out = runQuiet(`pgrep -f "next dev" 2>/dev/null || true`);
  return out ? [...new Set(out.split(/\s+/).map(Number).filter((n) => n > 0))] : [];
}

function checkHttp() {
  return new Promise((resolve) => {
    const req = http.get(URL, (res) => {
      resolve({ ok: res.statusCode < 500, code: res.statusCode });
      res.resume();
    });
    req.on("error", () => resolve({ ok: false, code: 0 }));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve({ ok: false, code: 0 });
    });
  });
}

async function getStatus() {
  const portPids = getPidsOnPort(PORT);
  const nextPids = getNextDevPids();
  const allPids = [...new Set([...portPids, ...nextPids])];
  const http = await checkHttp();

  let state;
  if (http.ok) state = "running";
  else if (allPids.length > 0) state = "starting";
  else state = "stopped";

  return {
    state,
    port: PORT,
    url: URL,
    pids: allPids,
    http,
    cacheExists: existsSync(path.join(ROOT, ".next")),
  };
}

function stateLabel(state) {
  if (state === "running") return "Running";
  if (state === "starting") return "Starting (not responding yet)";
  return "Stopped";
}

async function printStatus() {
  const s = await getStatus();
  log("");
  log("  MySteam Dev Server");
  log("  " + "─".repeat(40));
  log(`  Status:   ${stateLabel(s.state)}`);
  log(`  Address:  ${s.url}`);
  if (s.pids.length > 0) log(`  Process:  PID ${s.pids.join(", ")}`);
  if (s.state === "running") log(`  Health:   OK (HTTP ${s.http.code})`);
  else if (s.state === "starting") log("  Health:   Waiting for the server to respond...");
  log(`  Cache:    ${s.cacheExists ? ".next folder exists" : "No .next cache"}`);
  log(`  Project:  ${ROOT}`);
  log("");
  return s;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function killPids(pids) {
  let killed = 0;
  for (const pid of pids) {
    try {
      if (isWin) {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      } else {
        process.kill(pid, "SIGTERM");
      }
      killed++;
    } catch {
      /* already gone */
    }
  }
  return killed;
}

async function stopServer() {
  log("\nStopping the dev server...\n");

  const before = [...new Set([...getPidsOnPort(PORT), ...getNextDevPids()])];
  let killed = killPids(before);

  // Also try port 3001 in case user switched ports
  if (PORT !== 3001) killed += killPids(getPidsOnPort(3001));

  await sleep(800);
  const after = await getStatus();

  if (after.state === "stopped") {
    log(killed > 0 ? `Done. Stopped ${killed} process(es).` : "Done. Nothing was running.");
  } else {
    log(`Warning: Something may still be using port ${PORT} (PID ${after.pids.join(", ")}).`);
    log("Try closing any terminal windows running npm run dev, then run stop again.");
  }
  log("");
}

function cleanCache() {
  log("\nClearing build cache...\n");
  let cleared = 0;
  for (const dir of CACHE_DIRS) {
    const full = path.join(ROOT, dir);
    if (existsSync(full)) {
      rmSync(full, { recursive: true, force: true });
      log(`  Removed ${dir}/`);
      cleared++;
    }
  }
  log(cleared ? "\nCache cleared." : "\nNothing to clear — cache was already empty.");
  log("");
}

function runNextDevForeground(watch = false) {
  ensureDeps();
  let failures = 0;

  const loop = async () => {
    if (watch && failures > 0) {
      log(`\n[Auto-restart] Clearing cache after crash (${failures}/5)...\n`);
      for (const dir of CACHE_DIRS) {
        const full = path.join(ROOT, dir);
        if (existsSync(full)) rmSync(full, { recursive: true, force: true });
      }
    }

    killPids(getPidsOnPort(PORT));
    await sleep(500);

    log(`Starting Next.js at ${URL} ...\n`);

    const nextBin = path.join(ROOT, "node_modules", ".bin", isWin ? "next.cmd" : "next");
    const code = await new Promise((resolve) => {
      const child = spawn(nextBin, ["dev", "--turbopack", "-p", String(PORT)], {
        cwd: ROOT,
        stdio: "inherit",
        shell: false,
      });
      child.on("exit", (c) => resolve(c ?? 1));
    });

    if (!watch || code === 0) return code;

    failures++;
    if (failures >= 5) {
      log("\nStopped auto-restart after 5 crashes. Check the errors above.");
      return code;
    }

    log(`\nServer stopped (exit ${code}). Restarting in 2 seconds...\n`);
    await sleep(2000);
    return loop();
  };

  return loop();
}

async function startServer({ clean = false, watch = false, foreground = false } = {}) {
  checkProject();
  ensureDeps();

  const status = await getStatus();
  if (status.state === "running") {
    log(`\nThe dev server is already running at ${URL}`);
    log(`Process: PID ${status.pids.join(", ")}\n`);
    return;
  }

  if (clean) cleanCache();

  if (foreground) {
    log(watch ? "\nStarting with auto-restart on crash. Press Ctrl+C to stop.\n" : "");
    await runNextDevForeground(watch);
    return;
  }

  log(`\nStarting the dev server in a new window...`);
  log(`It will be available at ${URL}\n`);

  const script = watch ? ["scripts/devctl.mjs", "start", "--foreground", "--watch"] : ["scripts/dev.mjs"];
  const node = process.execPath;

  if (isWin) {
    const title = watch ? "MySteam Dev (auto-restart)" : "MySteam Dev Server";
    const args = ["/c", "start", title, "cmd", "/k", node, ...script];
    spawn("cmd.exe", args, { cwd: ROOT, detached: true, stdio: "ignore", windowsHide: true }).unref();
  } else if (process.platform === "darwin") {
    const inner = watch
      ? `cd '${ROOT}' && ${node} scripts/devctl.mjs start --foreground --watch`
      : `cd '${ROOT}' && ${node} scripts/dev.mjs`;
    spawn("osascript", ["-e", `tell application "Terminal" to do script "${inner}"`], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    spawn(node, script, { cwd: ROOT, detached: true, stdio: "ignore" }).unref();
  }

  log("Waiting for the server to come up...");
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const s = await getStatus();
    if (s.state === "running") {
      log(`\nReady! Open ${URL} in your browser.\n`);
      return;
    }
  }
  log("\nServer is starting — it may take a few more seconds. Check the dev server window.\n");
}

async function restartServer({ clean = false, watch = false } = {}) {
  await stopServer();
  await sleep(500);
  await startServer({ clean, watch });
}

async function runBuild() {
  checkProject();
  ensureDeps();
  log("\nRunning production build (npm run build)...\n");
  const code = spawnSyncCompat("npm", ["run", "build"], { stdio: "inherit" });
  log(code === 0 ? "\nBuild finished successfully.\n" : "\nBuild failed. See errors above.\n");
  process.exit(code);
}

function openBrowser() {
  const cmd = isWin ? `start "" "${URL}"` : process.platform === "darwin" ? `open "${URL}"` : `xdg-open "${URL}"`;
  try {
    execSync(cmd, { stdio: "ignore", shell: isWin });
    log(`\nOpened ${URL} in your browser.\n`);
  } catch {
    log(`\nCould not open the browser. Go to ${URL} manually.\n`);
  }
}

// ─── Interactive menu ────────────────────────────────────────────────────────

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

async function showMenu() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  while (true) {
    await printStatus();

    log("  What would you like to do?");
    log("");
    log("  [1] Start the dev server");
    log("  [2] Start with auto-restart (recovers from crashes)");
    log("  [3] Stop the dev server");
    log("  [4] Restart the dev server");
    log("  [5] Restart with a clean cache (fixes weird errors)");
    log("  [6] Clear build cache only");
    log("  [7] Run a production build");
    log("  [8] Open the app in your browser");
    log("  [R] Refresh status");
    log("  [Q] Quit");
    log("");

    const choice = (await ask(rl, "  Enter choice: ")).toLowerCase();

    switch (choice) {
      case "1":
        await startServer();
        break;
      case "2":
        await startServer({ watch: true });
        break;
      case "3":
        await stopServer();
        break;
      case "4":
        await restartServer();
        break;
      case "5":
        await restartServer({ clean: true });
        break;
      case "6":
        cleanCache();
        break;
      case "7":
        rl.close();
        await runBuild();
        return;
      case "8":
        openBrowser();
        break;
      case "r":
      case "":
        break;
      case "q":
        rl.close();
        log("\nBye.\n");
        return;
      default:
        log("\n  Unknown choice. Pick a number from the menu.\n");
    }
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function runCommand(cmd, args) {
  const clean = args.includes("--clean");
  const watch = args.includes("--watch");
  const foreground = args.includes("--foreground");

  switch (cmd) {
    case "status":
      await printStatus();
      break;
    case "start":
      await startServer({ clean, watch, foreground });
      break;
    case "stop":
      await stopServer();
      break;
    case "restart":
      await restartServer({ clean, watch });
      break;
    case "clean":
      cleanCache();
      break;
    case "build":
      await runBuild();
      break;
    case "open":
      openBrowser();
      break;
    case "help":
    case "--help":
    case "-h":
      log(`
MySteam Dev Server Tool

  node scripts/devctl.mjs              Interactive menu
  node scripts/devctl.mjs status       Show if the server is running
  node scripts/devctl.mjs start        Start in a new window
  node scripts/devctl.mjs stop         Stop the dev server
  node scripts/devctl.mjs restart      Stop, then start again
  node scripts/devctl.mjs restart --clean   Restart and clear .next cache
  node scripts/devctl.mjs clean        Clear .next cache only
  node scripts/devctl.mjs build        Run npm run build
  node scripts/devctl.mjs open         Open http://localhost:${PORT}

Flags for start/restart:
  --clean    Clear cache before starting
  --watch    Auto-restart on crash (with start --foreground, runs in this window)
`);
      break;
    default:
      log(`Unknown command: ${cmd}\nRun with "help" for usage.\n`);
      process.exit(1);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

checkProject();

const cmd = process.argv[2]?.toLowerCase();

if (cmd && cmd !== "menu") {
  await runCommand(cmd, process.argv.slice(3));
} else if (process.argv.includes("--foreground")) {
  const watch = process.argv.includes("--watch");
  await runNextDevForeground(watch);
} else {
  await showMenu();
  if (isWin && process.stdin.isTTY) {
    await new Promise((r) => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      rl.question("Press Enter to close...", () => {
        rl.close();
        r();
      });
    });
  }
}
