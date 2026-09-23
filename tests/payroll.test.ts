import { calcPayeTax, calcNI } from "../server/api/payroll";

// Simple custom test runner assertion helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function assertAlmostEqual(actual: number, expected: number, tolerance = 0.01, message = "") {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`ASSERTION FAILED: ${message} - Expected ~${expected}, got ${actual}`);
  }
}

export function runPayrollTests() {
  console.log("▶ Running Payroll Calculation Unit Tests...");

  // Test 1: Below Tax Allowance (£12,000/yr) -> 0 Tax
  const taxBelow = calcPayeTax(12000);
  assertAlmostEqual(taxBelow, 0, 0.01, "Tax below allowance should be 0");

  // Test 2: Standard Rate Taxpayer (£30,000/yr)
  // Taxable: 30000 - 12570 = 17430
  // Annual Tax: 17430 * 0.20 = 3486
  // Monthly Tax: 3486 / 12 = 290.50
  const taxStandard = calcPayeTax(30000);
  assertAlmostEqual(taxStandard, 290.50, 0.01, "Tax for £30,000 annual income");

  // Test 3: National Insurance for £2,500/mo (£30,000/yr)
  // Annual NI threshold: 12570
  // Annual NIable: 30000 - 12570 = 17430
  // Employee NI @ 8%: 17430 * 0.08 = 1394.40 / 12 = 116.20
  const niResult = calcNI(2500);
  assertAlmostEqual(niResult.employee, 116.20, 0.01, "Employee NI for £2500/mo");

  console.log("✅ All Payroll Calculation Tests Passed!");
}

if (process.env.RUN_TESTS === "true") {
  runPayrollTests();
}
