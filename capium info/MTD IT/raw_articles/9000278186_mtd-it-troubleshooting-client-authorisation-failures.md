# MTD IT: Troubleshooting Client Authorisation Failures
	 	
			
			Print

- **Category:** MTD IT
- **Folder:** MTD IT
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000278186-mtd-it-troubleshooting-client-authorisation-failures](https://capium.freshdesk.com/support/solutions/articles/9000278186-mtd-it-troubleshooting-client-authorisation-failures)
- **Article ID:** 9000278186

## Content

Solution home 
		MTD IT
		MTD IT

### MTD IT: Troubleshooting Client Authorisation Failures

			Print

	Modified on: Wed, 5 Aug, 2026 at  2:46 PM

		Client authorisation in MTD IT is a multi-stage process. Before the software authorisation can succeed, the client must already be signed up for MTD IT through your HMRC Agent Services Account (ASA). If the authorisation fails or the status does not change to Authorised, the cause is almost always one of two things: the wrong credentials have been used, or the client has not been signed up on the ASA.

This article explains how to identify and resolve both.

### 
The symptom

One or more of the following is happening:

Clicking Start Authorisation does not complete, or returns an error at the HMRC stage.
You complete the HMRC screens but are returned to Capium with the client still showing as unauthorised.
The authorisation appears to succeed but no data can be retrieved for the client afterwards.

### 
Understanding the order of the process

Authorisation cannot be treated as a single step. The correct sequence is:

StageWhere it happensWhat it does1. Eligibility check and sign-upHMRC Agent Services AccountConfirms the client qualifies for MTD IT and registers them2. Software authorisationCapium MTD IT moduleGrants Capium permission to interact with HMRC for that client

Please Note:

Stage 2 will not succeed if stage 1 has not been completed. For full guidance on stage 1, see MTD IT: Checking and Registering Your Client with HMRC.

### Check 1: Are you using the correct credentials for this client?

The credentials entered at the HMRC sign-in screen must be the Agent Services Account credentials under which that specific client is registered. Practices operating more than one ASA, or staff members who are signed in to a personal HMRC account in the same browser, are the most common cause of this failure.

Navigation > MTD IT > Manage
Use the search to locate the relevant client.
Open the client record and click Start Authorisation.
When redirected to HMRC, check which account you are being signed in to before selecting Give permission.
If the wrong account is shown, sign out of HMRC services completely, or open the authorisation in a private browsing window, and start again.
For the full authorisation walkthrough, see MTD IT: How to Allow Software to Connect with HMRC.

### 
Check 2: Has the client been signed up for MTD IT on your ASA?

A client who exists in Capium and exists on your ASA for Self Assessment purposes has not necessarily been signed up for MTD IT. Sign-up is a separate action.

Sign in to your HMRC Agent Services Account.
Locate the client record.
Confirm the client has been signed up for Making Tax Digital for Income Tax, and that the sign-up has been accepted rather than left pending.
If the client has not been signed up, complete the sign-up before returning to Capium.
HMRC sign-ups are not always instant. If the sign-up was submitted recently, allow it to be processed before attempting the software authorisation again.

### If both checks pass but authorisation still fails

Refresh the page or re-open the client record. The status can occasionally lag behind the completed authorisation.
Confirm the client's National Insurance number and Unique Taxpayer Reference in Capium match the details held by HMRC. A mismatch will prevent HMRC from returning a successful authorisation.
If the client was previously authorised using incorrect credentials, revoke the existing authorisation and authorise again. See MTD IT: How to Revoke HMRC Authorisation for a Client.

Capium Tip:
If you are authorising several clients at once, Bulk Authorisation allows you to complete the HMRC journey a single time for multiple clients. See MTD IT: Bulk Authorisation.

### 
Still not resolved

If the credentials are correct, the client is signed up on the ASA, and the client details match HMRC's records, the issue sits with the client's record on HMRC's systems. Contact HMRC directly to confirm the status of the MTD IT sign-up for that client. 
Capium cannot authorise a client whom HMRC has not registered for MTD IT.

### 
Related articles

MTD IT: Client Authorisation Workflow
MTD IT: Checking and Registering Your Client with HMRC
MTD IT: How to Allow Software to Connect with HMRC
MTD IT: Bulk Authorisation
MTD IT: How to Revoke HMRC Authorisation for a Client
MTD IT: Sources Not Appearing After Syncing a Client

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

