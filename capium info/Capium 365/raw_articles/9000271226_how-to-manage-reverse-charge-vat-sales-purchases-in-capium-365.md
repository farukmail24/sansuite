# How to Manage Reverse Charge VAT (Sales &amp; Purchases) in Capium 365
	 	
			
			Print

- **Category:** Capium 365
- **Folder:** Capium 365 (Accountant)
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000271226-how-to-manage-reverse-charge-vat-sales-purchases-in-capium-365](https://capium.freshdesk.com/support/solutions/articles/9000271226-how-to-manage-reverse-charge-vat-sales-purchases-in-capium-365)
- **Article ID:** 9000271226

## Content

Solution home 
		Capium 365
		Capium 365 (Accountant)

### How to Manage Reverse Charge VAT (Sales & Purchases) in Capium 365

			Print

	Modified on: Thu, 18 Sep, 2025 at  4:39 PM

### What is Reverse Charge VAT?

The reverse charge mechanism shifts the responsibility for accounting for VAT from the supplier to the customer. Instead of the supplier charging VAT, the customer must declare both the output VAT and input VAT on their VAT return.

This is common in:

 - Purchases of services from overseas (e.g., EU suppliers).

 - Certain UK industries like construction (domestic reverse charge).

 - Some cross-border sales of goods and digital services.

Capium 365 supports reverse charge VAT by offering specific VAT codes such as RC-S (20%).

Related: VAT Codes in Capium

### Recording Reverse Charge on Purchases

### Example

A UK VAT-registered company buys consultancy services from a German supplier. Invoice total: €1,000 (no VAT charged).

### Steps

 - Go to: Capium 365 → Client → Books → Purchases → + New Purchase Invoice.

 - Select the supplier (add a new one if needed).

 - Enter the net amount of the invoice.

 - In the VAT Code dropdown, choose RC-S (20%) (or the relevant reverse charge code).

 - Save the invoice.

### How It Appears on the VAT Return

 - Box 1 (Output VAT) → £200 (20% of £1,000).

 - Box 4 (Input VAT) → £200 (assuming full recovery).

 - Box 7 (Net Purchases) → £1,000.

Important: If your client is partially exempt or not fully VAT-registered, input VAT recovery may not apply.

Related: How do I create VAT Reverse Charges?

### Recording Reverse Charge on Sales

### Example

A UK VAT-registered digital agency sells software services to a French VAT-registered business. Invoice total: £2,000.

### Steps

 - Go to: Capium 365 → Client → Books → Sales → + New Invoice.

 - Select the customer (ensure they are marked as VAT-registered overseas).

 - Enter the net amount of the invoice.

 - In the VAT Code dropdown, select RC-S (20%) (or the correct reverse charge VAT code).

 - Add a note on the invoice: “Reverse charge applies — customer to account for VAT.”

 - Save and send the invoice.

### How It Appears on the VAT Return

 - Box 6 (Net Sales) → £2,000.

 - No VAT is charged on the invoice.

 - The overseas customer accounts for VAT in their country.

 Important: Always include the wording “Reverse charge: customer to account for VAT” and the customer’s VAT number on the invoice.

### Best Practices & Tips

 - Always double-check if the transaction qualifies for reverse charge before applying it.

 - Ensure invoices include required reverse charge wording.

 - Review VAT Return preview to confirm entries appear in the correct boxes.

 - Use the right VAT code (RC-S 20%, RC-R 5%, or sector-specific codes).

 - Don’t treat reverse charge as “exempt” or “zero-rated” — it requires its own VAT code.

### Summary

 - Purchases (from overseas or reverse charge suppliers): use RC-S VAT code; VAT posts to both Box 1 & 4.

 - Sales (to overseas VAT-registered businesses): use RC-S VAT code; net appears in Box 6, no VAT charged.

 - Always add clear invoice wording: “Reverse charge: customer to account for VAT.”

? Further reading:

 - VAT Codes in Capium

 - How do I create VAT Reverse Charges?

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

