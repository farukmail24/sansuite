import { HMRC_Gateway } from "../server/lib/hmrcGateway";

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

export function calculateVatReturn(salesLines: Array<{ netAmount: number; vatRate: number; isEU?: boolean }>, purchaseLines: Array<{ netAmount: number; vatRate: number; isEU?: boolean }>) {
  let vatDueSales = 0;       // Box 1
  let vatDueAcquisitions = 0; // Box 2
  let vatReclaimed = 0;      // Box 4
  let salesExVat = 0;        // Box 6
  let purchasesExVat = 0;    // Box 7
  let ecSupplies = 0;        // Box 8
  let ecAcquisitions = 0;    // Box 9

  for (const s of salesLines) {
    const vat = s.netAmount * (s.vatRate / 100);
    vatDueSales += vat;
    salesExVat += s.netAmount;
    if (s.isEU) ecSupplies += s.netAmount;
  }

  for (const p of purchaseLines) {
    const vat = p.netAmount * (p.vatRate / 100);
    if (p.isEU) {
      vatDueAcquisitions += vat;
      ecAcquisitions += p.netAmount;
    }
    vatReclaimed += vat;
    purchasesExVat += p.netAmount;
  }

  const totalVatDue = vatDueSales + vatDueAcquisitions; // Box 3
  const netVatDue = Math.abs(totalVatDue - vatReclaimed); // Box 5

  return {
    vatDueSales,
    vatDueAcquisitions,
    totalVatDue,
    vatReclaimedCurrPeriod: vatReclaimed,
    netVatDue,
    totalValueSalesExVAT: salesExVat,
    totalValuePurchasesExVAT: purchasesExVat,
    totalValueGoodsSuppliesExVAT: ecSupplies,
    totalAcquisitionsExVAT: ecAcquisitions,
  };
}

export function runVatTests() {
  console.log("▶ Running UK HMRC MTD VAT 9-Box Unit Tests...");

  // Standard Sales: £10,000 net @ 20% VAT -> Box 1 = 2000, Box 6 = 10000
  // Standard Purchases: £4,000 net @ 20% VAT -> Box 4 = 800, Box 7 = 4000
  const result = calculateVatReturn(
    [{ netAmount: 10000, vatRate: 20 }],
    [{ netAmount: 4000, vatRate: 20 }]
  );

  assertAlmostEqual(result.vatDueSales, 2000, 0.01, "Box 1: Sales VAT");
  assertAlmostEqual(result.vatDueAcquisitions, 0, 0.01, "Box 2: EU Acquisitions VAT");
  assertAlmostEqual(result.totalVatDue, 2000, 0.01, "Box 3: Total VAT Due");
  assertAlmostEqual(result.vatReclaimedCurrPeriod, 800, 0.01, "Box 4: Purchases VAT Reclaimed");
  assertAlmostEqual(result.netVatDue, 1200, 0.01, "Box 5: Net VAT Payable");
  assertAlmostEqual(result.totalValueSalesExVAT, 10000, 0.01, "Box 6: Total Net Sales");
  assertAlmostEqual(result.totalValuePurchasesExVAT, 4000, 0.01, "Box 7: Total Net Purchases");

  // Validate HMRC Gateway Payload formatting
  const payload = HMRC_Gateway.generateVAT9Box_JSON({
    periodKey: "23A1",
    ...result
  });

  assert(payload.periodKey === "23A1", "Period key formatted");
  assert(payload.netVatDue === 1200, "Payload net VAT due");

  const validation = HMRC_Gateway.validateVat9Box(result);
  assert(validation.valid === true, "HMRC 9-box mathematical consistency check");

  console.log("✅ All HMRC VAT 9-Box Return Tests Passed!");
}

if (process.env.RUN_TESTS === "true") {
  runVatTests();
}
