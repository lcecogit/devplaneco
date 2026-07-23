// output: "standalone" produces a self-contained .next/standalone/server.js,
// but it doesn't automatically include static assets — Next.js requires
// these to be copied in manually as part of the build.
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

fs.cpSync(path.join(root, "public"), path.join(standaloneDir, "public"), {
  recursive: true,
});
fs.cpSync(
  path.join(root, ".next", "static"),
  path.join(standaloneDir, ".next", "static"),
  { recursive: true }
);

console.log("Copied public/ and .next/static into .next/standalone/");
