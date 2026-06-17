import path from "path";

/** Root directory for persisted app data (Railway volume mount: /data). */
export function getDataDir(): string {
  if (process.env.DATA_DIR) {
    return path.resolve(process.env.DATA_DIR);
  }

  return process.env.NODE_ENV === "production"
    ? "/data"
    : path.join(process.cwd(), "data");
}
