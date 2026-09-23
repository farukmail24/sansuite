// Double-Entry Ledger Balancing Verification Test

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
}

export function validateDoubleEntry(lines: JournalLine[]): boolean {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  return Math.abs(totalDebit - totalCredit) < 0.001;
}

export function runLedgerTests() {
  console.log("▶ Running Double-Entry Ledger Unit Tests...");

  // Test 1: Balanced Transaction (Sales Invoice: Bank Dr 120, Sales Cr 100, VAT Cr 20)
  const balancedLines: JournalLine[] = [
    { accountCode: "1200", debit: 120, credit: 0 },
    { accountCode: "4000", debit: 0, credit: 100 },
    { accountCode: "2200", debit: 0, credit: 20 },
  ];
  assert(validateDoubleEntry(balancedLines) === true, "Balanced journal entries must balance");

  // Test 2: Unbalanced Transaction
  const unbalancedLines: JournalLine[] = [
    { accountCode: "1200", debit: 100, credit: 0 },
    { accountCode: "4000", debit: 0, credit: 50 },
  ];
  assert(validateDoubleEntry(unbalancedLines) === false, "Unbalanced journal entries must fail validation");

  console.log("✅ All Double-Entry Ledger Tests Passed!");
}

if (process.env.RUN_TESTS === "true") {
  runLedgerTests();
}
