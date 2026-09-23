// UK Corporation Tax (CT600) Marginal Relief & Tax Calculation Engine Tests

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

export function calculateCT600Tax(taxableProfit: number): {
  taxableProfit: number;
  grossTax: number;
  marginalRelief: number;
  netTaxDue: number;
  effectiveRate: number;
} {
  const profit = Math.max(0, taxableProfit);
  let grossTax = 0;
  let marginalRelief = 0;

  if (profit <= 50000) {
    // Small profits rate: 19%
    grossTax = profit * 0.19;
    marginalRelief = 0;
  } else if (profit >= 250000) {
    // Main rate: 25%
    grossTax = profit * 0.25;
    marginalRelief = 0;
  } else {
    // Marginal relief band (£50,000 to £250,000)
    // Full rate tax at 25% minus marginal relief fraction (3/200 = 0.015)
    grossTax = profit * 0.25;
    marginalRelief = (250000 - profit) * (3 / 200);
  }

  const netTaxDue = Math.max(0, grossTax - marginalRelief);
  const effectiveRate = profit > 0 ? (netTaxDue / profit) * 100 : 0;

  return {
    taxableProfit: profit,
    grossTax: Number(grossTax.toFixed(2)),
    marginalRelief: Number(marginalRelief.toFixed(2)),
    netTaxDue: Number(netTaxDue.toFixed(2)),
    effectiveRate: Number(effectiveRate.toFixed(2))
  };
}

export function runCorporationTaxTests() {
  console.log("▶ Running UK Corporation Tax (CT600) Marginal Relief Unit Tests...");

  // Test 1: Small profits rate (£40,000 profit -> 19% tax = £7,600)
  const smallProfit = calculateCT600Tax(40000);
  assertAlmostEqual(smallProfit.netTaxDue, 7600, 0.01, "Small profit £40k @ 19%");
  assertAlmostEqual(smallProfit.marginalRelief, 0, 0.01, "Small profit marginal relief should be 0");
  assertAlmostEqual(smallProfit.effectiveRate, 19.00, 0.01, "Effective rate 19%");

  // Test 2: Marginal Relief Band (£100,000 profit)
  // Gross tax @ 25%: £25,000
  // Marginal relief: (250,000 - 100,000) * 0.015 = 150,000 * 0.015 = £2,250
  // Net Tax Due: 25,000 - 2,250 = £22,750
  // Effective rate: 22,750 / 100,000 = 22.75%
  const marginalProfit = calculateCT600Tax(100000);
  assertAlmostEqual(marginalProfit.grossTax, 25000, 0.01, "Marginal profit gross tax @ 25%");
  assertAlmostEqual(marginalProfit.marginalRelief, 2250, 0.01, "Marginal relief amount for £100k");
  assertAlmostEqual(marginalProfit.netTaxDue, 22750, 0.01, "Net CT tax due for £100k");
  assertAlmostEqual(marginalProfit.effectiveRate, 22.75, 0.01, "Effective rate 22.75%");

  // Test 3: Large Profit (£300,000 profit -> 25% tax = £75,000)
  const largeProfit = calculateCT600Tax(300000);
  assertAlmostEqual(largeProfit.netTaxDue, 75000, 0.01, "Large profit £300k @ 25%");
  assertAlmostEqual(largeProfit.marginalRelief, 0, 0.01, "Large profit marginal relief should be 0");

  console.log("✅ All UK Corporation Tax (CT600) Unit Tests Passed!");
}

if (process.env.RUN_TESTS === "true") {
  runCorporationTaxTests();
}
