import { context, build } from "esbuild";
import { mkdir, copyFile, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const building = process.argv.includes("--build");
const output = path.join(root, building ? "demo/dist" : "demo/.dev");
if (building) await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await copyFile(
  path.join(root, "demo/index.html"),
  path.join(output, "index.html")
);
for (const page of ["develop", "scenarios"])
  await copyFile(
    path.join(root, "demo/index.html"),
    path.join(output, `${page}.html`)
  );
if (building)
  await copyFile(
    path.join(root, "demo/_headers"),
    path.join(output, "_headers")
  );
await copyFile(
  path.join(root, "packages/viewer/dist/static/trackdraw-viewer.css"),
  path.join(output, "viewer.css")
);
await copyFile(
  path.join(root, "demo/assets/favicon.ico"),
  path.join(output, "favicon.ico")
);
const clients = new Set();
const options = {
  absWorkingDir: root,
  entryPoints: ["demo/app.tsx"],
  bundle: true,
  loader: { ".svg": "dataurl" },
  splitting: true,
  format: "esm",
  outdir: output,
  sourcemap: !building,
  minify: building,
  target: "es2022",
  define: {
    __DEMO_DEV__: JSON.stringify(!building),
    "process.env.NODE_ENV": JSON.stringify(
      building ? "production" : "development"
    ),
  },
  plugins: [
    {
      name: "reload",
      setup(builder) {
        builder.onEnd((result) => {
          if (!result.errors.length)
            for (const client of clients) client.write("data: reload\n\n");
        });
      },
    },
  ],
};
if (building) {
  await build(options);
  process.exit(0);
}
const ctx = await context(options);
await ctx.rebuild();
await ctx.watch();
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/__reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });
    res.write(": ready\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  try {
    let pathname = decodeURIComponent(url.pathname);
    if (
      ["/develop", "/develop/", "/scenarios", "/scenarios/"].includes(pathname)
    )
      pathname = pathname.replace(/\/$/, "") + ".html";
    const file = path.resolve(
      output,
      `.${pathname === "/" ? "/index.html" : pathname}`
    );
    if (!file.startsWith(output + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type":
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".ico": "image/x-icon",
          ".map": "application/json",
        }[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
server.listen(Number(process.env.DEMO_PORT ?? 5180), "127.0.0.1", () =>
  console.log(`Demo: http://localhost:${server.address().port}`)
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    for (const client of clients) client.end();
    server.close();
    await ctx.dispose();
    process.exit(0);
  });
