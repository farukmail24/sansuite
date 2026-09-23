# MTD IT - Licence Usage When Linking a Sole Trader to an Individual
	 	
			
			Print

- **Category:** MTD IT
- **Folder:** MTD IT
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000277276-mtd-it-licence-usage-when-linking-a-sole-trader-to-an-individual](https://capium.freshdesk.com/support/solutions/articles/9000277276-mtd-it-licence-usage-when-linking-a-sole-trader-to-an-individual)
- **Article ID:** 9000277276

## Content

Solution home 
		MTD IT
		MTD IT

### MTD IT - Licence Usage When Linking a Sole Trader to an Individual

			Print

	Modified on: Fri, 19 Jun, 2026 at 11:04 AM

		When a sole trader client is linked to an individual client for Making Tax Digital for Income Tax (MTD IT), Capium consumes one client licence, not two.

This article explains how licence usage works across the two linked records, why both entities remain separate and visible in My Admin, and what happens to licence usage if the link has not yet been established.

### Why the Sole Trader and Individual Remain Separate

HMRC requires digital record keeping to be maintained at entity level. This is reflected in how Capium structures linked clients under MTD IT.

Many sole trader clients already had digital records built up in Capium before MTD IT was introduced. To preserve this, the sole trader entity continues to be used for record keeping, including modules such as Bookkeeping, Payroll, and Accounts Production.

However, MTD IT also requires support for other sources of income beyond the sole trader business, such as property or other business sources, all reported together for one taxpayer. This is managed at the individual level. The individual is therefore the entity responsible for MTD IT submissions, including quarterly updates and the Final Declaration, across all linked sources of income. For more detail on how sources of income are structured under MTD IT, please refer to Understanding MTD Terminology for Income Tax (MTD IT).

As a result, both records remain active and visible in My Admin, regardless of which module you are viewing, including Bookkeeping. This is expected behaviour and does not on its own indicate that two licences are being used.

### Licence Usage Before and After Linking

Licence usage only consolidates to one licence once the sole trader and individual have been linked together. If the link has not yet been established, the sole trader and individual are treated as separate client records, and two licences will be consumed instead of one.

You can confirm whether a link has been established within Capium 365.

Navigation > Capium 365 > Client Portal > Manage > Clients

Locate the sole trader client within the client grid.
Look for a small link icon displayed next to the sole trader's licence indicator.
The presence of this icon confirms that the sole trader has been successfully linked to an individual.

Please note: If the link icon is not present, the sole trader and individual are not yet linked, and the system will continue to count them as two separate licences until the link is completed.
Once linked, the individual client is the only record that draws on the MTD IT licence. The sole trader client no longer uses a separate MTD IT licence, as it is not directly accessible within the MTD IT module once linked. The linked pair therefore uses one licence in total for that customer, not one licence per entity.

### Linking a Sole Trader to an Individual

For step-by-step guidance on linking a single sole trader to an individual, please refer to:

MTD IT - Linking Individuals and Sole Traders

If you have multiple sole traders that need linking, please refer to:

MTD IT - Linking the Sole Traders and Individuals in Bulk

Related Articles
MTD IT - Linking Individuals and Sole Traders

MTD IT - Linking the Sole Traders and Individuals in Bulk

Understanding MTD Terminology for Income Tax (MTD IT)

MTD IT - Adding New Clients

MTD IT - Client Authorisation Workflow

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

