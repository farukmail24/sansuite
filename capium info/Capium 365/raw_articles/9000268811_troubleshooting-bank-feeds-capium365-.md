# Troubleshooting Bank Feeds (Capium365)
	 	
			
			Print

- **Category:** Capium 365
- **Folder:** Capium 365 FAQs
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000268811-troubleshooting-bank-feeds-capium365-](https://capium.freshdesk.com/support/solutions/articles/9000268811-troubleshooting-bank-feeds-capium365-)
- **Article ID:** 9000268811

## Content

Solution home 
		Capium 365
		Capium 365 FAQs

### Troubleshooting Bank Feeds (Capium365)

			Print

	Modified on: Wed, 15 Oct, 2025 at  5:19 PM

		Please Note
Before attempting to connect a bank feed in Capium, please ensure your bank supports Open Banking. Only current, personal, or business accounts with online or mobile payment capabilities are eligible—savings, investment, restricted, or offline-only accounts are not supported. You can view the full list of supported UK banks and building societies on TrueLayer’s Supported Banks page.

If your bank and account type are supported but you're experiencing issues connecting your bank feed in Capium, our technical team may request a session ID URL to assist with troubleshooting. This unique URL captures your login session and enables our engineers to trace and resolve the issue more efficiently.

Bank Feed Rules:

Bank feeds will be fetched starting from the client’s invite or activation date. All transactions before that date must be reconciled in Bookkeeping if the client exists there and was imported from MyAdmin.

If you need any older transactions in 365 (prior to the invite date), navigate to Settings → Import → Bank Statements → Bank Import.
Please note that Bookkeeping reconciliation status is not displayed in 365, so ensure that the same transaction is not reconciled in both systems.

For clients created directly in 365, the past 90 days of transactions will be available for reconciliation.

This article explains how to locate your session ID and which screenshots are essential when escalating a bank feed issue to our team.

Steps to troubleshooting:

Step 1: Access the Client Account and Add a Bank

Log in to your Capium 365 account and open the relevant client profile. From the top navigation grid, select the Bank option. Then, click on Add Bank to begin the connection process.

Step 2: Copy the TrueLayer Session URL

Once the TrueLayer login page appears, copy the full URL from your browser’s address bar and save it in a Notepad or Word document.️ Important: Each time you attempt to link a bank, a new and unique session ID is generated. Ensure that you share the session ID URL from the exact attempt during which the issue occurred—not from a different session.

Step 3: Search and Select Your Bank

In the TrueLayer interface, use the search bar to find your bank. Click on the correct bank from the list, then select Allow to initiate the TrueLayer connection.

You’ll be redirected to your bank’s website or app to complete the authentication. Please note that each bank may have different security and verification procedures. While we cannot detail the exact steps for every institution, once your bank's authentication is complete, all banks will follow the same process outlined in Step 4.

Step 4: Select and Add Your Bank Accounts

If you have multiple accounts with the selected bank, they will all be displayed at this stage. Choose the accounts you wish to link, then click Continue to proceed.Please Note:
If you’re linking multiple accounts, you may be required to authenticate more than once—this is standard security protocol set by your bank.

Troubleshooting Tip: If no accounts appear in Step 4, click on the menu button located on the left-hand side of the screen. Take a screenshot of this view and share it with our support team along with the session ID URL you saved in Step 2. This information will help us investigate and resolve the issue more effectively.

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

## Screenshots & Diagrams (4)

![img_1.gif](../images/9000268811_troubleshooting-bank-feeds-capium365-/img_1.gif)

![img_2.gif](../images/9000268811_troubleshooting-bank-feeds-capium365-/img_2.gif)

![img_3.gif](../images/9000268811_troubleshooting-bank-feeds-capium365-/img_3.gif)

![img_4.gif](../images/9000268811_troubleshooting-bank-feeds-capium365-/img_4.gif)

