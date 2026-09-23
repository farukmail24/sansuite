import { calcPayeTax, calcNI } from "../server/api/payroll";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log("Running Payroll Engine Calculation Tests...");

  // Test 1: PAYE Tax under Personal Allowance (£12,570/yr) -> 0 tax
  const zeroTax = calcPayeTax(12000);
  assert(zeroTax === 0, `Expected 0 tax for £12,000/yr, got ${zeroTax}`);

  // Test 2: Standard Basic Rate Tax (£30,000/yr)
  // Taxable = 30,000 - 12,570 = 17,430 @ 20% = £3,486/yr -> £290.50/mo
  const basicTax = calcPayeTax(30000);
  assert(Math.abs(basicTax - 290.5) < 0.01, `Expected ~£290.50 monthly tax for £30k, got ${basicTax}`);

  // Test 3: Higher Rate Tax (£60,000/yr)
  // Taxable = 60,000 - 12,570 = 47,430
  // First 37,700 @ 20% = £7,540
  // Remaining 9,730 @ 40% = £3,892
  // Total = £11,432/yr -> £952.67/mo
  const higherTax = calcPayeTax(60000);
  assert(Math.abs(higherTax - 952.67) < 0.1, `Expected ~£952.67 monthly tax for £60k, got ${higherTax}`);

  // Test 4: National Insurance for £3,000/mo (£36,000/yr)
  // Employee NI: (36,000 - 12,570) * 8% / 12 = £156.20/mo
  const niRes = calcNI(3000);
  assert(Math.abs(niRes.employee - 156.2) < 0.1, `Expected ~£156.20 employee NI, got ${niRes.employee}`);

  console.log("✅ All Payroll Calculation Engine tests passed successfully!");
}

runTests();
