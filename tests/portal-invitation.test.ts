import crypto from "crypto";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function checkLicenseAvailability(totalAllocated: number, usedCount: number): boolean {
  return usedCount < totalAllocated;
}

function runPortalTests() {
  console.log("Running 365 Client Portal Invitation & License Tests...");

  // Test 1: Secure 64-character hex token generation
  const token = generateInvitationToken();
  assert(token.length === 64, `Expected 64-char token, got ${token.length}`);

  // Test 2: License availability calculation
  assert(checkLicenseAvailability(50, 49) === true, "Should allow invite when seats available");
  assert(checkLicenseAvailability(50, 50) === false, "Should block invite when seats full");

  console.log("✅ All 365 Client Portal Invitation & License tests passed successfully!");
}

runPortalTests();
