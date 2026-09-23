import fs from "fs";
import path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runProductionSanityCheck() {
  console.log("Running Production Build & Deployment Sanity Check...");

  // Check 1: Verify .env.example exists
  const envExamplePath = path.join(process.cwd(), ".env.example");
  assert(fs.existsSync(envExamplePath), ".env.example must exist");

  // Check 2: Verify Dockerfile exists
  const dockerfilePath = path.join(process.cwd(), "Dockerfile");
  assert(fs.existsSync(dockerfilePath), "Dockerfile must exist");

  // Check 3: Verify docker-compose.yml exists
  const dockerComposePath = path.join(process.cwd(), "docker-compose.yml");
  assert(fs.existsSync(dockerComposePath), "docker-compose.yml must exist");

  // Check 4: Verify package.json script descriptors
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assert(!!packageJson.scripts.build, "build script must exist in package.json");
  assert(!!packageJson.scripts.start, "start script must exist in package.json");

  console.log("✅ Production Deployment & Environment Sanity Checks passed successfully!");
}

runProductionSanityCheck();
