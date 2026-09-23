# MTD IT: Adding or Removing an Income Source
	 	
			
			Print

- **Category:** MTD IT
- **Folder:** MTD IT
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000278244-mtd-it-adding-or-removing-an-income-source](https://capium.freshdesk.com/support/solutions/articles/9000278244-mtd-it-adding-or-removing-an-income-source)
- **Article ID:** 9000278244

## Content

Solution home 
		MTD IT
		MTD IT

### MTD IT: Adding or Removing an Income Source

			Print

	Modified on: Wed, 12 Aug, 2026 at 11:17 AM

A client's income sources are held against their tax return in the MTD IT module. Where a client takes on a new income stream, or stops one during the tax year, the sources selected on the tax return can be amended so that the correct quarterly updates are generated.

Adding and removing a source are handled in the same place, using the same Edit action on the tax return.

### Before you start

The client must already be set up in MTD IT with a tax return in place for the relevant tax year.
Capium can only offer sources that HMRC holds against the client's record. If a source you expect is not available in the list, sync the client's sources first. See MTD IT: Sync Sources from HMRC.
A source cannot be removed once a submission has been made to HMRC against it. See Removing a source below.

### How to add or remove an income source

Navigation > MTD IT > Manage > Clients > Search for the client > Client profile > Tax Return > Edit

Open the MTD IT module and go to the Manage screen.
Go to the Clients section and search for the client by name.
Click into the client's profile.
Go to the Tax Return section. You can either create a new tax return or edit an existing one.
Click Edit against the relevant tax return.
Use the drop-down list to amend the sources:To add a source, select any income stream from the list that is not currently selected.
To remove a source, deselect the income stream you no longer intend to submit for.

Save the tax return.

### Removing a source

A source can only be removed where no submission has yet been made to HMRC against it. Once a quarterly update or Final Declaration has been submitted for that source, it cannot be removed in Capium.

If a source has been submitted in error, or the client's obligations have changed after a submission has been made, the position needs to be resolved with HMRC directly. Contact HMRC to confirm what should happen to the obligation before making any further submissions.

### Foreign property sources

Foreign property is handled slightly differently to other sources. If you are adding a foreign property source, see:

Template Upload for Foreign Property
MTD IT: Foreign Property Workflow

### Checking the change has taken effect

Once the tax return has been saved, the change is reflected on the submissions grid.

Navigation > MTD IT > Submissions > Search for the client

Where a source has been added, the additional obligations appear against the client and the total number of submissions increases.
Where a source has been removed, the related obligations no longer appear and the total number of submissions reduces.

### Further help

If you need further support, you can use the AI assistant within Capium, or contact the Capium support team who will be happy to help.

### Related articles

MTD IT: Sync Sources from HMRC
MTD IT: How to Make Quarterly Submissions
MTD IT: Checking and Registering your Client with HMRC
Template Upload for Foreign Property

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

