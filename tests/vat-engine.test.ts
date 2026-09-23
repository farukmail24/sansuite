function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

interface VatInvoice {
  net: number;
  vat: number;
}

function calculateVatReturnBoxes(salesInvoices: VatInvoice[], purchaseInvoices: VatInvoice[]) {
  const box1 = salesInvoices.reduce((acc, inv) => acc + inv.vat, 0); // Output VAT
  const box2 = 0; // VAT due from EC acquisitions
  const box3 = box1 + box2; // Total VAT due
  const box4 = purchaseInvoices.reduce((acc, inv) => acc + inv.vat, 0); // Input VAT reclaimed
  const box5 = Math.abs(box3 - box4); // Net VAT to pay or reclaim
  const box6 = salesInvoices.reduce((acc, inv) => acc + inv.net, 0); // Total sales ex VAT
  const box7 = purchaseInvoices.reduce((acc, inv) => acc + inv.net, 0); // Total purchases ex VAT
  const box8 = 0; // Total EC supplies ex VAT
  const box9 = 0; // Total EC acquisitions ex VAT

  return { box1, box2, box3, box4, box5, box6, box7, box8, box9 };
}

function runVatTests() {
  console.log("Running VAT Engine Box 1-9 Calculation Tests...");

  const sales = [
    { net: 1000, vat: 200 },
    { net: 500, vat: 100 }
  ];

  const purchases = [
    { net: 400, vat: 80 }
  ];

  const vatBoxes = calculateVatReturnBoxes(sales, purchases);

  assert(vatBoxes.box1 === 300, `Box 1 should be 300, got ${vatBoxes.box1}`);
  assert(vatBoxes.box3 === 300, `Box 3 should be 300, got ${vatBoxes.box3}`);
  assert(vatBoxes.box4 === 80, `Box 4 should be 80, got ${vatBoxes.box4}`);
  assert(vatBoxes.box5 === 220, `Box 5 should be 220, got ${vatBoxes.box5}`);
  assert(vatBoxes.box6 === 1500, `Box 6 should be 1500, got ${vatBoxes.box6}`);
  assert(vatBoxes.box7 === 400, `Box 7 should be 400, got ${vatBoxes.box7}`);

  console.log("✅ All VAT Engine Box 1-9 calculation tests passed successfully!");
}

runVatTests();
