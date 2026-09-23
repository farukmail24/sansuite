# MTD IT: Setting Ownership Percentages for Property Splits in Bridging
	 	
			
			Print

- **Category:** MTD IT
- **Folder:** MTD IT
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000277853-mtd-it-setting-ownership-percentages-for-property-splits-in-bridging](https://capium.freshdesk.com/support/solutions/articles/9000277853-mtd-it-setting-ownership-percentages-for-property-splits-in-bridging)
- **Article ID:** 9000277853

## Content

Solution home 
		MTD IT
		MTD IT

### MTD IT: Setting Ownership Percentages for Property Splits in Bridging

			Print

	Modified on: Wed, 15 Jul, 2026 at 12:52 PM

		When a landlord uses the Bridging route for MTD IT, Capium provides an ownership percentage field that automatically calculates a client's share of a property's income and expenses. This article explains how the field works, when it's the right option, and what to do when it isn't.

### How the ownership percentage field works

You always enter the property's full, gross figures in your digital records, whether that's in the Capium Bridging template or your own spreadsheet. Capium does not need you to pre-calculate the client's share. Instead, you set an ownership percentage against the property, and the system calculates the correct share of the gross figures to include in the client's MTD return.

Navigation > MTD IT > Manage > Select client > Sources > Property > Edit > Ownership percentage

### 
When to use this option

The ownership percentage field is best suited to clean, uniform splits, for example 50%, 60% or 75%, applied consistently across all of a client's properties.

It is not designed for clients who own multiple properties with different splits on each one. For example, a client who owns one property 60/40 with a sibling, another 50/50 with a spouse, and a third with a different partner again. In that scenario, the field cannot hold a different percentage per property, so the calculation will not be accurate. For clients like this, use Capium 365 instead. See Capium 365: Recording Multiple Properties with Different Ownership Splits.

### 
Joint property: the HMRC easement

Where a property is jointly owned, for example by a husband and wife, the underlying transactions are identical for both owners. HMRC's easement allows one set of digital records to be used for both, rather than each owner keeping a separate copy.

In practice within Capium, this means:

Keep one spreadsheet of digital records for the property.
Upload it once at the first owner's ownership percentage, for example 60%.
Re-upload the same spreadsheet a second time at the second owner's ownership percentage, for example 40%.
This satisfies the record-keeping requirement for both owners without duplicating the underlying record.

### 
When the split is too complicated for the percentage field

If a client's splits are complex or inconsistent, and purchasing Capium 365 is not the preferred route, you can work the figures out manually. Calculate each client's share outside Capium, then upload only that share using the standard upload template. In this case, do not enter anything into the ownership percentage field, as the figures being uploaded already represent the client's correct share.

See Template upload for UK Property for the template upload steps.

### 
Digital records still apply

Setting an ownership percentage does not remove the requirement to hold full underlying digital records to support the figures submitted. Summary values alone are not sufficient. HMRC can charge a penalty of up to £3,000 for a failure to keep digital records, or for breaking a digital link, for any given quarterly period. See MTD IT: Understanding Digital Records for the full requirements and penalty position.

### 
Related articles

MTD IT: Handling Multiple Properties and Ownership Splits
MTD IT: Understanding Digital Records
MTD IT - Bridging Solution
Template upload for UK Property
MTD IT: Choosing the Right Workflow
Capium 365: Recording Multiple Properties with Different Ownership Splits

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

