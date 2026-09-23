import { build as buildVite } from "vite";
import { build as buildEsbuild } from "esbuild";
import path from "path";

async function runBuild() {
  console.log("▶ Building Client Assets with Vite...");
  await buildVite({
    configFile: path.resolve(process.cwd(), "vite.config.ts"),
  });
  console.log("✅ Client build complete (saved to dist/public).");

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
}

runBuild().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
