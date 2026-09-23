# MTD IT - Capium 365 and Bookkeeping (Workflow 3)
	 	
			
			Print

- **Category:** MTD IT
- **Folder:** MTD IT
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000276519-mtd-it-capium-365-and-bookkeeping-workflow-3-](https://capium.freshdesk.com/support/solutions/articles/9000276519-mtd-it-capium-365-and-bookkeeping-workflow-3-)
- **Article ID:** 9000276519

## Content

Solution home 
		MTD IT
		MTD IT

### MTD IT - Capium 365 and Bookkeeping (Workflow 3)

			Print

	Modified on: Wed, 20 May, 2026 at 11:44 AM

Capium 365 and Bookkeeping workflow within the MTD IT module. It is designed for sole traders who require one or more of the following:

VAT registration
Accrual basis accounting
Sole trader accounts production
Payroll
In this workflow, transactions are reconciled within Capium 365 in the same way as a limited company. Those reconciled transactions are then published into the Bookkeeping module. From the Bookkeeping module, the records are imported directly into the MTD IT module for quarterly submission.

Important: Workflow 3 is only available for sole traders. It is not available for landlords (UK or overseas). If the client has landlord income, refer to Workflow 1 (bridging) or Workflow 2 (Capium 365) for that portion of their income.

This workflow requires both a sole trader and an individual to be created in the system and linked together.

### Step 1: Create the Sole Trader and the Individual

Both a sole trader client and an individual client must exist in the system.

The sole trader represents the business entity.
The individual represents the person who owns one or more businesses and will be filing under MTD IT.
If either client record does not yet exist, create it before proceeding:

Navigation > MTD IT > Manage > Add New Client (to add as an individual)

Navigation > Capium 365 Client Portal > Add New Client (to add either client type)

### Step 2: Link the Sole Trader to the Individual via the Capium 365 Client Portal

Capium recommends completing the linking process through the Capium 365 Client Portal.

Navigation > Capium 365 Client Portal
Search for the sole trader client by name.
In the search results, identify the correct record. The briefcase icon next to a name indicates a sole trader. The person icon indicates an individual.
Open the sole trader record.
Locate the Client field within the sole trader profile. This field will be empty if no individual has been linked yet.
Search for the individual's name in the client field.
If the individual exists, select them from the search results.
If the individual does not yet exist, type their name and click Add Individual. This will create the individual and complete the link simultaneously.
Save the changes.
Note: Once the sole trader is linked to the individual, only the individual can be given access to the MTD IT module. The individual represents the tax filing entity, and the sole trader is treated as a source of income for that individual.

### Step 3: Grant MTD IT Module Access to the Individual

Navigation > Capium 365 Client Portal
Search for and open the individual client record.
Click on Modules within the client section.
Enable access to the MTD IT module.
Save the changes.

### Step 4: Activate Capium 365 on the Sole Trader

For Workflow 3, the Capium 365 licence is activated on the sole trader, not on the individual.

Navigation > Capium 365 Client Portal
Search for and open the sole trader client record.
Click on Modules within the client section.
Enable access to Capium 365.
Save the changes.
Note: If the sole trader does not need to use Capium 365, this step can be skipped. In that case, refer to Workflow 4, which uses the Bookkeeping module directly without Capium 365.

### Step 5: Authorise the Individual in the MTD IT Module

Navigation > MTD IT > Manage
Locate the individual client in the list.
Open the client record and click Start Authorisation.
You will be redirected to the HMRC website.
Complete the authorisation process on the HMRC website.
Once complete, return to Capium. The client will now display an authorised status.

### Step 6: Create a Tax Return for the Individual

Navigation > MTD IT > Manage
Open the individual client record.
Click Add Tax Return.
The system will automatically select all available sources of income.
Select the Consolidated Reporting option if applicable (threshold of 90,000 pounds per income source applies separately).
Confirm and save. The system will generate the full quarterly workflow automatically.

### Step 7: Link the Sole Trader to the Individual Within Business Details

This step is required to connect the Bookkeeping module records to the MTD IT module.

Navigation > MTD IT > Manage > Select Client > Business Details
Locate the sole trader business linked to this individual.
Confirm the link between the sole trader and the individual is saved correctly.
Click Save.
Note: If this step is not completed, transactions from the Bookkeeping module will not appear in the MTD IT module.

### Step 8: Reconcile Transactions in Capium 365

Once the sole trader is activated on Capium 365, reconciliation takes place within the Capium 365 section of the sole trader's profile. The reconciliation process mirrors the workflow for a limited company.

Navigation > Capium 365 Client Portal > Select Sole Trader > Bank
Review the list of bank transactions.
Categorise transactions using bank rules or manual categorisation.
Allocate each transaction to the correct nominal account.
Reconcile the transactions.
To create a bank rule:

Navigate to Bank Rules within the sole trader's Capium 365 profile.
Select Money In or Money Out as appropriate.
Define the rule conditions (for example, if the reference contains a specific term).
Set the nominal account allocation.
Save the rule.
Run the bank rule to apply it to existing transactions.
Once reconciled, transactions will be published automatically into the Bookkeeping module.

### 
Step 9: Review and Complete Records in the Bookkeeping Module

Once transactions have been published from Capium 365 into the Bookkeeping module, they can be reviewed and any additional entries (such as sales invoices, purchase invoices, or quick entries) can be recorded directly in the Bookkeeping module.

Navigation > Bookkeeping > Select Sole Trader Client
Review the transactions that have been published from Capium 365.
Add any additional transactions as required.
From the Bookkeeping module, the following additional processes can also be completed where applicable:

VAT submissions
CIS submissions
Payroll
Sole trader accounts production via trial balance

### 
Step 10: Import Transactions from Bookkeeping into the MTD IT Module

Navigation > MTD IT > Manage > Select Client > Digital Records
Click Import Data from Bookkeeping.
The system will pull through the relevant income and expense records from the Bookkeeping module for the current period.
Review the imported digital records to confirm accuracy.

### Step 11: Review and Submit to HMRC

Once the digital records are confirmed for a given quarter:

Navigation > MTD IT > Manage > Select Client > Submission Grid
Open the relevant quarterly period.
Navigate to the Quarterly Summary and review the figures.
Navigate to the Cumulative Summary page.
Click Submit to HMRC.
Repeat this process for Q2, Q3, and Q4.

### Step 12: Year-End Adjustments, Allowances, and Final Submission

The year-end process is the same across all four MTD IT workflows. Once all four quarterly submissions have been completed:

Navigate to the adjustments and allowances section for each income source.
Complete the relevant adjustments per source of income.
For sole trader income, a trial balance import is available from the Bookkeeping module. For UK property and foreign property, only amended values can be entered.
Complete the other income section, including dividends, employment income, other expenses, losses, and deductions.
Complete the year-end approval (this is mandatory).
Submit the final declaration to HMRC.
Note: Quarterly approval is an optional feature. If a client requires quarterly approval, this can be enabled when creating or editing the client record. Navigate to Navigation > MTD IT > Manage > Edit Client > Enable Approval.

### Changing Workflow Mid-Year

If a client wishes to change workflow part way through the year, the recommended approach is to complete the current quarter fully before switching. The previous quarter must be finalised in the existing system before starting fresh in a new workflow. Changing workflows mid-period is not recommended.

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

## Screenshots & Diagrams (10)

![img_1.gif](../images/9000276519_mtd-it-capium-365-and-bookkeeping-workflow-3-/img_1.gif)

![img_2.gif](../images/9000276519_mtd-it-capium-365-and-bookkeeping-workflow-3-/img_2.gif)

![img_3.gif](../images/9000276519_mtd-it-capium-365-and-bookkeeping-workflow-3-/img_3.gif)

![img_4.gif](../images/9000276519_mtd-it-capium-365-and-bookkeeping-workflow-3-/img_4.gif)

![img_5.gif](../images/9000276519_mtd-it-capium-365-and-bookkeeping-workflow-3-/img_5.gif)

![img_6.gif](../images/9000276519_mtd-it-capium-365-and-bookkeeping-workflow-3-/img_6.gif)

![img_7.gif](../images/9000276519_mtd-it-capium-365-and-bookkeeping-workflow-3-/img_7.gif)

![img_8.gif](../images/9000276519_mtd-it-capium-365-and-bookkeeping-workflow-3-/img_8.gif)

![img_9.gif](../images/9000276519_mtd-it-capium-365-and-bookkeeping-workflow-3-/img_9.gif)

![img_10.gif](../images/9000276519_mtd-it-capium-365-and-bookkeeping-workflow-3-/img_10.gif)

