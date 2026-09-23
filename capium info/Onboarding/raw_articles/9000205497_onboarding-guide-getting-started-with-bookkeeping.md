# Onboarding Guide: Getting Started with Bookkeeping
	 	
			
			Print

- **Category:** Onboarding
- **Folder:** Onboarding Guides: Getting Started with Capium
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000205497-onboarding-guide-getting-started-with-bookkeeping](https://capium.freshdesk.com/support/solutions/articles/9000205497-onboarding-guide-getting-started-with-bookkeeping)
- **Article ID:** 9000205497

## Content

Solution home 
		Onboarding
		Onboarding Guides: Getting Started with Capium

### Onboarding Guide: Getting Started with Bookkeeping

			Print

	Modified on: Fri, 15 Sep, 2023 at 11:01 AM

		In this Onboarding Guide for Bookkeeping, you will learn the best practice and the necessary first steps for setup to ensure successful deployment.

Chart of Accounts set up:

Navigation: Bookkeeping  > General Settings > Chart of Accounts

Here, you can find the universal Chart of Accounts as seen below. You can create additional codes here and then apply them universally for all company types. 

Note: You also have the option to amend the Chart of Accounts on a client specific level too. You can do this by clicking on a client and navigating to the general settings there where you see the Chart of Accounts specific to the client in question.

Add Accounting Period:

Navigation: Bookkeeping  > Settings > Accounting Periods

You can add an current accounting period here by clicking on the ‘+ accounting period’ and the same process for adding a prior accounting period.

If you click on ‘Auto Period Generation’, then the system will automatically create the next accounting period for you once the current period is closed.

Importing Customers & Suppliers

Navigation: Bookkeeping  > Contacts > Customers/Suppliers

There are 2 options to import the customers and suppliers onto the system. Use the ‘Add Supplier/Customer’ for the manual addition of a customer/supplier or click on ‘Import’ to download our import CSV file. You can then populate the data on the file and upload.

Configuring Opening balances

Navigation: Bookkeeping > Settings > General Settings > Opening Balances

To input your opening balances, navigate to Settings > General Settings > Opening balances. 

Here, you can now manually enter your opening balances on the system or click on the ‘import’ green button. This will allow you to download the opening balance import CSV file (Image below) and upload once finalised.

Once the opening balances are imported, the final step is now to explain the Trade creditors & debtors. By this, it means allocating the different opening balances against the customers/suppliers. Just click ‘Explain’ and then you have the option to allocate these balances.

Adding Bank accounts & Importing bank transactions:

Navigation: Bookkeeping > Bank > Dashboard

To add a bank account, navigate to the Bank>Dashboard and select ‘+ Bank Account’.

You can populate the bank details here, and a unique nominal code will be given for the created bank account. Once created, the bank will automatically appear on the bank dashboard.

To get bank transactions on the system, there are 3 methods to select between:

Bank feeds: We have an API with a true layer to connect your clients account onto Capium so the bank transactions automatically refresh daily. These cost £1.50 per account plus VAT.

Manual Import: Once inside the bank account, you can click ‘manual import’ at the top which will allow you to directly input the bank transactions onto the system.

Bank Import: Once inside the bank account, you can download our csv bank import file (which is a simple file which will enable you to populate the bank transactions onto the sheet and then upload them in bulk on the system.)

How to process bank transactions:

Navigation: Bookkeeping > Bank > Dashboard > Select Bank Account

Option 1:

Manually processing a transaction:

Once the transactions have been entered, you'll see them on the bank dashboard. The transactions that need to be reconciled will show with a question mark. 

To explain the transaction, click on 'Select Action'. 

Option 2:

Using cash coding feature:

You can also explain the transactions using cash coding. 

Select the transactions that need to be reconciled using the search function and click on 'Cash Coding'

Select the transactions and enter the nominal ledger it needs to be processed to. 

For more information on navigating through our bank section, please refer to the guides below:

Click here to watch a video overview of the bank section

Click here to watch how to move a cash in hand transaction to a bank account

Click here to watch how to manually reconcile bank transactions 

Click here to watch how to manually post a bank statement

Watch here how to edit / modify bank details

Capium Pay

Navigation: Bookkeeping > Capium Pay 

To create a Vendor in Capium Pay:

Select ‘Get Started’.

Populate the Vendor Details.

Select ‘Send Invite Onboarding Link’.

Once the vendor details have been entered, it would trigger the Pay Portal to open and the client will be sent an onboarding invite email.

You will then need to map the appropriate bank account from Capium that you will want to withdraw funds to by going to settings and map bank account, this step is important so that you do not run into reconciliation issues at year end.

The end user will receive the onboarding invite to their email once the vendor information has been created where they will click accept to proceed where they will be redirected to the onboarding page where they will need to input the required information.

You will have the option to send the invoice out with the payment link, the end user will receive an email with the invoice attached where they can view it and proceed to make the payment and pay either through their card or using a bank transfer.

In the Pay Portal, the user is able to see a list of invoices raised, to see the specific status of an invoice a user is required to click on the arrow option and the client is able to keep a track of the invoice.

Sales:

Navigation: Bookkeeping > Sales > Invoices

To add sales invoices on the system, you can add them manually by selecting ‘New invoice’ and then manually entering in the description, quantity, account code, VAT). You can also add an attachment of the invoice for backing if needed under the attachments, select ‘choose file’.

