# MTD IT: Foreign Property Workflow
	 	
			
			Print

- **Category:** MTD IT
- **Folder:** MTD IT
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000278201-mtd-it-foreign-property-workflow](https://capium.freshdesk.com/support/solutions/articles/9000278201-mtd-it-foreign-property-workflow)
- **Article ID:** 9000278201

## Content

Solution home 
		MTD IT
		MTD IT

### MTD IT: Foreign Property Workflow

			Print

	Modified on: Thu, 6 Aug, 2026 at  3:14 PM

This guide explains how to set up foreign property sources in Capium and make quarterly MTD IT submissions for them.

Foreign property is handled differently to self-employment and UK property. This article covers the full process, from adding each property as a source through to submitting the quarterly update to HMRC.

### 

### Before you start

Make sure the following are in place for the client:

RequirementWhere to checkClient added to the MTD IT moduleNavigation > MTD IT > Submissions > ManageClient authorised with HMRCSee MTD IT: Client Authorisation WorkflowClient registered for MTD IT with HMRCSee MTD IT: Checking and Registering your client with HMRCTax year created for the clientNavigation > MTD IT > Submissions > Manage > Select the client > Tax Return
### 

### How foreign property sources differ

Self-employment and UK property sources are pulled through from HMRC and appear in the sources drop-down automatically. Foreign property sources do not. You create them inside Capium, and Capium then pushes them to HMRC.

You also need to add each foreign property separately. Where UK property is treated as a single combined business, HMRC requires a unique property record for every individual foreign property, even where the client only holds one.

This is why you will not see foreign property listed by default, and why the setup involves a few extra steps.

Further reading on the HMRC requirement:

HMRC: Making Tax Digital for Income Tax service guide, making updates during the tax year
ICAEW TAXguide 04/25: Making Tax Digital for Income Tax questions and answers
LITRG: Making Tax Digital for landlords

### 

### Step 1: Save the tax return with the HMRC sources

Navigation > MTD IT > Submissions > Manage > Search for the client > Select the client > Tax Return

Open the sources drop-down. The self-employment and UK property sources held by HMRC will be listed here.
Select the sources that apply to the client.
Click Save.
You need to save the tax return before you can add foreign property sources. Foreign property will not appear in this drop-down at this stage.

### 

### Step 2: Add each foreign property as a source

Navigation > MTD IT > Submissions > Manage > Select the client > Sources > Add Source

Click Add Source.
Complete the property details on the form.
Give the property a name that clearly identifies it. Each property needs its own distinct name, for example Greece Property 1 and Greece Property 2.
Select the country the property is located in.
Enter the ownership percentage (see Step 3 below).
Click Save.
The property is now created in the software. It will not appear against the client's return until you complete Step 4.

Note: Add your foreign properties individually. Do not group multiple properties into a single source, even where they are in the same country. HMRC assigns a unique property reference to each one.

### 

### Step 3: Ownership percentage

The ownership percentage is set per property, and must be completed at the point you add the property.

How you use it depends on how you intend to record the figures:

If you areSet the ownership percentage toAnd uploadLetting Capium apply the ownership splitThe client's actual share, for example 50%The full 100% income and expense valuesApplying the split yourself before upload100%The client's share onlyChoose one method per property and apply it consistently. Entering an ownership percentage and also splitting the figures manually will understate the client's position.

### 

### Step 4: Select the property against the client

Adding a property in Step 2 creates it, but does not attach it to the client's return. To complete that:

Navigation > MTD IT > Submissions > Manage > Select the client > Client Info > Edit

Click Edit.
The foreign properties you have added will now be listed.
Select each foreign property you want included.
Click Save.
The sources section will now show your foreign properties alongside the client's other income sources.

### 

### Repeat per property

Steps 2 and 4 must be completed for every foreign property the client holds.

The full loop for each property is:

Sources > Add Source > complete the details > Save
Client Info > Edit > select the new property > Save
Recommendation: complete the loop fully for one property before starting the next. Adding several properties in Sources and then returning to Client Info once makes it easy to miss a property, and a property that has not been selected will not be included in the submission.

Once all properties have been added and selected, save the return.

### 

### Step 5: Upload the digital records

Navigation > MTD IT > Submissions > Select the property source > View & Submit > Digital Records > Template

Each foreign property appears in the Submissions grid as its own line. Select the property you want to work on and click View & Submit.

Download the CSV template.
Populate the relevant fields.
Save the file, then upload it using browse or drag and drop.
Click Next.
The system will return a success list, a duplicates list and an error list so you can check what has imported.

For the full template process, see Template upload for Foreign Property. For background on what digital records are and how they work in MTD IT, see MTD IT: Understanding Digital Records.

Important: Digital records cannot be edited directly within the MTD IT module. Any corrections must be made at source, which means in the spreadsheet or in Capium 365, depending on where the client's records are kept. Once corrected, re-upload the records into MTD IT.

### 

### Step 6: Review and submit

Review the cumulative summary for the property. This is produced per property, so check each one in turn.
Send the figures to the client for approval if your practice uses the approval step.
Submit to HMRC and confirm when prompted.
Repeat for each foreign property and for each of the four quarterly updates in the tax year.

For the full submission process, including calendar selection, retrieving obligations and the three-line versus detailed methods, see MTD IT: How to make Quarterly Submissions and MTD IT: Cumulative Summary.

### 

### Related articles

Template upload for Foreign Property
MTD IT: How to make Quarterly Submissions
MTD IT: Cumulative Summary
MTD IT: Understanding Digital Records
MTD IT: Sync Sources from HMRC
MTD IT for Landlords: Getting Started and Making Submissions
MTD IT: Consolidated vs Detailed Submission
If you have any questions about this process, please contact the Capium support team or use the AI Assist function within the software.

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

