import { readFileSync, writeFileSync } from "node:fs";

const tag = process.argv[2];
if (!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(tag ?? "")) {
  throw new Error("Expected a stable vX.Y.Z release tag.");
}
const version = tag.slice(1);
for (const file of [
  "package.json",
  "packages/schema/package.json",
  "packages/viewer/package.json",
]) {
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  pkg.version = version;
  if (pkg.name === "@trackdraw/viewer")
    pkg.dependencies["@trackdraw/schema"] = version;
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
lock.version = version;
for (const location of ["", "packages/schema", "packages/viewer"])
  lock.packages[location].version = version;
lock.packages["packages/viewer"].dependencies["@trackdraw/schema"] = version;
writeFileSync("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);
