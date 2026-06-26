import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

const clean = process.argv.includes("--clean");
const port = process.env.PORT ?? "3000";

if (clean) {
  for (const dir of [".next", "node_modules/.cache"]) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`Starting Next.js dev server on http://localhost:${port} ...`);

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const child = spawn(npx, ["next", "dev", "--turbopack", "-p", port], {
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
