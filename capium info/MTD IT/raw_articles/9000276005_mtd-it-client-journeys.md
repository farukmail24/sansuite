# MTD IT - Client Journeys
	 	
			
			Print

- **Category:** MTD IT
- **Folder:** MTD IT
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000276005-mtd-it-client-journeys](https://capium.freshdesk.com/support/solutions/articles/9000276005-mtd-it-client-journeys)
- **Article ID:** 9000276005

## Content

Solution home 
		MTD IT
		MTD IT

### MTD IT - Client Journeys

			Print

	Modified on: Fri, 24 Apr, 2026 at  9:50 AM

		In this guide we will cover the full client journey for Making Tax Digital for Income Tax (MTD IT) — from how clients need to be set up in the system, through the available software routes for each income type, to the exact licences required. 

Scenario

Route Summary

Licensing

Non-VAT sole trader + Landlord
(both bridging)

Both income sources use bridging into MTD IT module

1 × MTD IT Licence (covers both sources)

Non-VAT sole trader (Bookkeeping) + Landlord (Bridging)

Sole trader: Bookkeeping module → MTD IT

Landlord: Bridging → MTD IT

1 × Bookkeeping Licence

1 × MTD IT Licence

Non-VAT sole trader who requires accounts prep (Bookkeeping) + Landlord (365)

Sole trader: Bookkeeping module → MTD IT

Landlord: 365 → MTD IT

1 × Bookkeeping Licence

1 × MTD IT Licence

1 × 365 Licence

Free MTD IT Licence

Sole Traders and or Landlords via Capium 365

(Non VAT Clients only)

365 → MTD IT for all income sources

1 × 365 Licence

1 × Free MTD IT Licence

VAT Sole Trader + Landlord (365 for landlord)

Sole trader: 365 → Bookkeeping module → MTD IT

Landlord: 365 → MTD IT

1 × Bookkeeping Licence

1 × 365 Licence

Free MTD IT Licence 

VAT sole trader + Landlord (Two Capium 365 Portals one for Sole Trader another for Landlord. )

Sole trader: 365 → Bookkeeping module → MTD IT

Landlord: 365 → MTD IT (separate licence)

1 × Bookkeeping Licence

1 × MTD IT Licence 

Free MTD IT Licence 

Regardless of which journey applies, every client requires the same initial setup steps before any MTD IT submission can be made.

For Clients Originally Created as Sole Traders

 - In My Admin or the Capium 365 client portal, locate the sole trader record.
 - Link the sole trader to the corresponding Individual record. If the Individual does not yet exist, create it first.
 - If the client has multiple sole trade businesses, repeat the linking step for each business.
 - Once linked, open the Individual record and enable access to the MTD IT module.
 - Proceed with the appropriate software route (Bridging, Bookkeeping, or 365) as determined by the client's VAT status and business needs.

For Clients Originally Created as Individuals

Journey 1 

Continue using the individual client without linking sole trader. This approach lets you add any number of sources you require in the Capium 365 module.

Journey 2

Follow the linking process from the Sole Traders journey to add and link any sole traders to the individual record. 

Note on Existing Clients

Clients who were set up before MTD IT was introduced may still exist as standalone sole trader records without an Individual counterpart.

These must be reviewed and linked before they can participate in MTD IT.
This is a one-time migration task per client.

For more information on this please click on this link to read our dedicated article on this subject. 

Client Journeys by Scenario

The sections below document each journey in full. Each scenario is self-contained — read only the section relevant to your client's situation.

Non-VAT Registered Sole Traders

Non-VAT registered sole traders have the widest range of options. The right route depends on how much of the client's business lifecycle is managed in Capium — from simple record keeping only, through to full accounts production and payroll.

Route A: Bridging

The sole trader maintains their income and expense records in an external spreadsheet or third-party software. The accountant imports figures into the MTD IT module using the bridging template for the Sole Trader business type.

When to use:

 - Client keeps records externally and only needs MTD IT quarterly submissions
 - No accounts production, payroll, or annual accounts are required in Capium

Licensing required:

 - 1 × MTD IT Licence

Route B: Bookkeeping Module → MTD IT Module

The sole trader's income and expenses are recorded in the Capium Bookkeeping module. This supports full accounts production, payroll, and employee management. Quarterly MTD IT figures are imported into the MTD IT module from the Bookkeeping module.

When to use:

 - Client wants sole trader accounts produced in Capium
 - Client has employees and requires payroll
 - Client is non-VAT registered but needs the full bookkeeping workflow

Licensing required:

 - 1 × Bookkeeping Licence
 - 1 × MTD IT Licence

Route C: Capium 365 → Bookkeeping Module → MTD IT Module

The accountant uses Capium 365 as the record-keeping front end, which publishes into the Bookkeeping module. From the Bookkeeping module, the figures are then imported into the MTD IT module. This route is used when the simplicity of the 365 interface is preferred but full bookkeeping records are still needed in the system.

When to use:

 - Client benefits from the 365 interface for day-to-day record keeping
 - Full bookkeeping records are still required (e.g. for accounts production)

Licensing required:

 - 1 × Bookkeeping Licence
 - 1 × MTD IT Licence
1 × Free MTD IT Licence (included with 365)

VAT Registered Sole Traders

For sole traders who are VAT registered, the Bookkeeping module is mandatory. This is because MTD VAT obligations must be fulfilled through the bookkeeping record — HMRC requires VAT returns to originate from the bookkeeping data, and the MTD IT module then draws on those same records for quarterly income tax updates.

Important — No Exceptions

There is no route for a VAT-registered sole trader that bypasses the Bookkeeping module.

Regardless of whether Capium 365 is used for data entry, records must pass through the Bookkeeping module before they reach the MTD IT module.

Route A: Bookkeeping Module → MTD IT Module

The sole trader's transactions are entered directly into the Capium Bookkeeping module. The VAT return is submitted from the Bookkeeping module. MTD IT figures are then imported from the Bookkeeping module into the MTD IT module for quarterly submissions.

When to use:

 - Client transactions are managed entirely within the Bookkeeping module
 - No Capium 365 is in use

Licensing required:

 - 1 × Bookkeeping Licence
 - 1 × Free MTD IT Licence

Route B: Capium 365 → Bookkeeping Module → MTD IT Module

The accountant/thier client uses Capium 365 as the data entry front end. 365 publishes records into the Bookkeeping module. From the Bookkeeping module, the VAT return is completed, and MTD IT figures are imported into the MTD IT module.

When to use:

 - Client or accountant prefers the Capium 365 interface for record keeping
 - Full bookkeeping records are required in the Bookkeeping module for VAT and accounts

Licensing required:

 - 1 × Bookkeeping Licence
 - 1 × MTD IT Licence
 - 1 × Free MTD IT Licence (included with 365)

Landlords

Landlords have a straightforward set of options. Because the Bookkeeping module does not support the chart of accounts structure required for property income, it is not available to landlords. There are two supported routes:

Route A: Bridging

The landlord maintains their income and expense records in an external spreadsheet or third-party software. The accountant then imports the figures directly into the MTD IT module using the bridging template for the Landlord business type. No Capium record keeping is involved.

When to use:

 - Client already uses external software or spreadsheets for property records
 - Client wants a simple, low-overhead route into MTD IT compliance

Licensing required:

 - 1 × MTD IT Licence

Route B: Capium 365

The landlord records income and expenses within Capium 365, which is designed to handle landlord-specific categorisation including UK and overseas property. Figures are then submitted quarterly through the MTD IT module, with Capium 365 feeding directly into it.

When to use:

 - Client wants to manage property records within Capium
 - Client has multiple properties (UK and/or overseas)
 - Client wants a single platform for both record keeping and MTD IT compliance

Licensing required:

 - 1 × Capium 365 Licence
 - 1 × Free MTD IT Licence (included with 365)

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

