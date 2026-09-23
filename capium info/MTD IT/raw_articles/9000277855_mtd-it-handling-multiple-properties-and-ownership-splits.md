# MTD IT: Handling Multiple Properties and Ownership Splits
	 	
			
			Print

- **Category:** MTD IT
- **Folder:** MTD IT
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000277855-mtd-it-handling-multiple-properties-and-ownership-splits](https://capium.freshdesk.com/support/solutions/articles/9000277855-mtd-it-handling-multiple-properties-and-ownership-splits)
- **Article ID:** 9000277855

## Content

Solution home 
		MTD IT
		MTD IT

### MTD IT: Handling Multiple Properties and Ownership Splits

			Print

	Modified on: Wed, 15 Jul, 2026 at 12:57 PM

		When a landlord owns more than one property, and the ownership split is different for each one, it changes how their data should be entered into Capium for MTD IT. This article explains the three ways Capium supports property splits, so you can pick the right approach for each client.

In every case, the underlying principle is the same: you always enter 100% of the gross figures for a property into the system. Capium then calculates the correct share based on the ownership percentage you have set, and only that share is sent to HMRC in the client's MTD return.

### Which option should I use?

One flat split across all properties (for example, every property is 50/50, or every property is 60/40)

Use the ownership percentage field within Bridging. This is quick to set up and works well for clean, uniform splits.

Navigation > MTD IT > Manage > Select client > Sources > Property > Edit > Ownership percentage

See MTD IT: Setting Ownership Percentages for Property Splits in Bridging for the full steps.

Multiple properties, each with a different split (for example, Property A is 60/40 with a sibling, Property B is 50/50 with a spouse, Property C is a different split again)

Use Capium 365. Each property is added as its own source, with its own ownership percentage, so the split is calculated correctly per property rather than applied as one flat percentage across the whole portfolio.

See Capium 365: Recording Multiple Properties with Different Ownership Splits for the full steps.

Complicated or unusual splits, where you do not want to purchase Capium 365

Work out each client's share manually outside Capium, then upload only that client's share using the standard Bridging upload template. In this case, do not use the ownership percentage field at all, as the figures you upload are already the client's correct share.

See Template upload for UK Property for the upload steps.

### Joint property: the HMRC easement

Where a property is jointly owned, for example by a husband and wife, HMRC's easement allows the same set of digital records to be used for both owners, because the underlying transactions are identical. In practice, this means one spreadsheet of records can be uploaded twice, once at each owner's ownership percentage, for example 60% for one partner and 40% for the other. You do not need to keep two separate sets of records for the same property.

### Digital records still apply

Whichever option you use, Capium calculating a share for you does not remove the requirement to hold full underlying digital records that support the figures submitted. HMRC can charge a penalty of up to £3,000 for a failure to keep digital records, or for breaking a digital link, for any given quarterly period. See MTD IT: Understanding Digital Records for what counts as an acceptable digital record and the full penalty position.

### Related articles

MTD IT: Understanding Digital Records
MTD IT - Bridging Solution
Template upload for UK Property
Capium 365: Sources
MTD IT: Choosing the Right Workflow
MTD IT FAQs

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

