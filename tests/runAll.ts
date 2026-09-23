import { runPayrollTests } from "./payroll.test";
import { runLedgerTests } from "./ledger.test";
import { runVatTests } from "./vat.test";
import { runCorporationTaxTests } from "./corporationTax.test";
import { execSync } from "child_process";

console.log("==========================================");
console.log("   SanSuite Enterprise Test Suite Runner ");
console.log("==========================================");

try {
  runPayrollTests();
  runLedgerTests();
  runVatTests();
  runCorporationTaxTests();

  console.log("Running Payroll Engine Tax & NI Tests...");
  execSync("npx tsx tests/payroll-engine.test.ts", { stdio: "inherit" });

  console.log("Running VAT Box 1-9 Return Tests...");
  execSync("npx tsx tests/vat-engine.test.ts", { stdio: "inherit" });

  console.log("Running 365 Client Portal Tests...");
  execSync("npx tsx tests/portal-invitation.test.ts", { stdio: "inherit" });

  console.log("==========================================");
  console.log("   ALL AUTOMATED SUITES PASSED CLEANLY!   ");
  console.log("==========================================");
} catch (err: any) {
  console.error("Test suite failed:", err.message);
  process.exit(1);
}
