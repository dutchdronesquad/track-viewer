import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const input = path.join(ROOT, "src/static-entry.css");
const output = path.join(ROOT, "dist/static/trackdraw-viewer.css");

execFileSync(
  "npx",
  [
    "@tailwindcss/cli",
    "-i",
    input,
    "-o",
    output,
    "--content",
    path.join(ROOT, "src/**/*.tsx"),
    "--minify",
  ],
  { cwd: ROOT, stdio: "inherit" }
);
