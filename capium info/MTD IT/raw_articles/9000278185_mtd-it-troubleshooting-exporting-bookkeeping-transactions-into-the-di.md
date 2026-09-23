# MTD IT: Troubleshooting Exporting Bookkeeping Transactions into the Digital Records Templat
	 	
			
			Print

- **Category:** MTD IT
- **Folder:** MTD IT
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000278185-mtd-it-troubleshooting-exporting-bookkeeping-transactions-into-the-digital-records-templat](https://capium.freshdesk.com/support/solutions/articles/9000278185-mtd-it-troubleshooting-exporting-bookkeeping-transactions-into-the-digital-records-templat)
- **Article ID:** 9000278185

## Content

Solution home 
		MTD IT
		MTD IT

### MTD IT: Troubleshooting Exporting Bookkeeping Transactions into the Digital Records Templat

			Print

	Modified on: Wed, 5 Aug, 2026 at  2:39 PM

This method allows you to move transactions out of the Bookkeeping module and into the MTD IT digital records template manually, without rekeying the data.

It is intended for two situations:

SituationWhy this method is neededA sole trader client where the Bookkeeping to MTD IT sync has not brought transactions acrossThe manual export gives you a reliable route to populate the quarter while the sync issue is investigatedA landlord client whose property records are kept in BookkeepingThere is no direct link between the Bookkeeping module and UK property or foreign property sources in MTD IT. Where a practice has chosen to keep property records in Bookkeeping, the data must be moved across manually
This is not the standard route for sole trader clients. Where the Bookkeeping to MTD IT link is working as expected, follow the MTD IT: Bookkeeping Workflow (Workflow 4) instead. If you are unsure which workflow applies to a client, see MTD IT: Choosing the Right Workflow.

If the sync is not returning transactions for a sole trader client, please also raise a support ticket so the underlying issue can be resolved.

### 
Before you start

Please confirm the following before beginning:

The client has been authorised with HMRC.
A tax return has been created for the client and the relevant income sources are showing.
You know which quarter you are populating and the exact quarter start and end dates.
The transactions for that quarter have been posted and reconciled in Bookkeeping.
For background on what HMRC expects to be held at transaction level, see MTD IT: Understanding Digital Records.

### 
Step 1: Export the Nominal Ledger from Bookkeeping

Navigation > Bookkeeping > Select a client > Reports > Additional > Nominal Ledger

Set the date range to match the quarter you are reporting. For a standard 6 April to 5 April tax year using calendar quarter dates, Q1 would run from 1 April to 30 June.
Run the report. The Nominal Ledger returns a breakdown of transactions grouped by nominal code, covering sales, purchases and other expenses.
Click Export and save the file to your machine.
The Nominal Ledger is used rather than a summary report because it groups transactions by category. This allows you to map transactions category by category into the digital records template, rather than reviewing and recategorising each line individually.

### 
Step 2: Download the digital records template

Navigation > MTD IT > Submissions > Select the client > Select the quarter > View and Submit > Digital records > Template

Select the income source you are populating, for example self-employment, UK property or foreign property.
Select the relevant quarter.
Click View and Submit.
Click Template to download the digital records template for that source.
Each income source has its own template, but the population and upload process is the same for all of them. Source specific guidance is available in the following articles:

Template upload for Self Employment
Template upload for UK Property
Template upload for Foreign Property

### 
Step 3: Map the Nominal Ledger data into the template

Open both files side by side. The exported Nominal Ledger contains every field the template requires. Copy the data across column by column rather than row by row.

Digital records template fieldSource in the Nominal Ledger exportDateTransaction dateReferenceInvoice or transaction reference numberParty nameCustomer or supplier nameTypeIncome or expense, depending on the nominal code being mappedCategoryThe MTD IT category the nominal code maps to, for example Turnover for salesAmountTransaction valueDisallowable amountEnter the disallowable element where one applies. Leave as nil where none appliesWorking method:

Copy the dates, references, party names and amounts across for the block of transactions you are mapping.
Set the type for that block, for example income for all sales transactions.
Set the category for that block, for example Turnover.
Move on to the next nominal code group, for example cost of sales, and repeat.
Because the Nominal Ledger is already grouped by nominal code, each group can be categorised in a single action. If there are five transactions sitting under turnover, all five can be categorised together before you move on to the next group.

For guidance on which nominal codes map to which MTD IT categories, see MTD IT: Bookkeeping Chart of Account Codes for MTD IT Submissions.

Save the completed template once all transactions for the quarter have been mapped.

### Step 4: Upload the completed sheet

Navigation > MTD IT > Submissions > Select the client > Select the quarter > View and Submit > Digital records > Upload Sheet

Click Upload Sheet.
Browse to the saved file, or drag and drop it into the upload area.
Select the relevant client and income source.
Click Next at the bottom of the page.
The system will then display three lists:

Success: records that will be imported.
Duplicates: records that match transactions already held against that source.
Errors: records that cannot be imported, with the reason shown against each.
Review each list before continuing. Once the import completes, click Done.

### Handling duplicates

The system checks incoming records against the transactions already held for that income source and flags anything it identifies as a duplicate.

To import only the new records and leave the flagged entries out, click Ignore and Continue.
If a flagged record is a genuine separate transaction rather than a duplicate, amend the reference number on that line in the template and upload the file again. The record will then import.
Duplicates are commonly seen where a quarter has been partially populated already, or where the same file has been uploaded more than once.

### Points to note

Only what you can see will be submitted. Any transaction not visible on the digital records screen will not be included in the submission. Check the figures against the cumulative summary before submitting.
Transactions carry forward. The system retains transactions uploaded in earlier quarters. When populating Q2, only the new Q2 transactions need to be added.
Submitted quarters are locked. Once a quarter has been submitted to HMRC, its transactions cannot be edited. Corrections can be included in the following quarter's submission, or a support ticket can be raised if an immediate correction is required.
Foreign property must be reported in GBP. HMRC will only accept sterling figures.
Consolidated reporting. Where a source has been set to consolidated reporting, the submitted output is a single total rather than category level detail. See MTD IT: Consolidated vs Detailed Submission.
Record retention. Keep the exported Nominal Ledger and the completed template alongside the client's other records. The minimum retention period is generally at least five years, but this can change. Please refer to your accounting body, such as ICAEW or ACCA, or check the latest HMRC guidance directly.

### Related articles

MTD IT: Bridging Workflow (MTD IT Workflow 1)
MTD IT: Bookkeeping Workflow (Workflow 4)
MTD IT: Bridging Solution
MTD IT: How to Make Quarterly Submissions
MTD IT: Understanding Digital Records
MTD IT for Landlords: Getting Started and Making Submissions
If you have any further questions about moving data across into MTD IT, please contact the Capium support team.

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