If you have a large quantity of invoices to input on the system, you can use our ‘import’ function which utilises a CSV import sheet. You can click ‘download file’ and populate the file with the data and then reupload.

You can see the available fields which will be on the csv template in the below image, and also it shows the mandatory fields which will need to be filled in.

Once uploaded, the Sales invoices will appear under the Sales > Invoices main section.

Recurring Invoices:

Navigation: Bookkeeping > Sales > Recurring Invoices

You can also create recurring invoices on the system. This function follows the same process as a normal sales invoice, but you have the option to select the frequency of how often you want the invoice to be automatically raised, either in weeks or months. 

You can also select when the invoices will start to be raised automatically and end, if you want there to be an end date.

Note: Recurring invoices will also be automatically emailed out if you navigate to the customer section and tick ‘Recurring email’.

Quotations:

Navigation: Bookkeeping > Sales > Quotations

You have the option to create a quote on the system, which can be used in the scenario if an established price has not yet been confirmed. 

In the scenario above, a quote can be created, which follows most of the same data as needed for a sales invoice. Then when ready, you can quickly convert this quote into an invoice by navigating to quotes, and under the action dropdown click ‘Create Invoice’.

Purchases:

Navigation: Bookkeeping > Purchases > New Purchase or import

To input purchase invoices on the system, the same functionality as sales is used. So, the option to raise a purchase invoice by clicking ‘New Purchase’. Then the information below can be inputted such as amount, account codes, VAT and attachments if needed.

Under purchase type, you can also select ‘Purchase invoice, Credit Note, CIS, or Inventory’.

Also, similar to importing sales invoices in bulk, we have the same functionality for Purchases. Simply, click on the ‘Download template file’ and you can input the data on here and reupload when ready.

The content of what's included in the file can be seen in the below image, you can also see which fields will be mandatory to include when bulk uploading the purchases and which will not be necessary.

Using Docscan (Receipt scanning)

Navigation: Bookkeeping > Purchases > Docscan

We have our own receipt scanning software called Docscan, which is a mobile app available on both android and IOS. 

You can provide access to your clients to use this app to scan their own receipts onto the system, once the receipts are scanned they will appear in the Docscan area, as seen in the image below.

Then you can go into the Docscan area, and under the action dropdown click ‘record’. This will enable you to allocate the receipt to the correct account code and add an additional description. The receipt will be automatically attached for you.

Note: You will need to purchase licences to have this Docscan feature, please get in touch with your onboarding manager who can provide the pricing for you.

Quick Entry:

Navigation: Bookkeeping > Quick Entry

We have the Quick Entry tool available in Bookkeeping, which allows you to input receipts and payments in bulk. You can add as many rows as you need to and enter in the appropriate data such as customer/supplier, account code, description, invoice date, VAT rate and net amount (See image below).

The Quick entry tool can also be used to match off receipts and payments in one go, you can do this by entering in the receipt information and then payment date and account at the end.

We also have a Quick entry import file csv which can be downloaded and populated. This template will be extremely useful in bringing in bulk receipts and payments in a large quantity. It can be particularly helpful when first bringing data in when starting to use Capium’s Bookkeeping.

The template can be downloaded in the Quick entry section by clicking ‘import’ which will bring you to the image below).

Fixed Assets:

Navigation: Bookkeeping > Fixed Assets

We have our fixed assets schedule in Bookkeeping where your assets will flow through and you can add assets directly from the register too by selecting ‘+Asset’ which will take you through to the purchase section to add the assets through purchase invoices.

By clicking the edit/explain next to the asset you can choose if it's an asset you want to depreciate by selecting ‘depreciable asset’. You can here enter the P&L Account type, method of depreciation reducing balance or straight line, rate of depreciation & depreciation start date.

