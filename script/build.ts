import { build as buildVite } from "vite";
import { build as buildEsbuild } from "esbuild";
import fs from "fs";
import path from "path";

async function runBuild() {
  const serverOnly = process.argv.includes("--server-only");
  if (!serverOnly) {
    console.log("▶ Building Client Assets with Vite...");
    await buildVite({
      configFile: path.resolve(process.cwd(), "vite.config.ts"),
    });
    console.log("✅ Client build complete (saved to dist/public).");
  }

  console.log("▶ Building Server Bundle with esbuild...");
  await buildEsbuild({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "dist/index.cjs",
    packages: "external",
    sourcemap: false,
    minify: false,
  });
  console.log("✅ Server build complete (saved to dist/index.cjs).");

  console.log("▶ Building Vercel Serverless API Bundle with esbuild...");
  await buildEsbuild({
    entryPoints: ["server/serverless.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "esm",
    outfile: "api/index.js",
    // Keep npm packages external — Vercel installs them from package.json
    packages: "external",
    sourcemap: false,
    minify: false,
    define: {
      "process.env.VERCEL": '"1"',
    },
  });

  const apiPkg = path.resolve(process.cwd(), "api/package.json");
  if (fs.existsSync(apiPkg)) {
    fs.unlinkSync(apiPkg);
  }

  console.log("✅ Vercel Serverless API bundle complete (saved to api/index.js).");
}

runBuild().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
