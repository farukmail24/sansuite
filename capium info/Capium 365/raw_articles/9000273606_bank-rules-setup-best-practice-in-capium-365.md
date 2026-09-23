# BANK RULES – SETUP &amp; BEST PRACTICE IN CAPIUM 365
	 	
			
			Print

- **Category:** Capium 365
- **Folder:** Capium 365 FAQs (BOT)
- **Source URL:** [https://capium.freshdesk.com/support/solutions/articles/9000273606-bank-rules-setup-best-practice-in-capium-365](https://capium.freshdesk.com/support/solutions/articles/9000273606-bank-rules-setup-best-practice-in-capium-365)
- **Article ID:** 9000273606

## Content

Solution home 
		Capium 365
		Capium 365 FAQs (BOT)

### BANK RULES – SETUP & BEST PRACTICE IN CAPIUM 365

			Print

	Modified on: Tue, 3 Feb, 2026 at  6:25 PM

Q: What are Bank Rules in Capium 365?

Bank Rules are automation rules that pre-code bank transactions based on conditions such as description text, amount, or transaction type. They speed up reconciliation and improve consistency.

### Q: Where do I set up Bank Rules in Capium 365?

Limited Companies / Partnerships / LLPs:Go to Client → Bank → Bank Rules

Individuals / Sole Traders:Go to Client → Books → Bank Rules

The location depends on the client type.

Links:https://capium.freshdesk.com/support/solutions/articles/9000269489-capium-365-bank-ruleshttps://capium.freshdesk.com/support/solutions/articles/9000266459-capium-365-books

### Q: How do I create a new Bank Rule?Open the client’s Capium 365 portal

Go to Bank Rules (location depends on client type)

Click Add Rule

Choose Money In or Money Out

Define the rule conditions (e.g. description contains “RENT”)

Choose how the transaction should be coded

Save the rule

Once saved, the rule applies to future matching transactions.Links:https://capium.freshdesk.com/support/solutions/articles/9000269489-capium-365-bank-rules

### Q: What’s the difference between Money In and Money Out rules?

Money In: applies to income (sales, rent received, refunds)

Money Out: applies to expenses (utilities, subscriptions, loan payments)

Rules will not trigger if the wrong type is chosen.

Q: What conditions can I use in a Bank Rule?

Conditions typically include:

Transaction description contains specific text

Exact or partial matches

Multiple conditions using ANY or ALL logic

Best practice is to start broad, then refine if needed.

### Q: What does a Bank Rule actually do to the transaction?A Bank Rule can:

Assign an account/category

Apply VAT treatment (if relevant)

Attach a contact or supplier

Split amounts across accounts (fixed or percentage)

This means transactions arrive pre-coded and ready to reconcile.

### Q: Do Bank Rules apply to existing transactions?No. Bank Rules apply to new incoming transactions after the rule is created. Existing transactions must be handled manually.

Q: Why didn’t my Bank Rule apply to a transaction?Common reasons:

Rule created after the transaction arrived

Description didn’t match exactly

Wrong Money In / Money Out selected

Rule is inactive

### Q: Do Bank Rules reconcile transactions automatically?

### A: No. Bank Rules prepare transactions by coding them, but accountants still review and reconcile to confirm accuracy.

Q: How do Bank Rules speed up reconciliation?By ensuring transactions arrive consistently coded, reconciliation becomes a review-and-confirm task instead of manual entry.

Q: When should I set up Bank Rules for a client?

After the first batch of bank transactions appears, identify recurring items (rent, subscriptions, utilities) and create rules early.

Q: How many Bank Rules should I create?

Focus on high-frequency, repetitive transactions. Avoid over-engineering rules for one-off items.

Q: Why are Bank Rules especially important for MTD IT clients?

MTD IT relies on accurate quarterly totals. Bank Rules reduce miscoding and speed up reconciliation, which improves the quality of quarterly submissions and reduces year-end corrections.

### Common mistakes

Q: What are the most common mistakes when setting up Bank Rules?

Using rules that are too specific

Forgetting to choose the correct Money In/Out type

Expecting rules to fix old transactions

Not reviewing rules after changes in client behaviour

										Did you find it helpful?
								Yes
								No

Send feedback	Sorry we couldn't be helpful. Help us improve this article with your feedback.