Note: If you select ‘Auto Depreciation’, the asset will be automatically depreciated based on the method and data inputted. A journal will be created at the end of the accounting period. However, you can instead click ‘Depreciation’ on the fixed asset dashboard to choose to manually enter the depreciation instead.

The disposed section will show any sold assets and the total gain/loss on the assets so you can keep track.

MTD & VAT:

Navigation: Bookkeeping > MTD

Capium supports the following VAT schemes: Accrual based, Non-VAT registered, Cash based, flat rate accrual based & flat rate cash based. You can select the relevant scheme for the client in the MTD VAT settings.

Also, please ensure the Reg date & number are inputted currently.

Under ‘View VAT details’, you can first authorise Capium to access HMRCs data for the client. Once this is done you can see the VAT obligations for the client under the ‘obligations’ tab.

When ready to start preparing the vat return the following steps need to be actioned:

Set up VAT Period

The system will automatically pick up the sales and purchase VAT transactions if they’ve been entered in the sales/purchases section.

Select the transactions and click Next.

To add VAT transactions that are outside of the VAT period, click on 'Include'. 

Capium will generate the 9 box VAT summary for you to review.

When submitting to HMRC, you'll go through Capium's two step submission process. 

'Submit to Capium' - saving the VAT return on Capium allowing you to come back to it at a later date

'Submit to HMRC' - making the submission to HMRC

Click here to watch the process of submitting MTD VAT's via 'Submit VAT' and 'Bridging VAT' 

Note: If you are not using the rest of the Bookkeeping module for a client, but simply want to submit their VAT- you can use the ‘Bridging VAT’ option. 

Once you have set up the VAT period you can download our template CSV file to populate the transactions on and then reupload before reviewing the return and submitting.

Please refer to the article below for more information on how to use the Bridging VAT:

https://capium.freshdesk.com/support/solutions/articles/9000165402-mtd-making-tax-digital-bridging

CIS:

Navigation: Bookkeeping > CIS > Subcontractors 

You can use Capium’s CIS section to prepare and submit CIS300 returns to HMRC.

Please ensure in the contractor settings, the business information and HMRC credential information has been entered and saved.

You need to add the subcontractors onto the system by clicking ‘+ subcontractor’ and populate the fields. You can also verify the subcontractor with HMRC directly on the software by clicking ‘verify’ when adding in the subcontractor information.

Once the subcontractors are added to the system and verified, you can start preparing the CIS300 return by navigating to CIS300 & enter in the return period and declaration details as seen in the screenshot below.

Next, the subcontractor details can be inputted on the system before finally submitting the CIS300 to HMRC.

Note: Please see the article below for more information on how to enter CIS deductions on the system and generate CIS reports.

https://capium.freshdesk.com/support/solutions/articles/9000165313-where-in-the-bookkeeping-module-do-we-enter-the-cis-deductions-

https://capium.freshdesk.com/support/solutions/articles/9000165315-how-to-generate-a-cis-report-

Related Articles:

How to add fixed assets  

How to use quick entry

How to add a journal entry

How to use bulk edit

How to edit the chart of accounts 

How to set up bank feeds

How to manage opening and closing stock

Congratulations! You've completed the essential steps to set up your Bookkeeping module. If you encounter any issues or require further assistance, don't hesitate to reach out to your Onboarding Manager.

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

## Screenshots & Diagrams (34)

![img_1.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_1.png)

![img_2.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_2.png)

![img_3.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_3.png)

![img_4.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_4.png)

![img_5.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_5.png)

![img_6.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_6.png)

![img_7.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_7.png)

![img_8.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_8.png)

![img_9.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_9.png)

![img_10.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_10.png)

![img_11.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_11.png)

![img_12.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_12.png)

![img_13.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_13.png)

![img_14.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_14.png)

![img_15.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_15.png)

![img_16.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_16.png)

![img_17.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_17.png)

![img_18.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_18.png)

![img_19.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_19.png)

![img_20.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_20.png)

![img_21.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_21.png)

![img_22.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_22.png)

![img_23.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_23.png)

![img_24.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_24.png)

![img_25.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_25.png)

![img_26.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_26.png)

![img_27.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_27.png)

![img_28.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_28.png)

![img_29.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_29.png)

![img_30.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_30.png)

![img_31.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_31.png)

![img_32.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_32.png)

![img_33.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_33.png)

![img_34.png](../images/9000205497_onboarding-guide-getting-started-with-bookkeeping/img_34.png)

