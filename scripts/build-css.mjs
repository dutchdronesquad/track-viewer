import { execFileSync } from "node:child_process";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import postcss from "postcss";
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

// Prefix every emitted selector, including Tailwind theme/property defaults.
// Nested selectors already inherit their outer rule's scope. Never scope keyframe steps.
const css = postcss.parse(readFileSync(output, "utf8"));
css.walkRules((rule) => {
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (
      parent.type === "rule" ||
      (parent.type === "atrule" && parent.name.endsWith("keyframes"))
    )
      return;
  }
  rule.selectors = rule.selectors.map((selector) => {
    if (selector.includes(".trackdraw-viewer")) return selector;
    if (selector === ":root" || selector === ":host")
      return ".trackdraw-viewer";
    return `:where(.trackdraw-viewer) ${selector}`;
  });
});
const animations = new Map();
css.walkAtRules("keyframes", (rule) => {
  animations.set(rule.params, `tdv-${rule.params}`);
  rule.params = `tdv-${rule.params}`;
});
css.walkDecls((declaration) => {
  if (
    !declaration.prop.includes("animation") &&
    !declaration.prop.startsWith("--animate")
  )
    return;
  for (const [name, scoped] of animations) {
    declaration.value = declaration.value.replace(
      new RegExp(`\\b${name}\\b`, "g"),
      scoped
    );
  }
});
writeFileSync(output, css.toString());

// TypeScript's checked side-effect imports also need a declaration for CSS.
writeFileSync(`${output}.d.ts`, "export {};\n");
// Preserve the React client boundary after bundling, without marking the light
// snapshot/asset subpaths as client-only (they are used by server consumers).
for (const entry of ["index.js", "mount.js"]) {
  const file = path.join(ROOT, "dist", entry);
  writeFileSync(file, '"use client";\n' + readFileSync(file, "utf8"));
}
