# Common Payroll Errors &amp; Codes
	 	
			
			Print

- **Category:** Payroll
- **Folder:** Payroll Help Guide
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000271077-common-payroll-errors-codes](https://capium.freshdesk.com/support/solutions/articles/9000271077-common-payroll-errors-codes)
- **Article ID:** 9000271077

## Content

Solution home 
		Payroll
		Payroll Help Guide

### Common Payroll Errors & Codes

			Print

	Modified on: Wed, 10 Sep, 2025 at  6:11 PM

### Payroll Submissions – How to Correct FPS/EPS Mistakes & Troubleshoot Errors

Category: PayrollSub-Category: Submissions & TroubleshootingAudience: Accountants / Payroll Admins

### Objective

This article explains how to correct mistakes in FPS (Full Payment Submissions) and EPS (Employer Payment Summaries) within Capium Payroll.It also provides a troubleshooting hub for common HMRC error codes, with real case examples drawn from support tickets.

###  When to Use This Guide

An FPS or EPS submission has failed.

You’ve made a mistake in payroll and need to correct it.

HMRC has returned an error code (e.g., 7802, 3001, 1046).

Dashboard shows FPS/EPS in red or overdue.

### Step-by-Step Workflow for Corrections

### 1. Check Submission Status

Go to Payroll → Client → Submissions → FPS & EPS.

Review latest submission status:

Green = accepted.

Red = failed/overdue.

Amber = pending.

### 2. Apply the Right Fix

a) Incorrect Employee Details (e.g., start date, gender, hours)

Edit details under Employees → Edit.

Save changes.

If already submitted → roll back payroll, re-run, and resubmit.

b) Missed Employment Allowance

Submit an EPS → Employment Allowance claim for the correct period.

If payroll already run, rollback may be needed.

If system blocks rollback → contact support.

c) Year-End Amendment (YEA-FPS)

If no FPS was filed earlier in the year, support must roll back tax year, enable at least one payroll run, then resubmit.

d) Submissions in Red (but no real failure)

Refresh dashboard, check Submissions tab.

Confirm in HMRC if the submission was received.

e) HMRC System Downtime (Internal Error 1000)

Retry later.

Confirm whether HMRC has accepted the FPS before resubmitting.

### Common Error Codes & Fixes

Error CodeWhat It MeansFix7802Not invited to submit this type (RTI setup/migration issue)Confirm PAYE scheme registered, check HMRC migration date, contact HMRC if needed1046Authentication errorUpdate HMRC login credentials in Settings → HMRC3001Business logic validation failureReview employee/tax data, correct format errors, resubmit4065Invalid content in element ‘Line’Fix address/formatting issues4085Value not in correct formatRemove invalid characters/extra spaces in address1000HMRC system failureWait and retry, confirm if submission already reached HMRC7815Employer scheme cancelledContact HMRC to reinstate scheme before resubmitting
### Real Case Examples (from Capium Support Tickets)

EPS Error 7802: PAYE submissions blocked. Fix → Confirm RTI setup with HMRC.

YEA-FPS: Client hadn’t submitted earlier FPS. Fix → Support rolled back year, processed March, then allowed YEA-FPS.

Employment Allowance: Missed claim, rollback blocked. Fix → Screenshare support to resubmit.

FPS in Red: Dashboard false alarm. Fix → No resubmission needed, confirm in HMRC.

FPS Failed (3001, 4085, 4065): Validation issues. Fix → Correct address data; submission later confirmed successful.

Internal Error 1000: HMRC downtime. Fix → Submission succeeded later without action.

Overseas Employee: Setup queries (NT tax code, NI letter X). Fix → Refer to HMRC guidance for globally mobile employees.

Employment Allowance Error 7815: Scheme cancelled. Fix → User to contact HMRC.

### Escalation Path (Support Team)

Step 1: Check submission logs in Capium.

Step 2: If needed, rollback year/period.

Step 3: Unlock for resubmission.

Step 4: Escalate to Tech if HMRC/system-related.

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

