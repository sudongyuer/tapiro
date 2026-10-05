# Wise: feasibility for paid bounties

Date: 2026-10-05. Research only, not legal advice. Read `2026-10-05-stripe-feasibility.md` first; this file does not repeat it.

Conventions:

- Every fact has a quote and a URL fetched in this session.
- **[U]** means I could not confirm it from a primary source.
- **[I]** means my own inference from the quoted text.
- Fee figures come from Wise's public pricing endpoint that backs the wise.com price calculator (`wise.com/gateway/v1/price`, `profileType=BUSINESS`, 1,000 units sent, fetched 2026-10-05). They move daily.

Target flow, same as the Stripe file: the poster pays, money is held, and the helper is paid on completion.

---

## 1. Wise Business eligibility

### Malaysia: no Wise Business

- The Malaysian business page says: "Malaysia doesn’t have Business yet". https://wise.com/my/business/
- Holding rule for Malaysia: "You can only hold money in personal accounts, not business accounts." https://wise.com/help/articles/2813542/where-do-i-need-to-live-to-hold-money-with-wise
- MYR account details: "You can’t get MYR account details for your business account." https://wise.com/help/articles/2lDYkmGHRiyfl1T8XKuahU/how-do-i-receive-money-with-my-myr-account-details
- MYR guide: "If you have a business account, you can’t send MYR". This sits under "Sending from MYR". https://wise.com/help/articles/2932332/myr-transfers
- **Conflict [U]:** the API docs say "business accounts in the US, Canada, Australia, New Zealand, Singapore, and Malaysia, can fund transfers via the API". https://docs.wise.com/guides/product/send-money/use-cases/payouts-smbs.md
  - This may refer to older Malaysian business accounts. The holding article says: "It's possible that older Wise accounts have access to different features than new ones." Ask Wise.
- So a Malaysian company or sole proprietor cannot open a new Wise Business account today. [I]

### Other countries

- General rule: "When you add your details, we’ll let you know if we support businesses in your country." Wise works for "sole traders and freelancers", "limited and public companies" and "Partnerships". https://wise.com/help/articles/2977974/can-my-business-use-wise
- Wise publishes no single list of business countries. The holding list includes China, Hong Kong, Singapore, the United Kingdom and the United States. Hong Kong: "You can only hold money in business accounts, not personal accounts." https://wise.com/help/articles/2813542/where-do-i-need-to-live-to-hold-money-with-wise
- Business pages exist for `cn`, `hk`, `sg`, `us` and `gb`, each saying "The business account for going global". https://wise.com/hk/business/ (and the same path for the others)
- Country-specific verification exists for "EEA (European Economic Area) UK US Singapore Japan Hong Kong Philippines New Zealand". https://wise.com/help/articles/2769792/how-can-i-verify-my-business
- Hong Kong supports "Sole trader", "Partnership" and "Limited company". A limited company needs "Directors’ information (name, date of birth, country of residence)". https://wise.com/help/articles/2948998/how-do-i-verify-my-business-in-hong-kong
- US: "For the non-US beneficial owners we’ll request a copy of a photo ID." https://wise.com/help/articles/2953878/verify-your-us-business
- Singapore setup fee: "All in for 99 SGD". https://wise.com/sg/pricing/business

### Foreign company, founder living in Malaysia

- The key rule: "If your business registered address and trading address are in different countries, we can only offer you services that are available in both countries." https://wise.com/help/articles/2769792/how-can-i-verify-my-business
- [I] A UK, HK or SG company that trades in Malaysia is limited to services Wise offers in both countries. Malaysia has no Business product. This may block the account or strip it down. **[U]** How Wise applies this to a foreign company serving Malaysian users. Ask sales.
- **[U]** Whether a China-registered company can open Wise Business. A `cn/business` page exists, but no verification guide for China was found.
- A student can register a UK, HK or SG company remotely: **[U]**. That is a question for those registries, not Wise. Wise lists no rule against foreign directors.

## 2. Paying out

### MYR to Malaysian bank accounts

- "You can send MYR to individual and business bank accounts in Malaysia. You can also send MYR to DuitNow IDs." DuitNow-linked e-wallets: "BigPay, Boost, Touch‘n'Go (TNG) e-Wallet and ShopeePay". https://wise.com/help/articles/2932332/myr-transfers
- DuitNow ID types include "mobile phone, passport or MyKad / NRIC". Same URL.
- Limit: "you can send up to 9,800,000 MYR per transaction".
- Non-resident accounts: "If your recipient has a non-resident local bank account in Malaysia, they can only receive a maximum of 10,000 MYR per day." Same URL. Many foreign students hold such accounts. [I]
- Speed: "it usually takes 2 working days to arrive". Same URL. The price comparison endpoint currently estimates SGD to MYR at `PT1S` (one second). https://api.wise.com/v4/comparisons/?sourceCurrency=SGD&targetCurrency=MYR&sendAmount=1000
- A business sends to MYR from another currency. It cannot hold or send from MYR (section 1). Every payout is a currency conversion. [I]

### Batch and API

- "Use our Batch Payments tool to make up to 1,000 payouts in one go." https://wise.com/gb/business/payouts (redirect from `/gb/business/batch-payments`)
- "Batch Groups enable partners to group up to 1000 transfers under a single reference". https://docs.wise.com/guides/product/send-money/batch-transfers.md
- A Business account uses a personal API token for "Create transfers (either single transfers or batch groups)". https://docs.wise.com/guides/product/send-money/use-cases/payouts-smbs.md
- Funding by API: "funding individual transfers and batch groups via API is not supported for most countries at this time", except "US, Canada, Australia, New Zealand, Singapore, and Malaysia". Same URL. [I] A UK or HK account must approve each batch by hand.

### Fees (business, 1,000 units sent from balance to a MYR bank account)

| Source | Total fee | Flat | Variable |
| ------ | --------- | ---- | -------- |
| SGD    | 3.22 SGD  | 0.73 | 0.25%    |
| USD    | 3.96 USD  | 0.57 | 0.34%    |
| GBP    | 4.23 GBP  | 0.44 | 0.38%    |
| HKD    | 8.97 HKD  | 4.50 | 0.45%    |

Source: https://wise.com/gateway/v1/price?sourceAmount=1000&sourceCurrency=SGD&targetCurrency=MYR&profileType=BUSINESS (and the same query per currency).

[I] For an RM50 bounty paid from SGD, the fee is about RM2.45 (0.73 SGD flat plus 0.25% of about 15.7 SGD). The flat part dominates small bounties.

### Alipay and Weixin in China

- Senders by type: business senders reach individuals through "UnionPay*, Alipay". Weixin is listed for individual senders only. https://wise.com/help/articles/2955298/cny-transfers
- Recipient rule: "Your recipient must be a Mainland Chinese citizen (using their Chinese National ID) or a Hong Kong/Macao resident". https://wise.com/help/articles/2kTApouGnjRj6JM1yduMIL/how-to-send-and-receive-cny-via-alipay
- Business purpose: "If you're sending from a Wise Business account, you can only select Salary or Services." Services: "50,000 CNY" per transfer and "300,000 CNY" per year per recipient. "You must provide a valid business registration number to send as a business." Same URL.
- Business sender countries include "Hong Kong", "Singapore", "United Kingdom, and the United States". China and Malaysia are not listed. Same URL.
- The recipient must link a bank card "within 72 hours" or the transfer is cancelled. Same URL.

## 3. Collecting from posters

- **Card acquiring is closed to new customers:** "This feature to accept card payments is currently unavailable to new Wise Business customers." https://wise.com/gb/business/accept-card-payments/ (same text on https://wise.com/sg/business/accept-card-payments/)
- The Malaysian page for this feature returns 404. https://wise.com/my/business/accept-card-payments/
- Even when it was open, it was a link, invoice or QR-code product: "Just send a link to your customers to get paid fast." Same URL. No in-app SDK is mentioned. [I]
- **No FPX, DuitNow or Alipay acquiring.**
  - Wise Platform "Receive" covers bank rails only: "Swift, SEPA, Faster Payments, and ACH". https://docs.wise.com/guides/product/receive-money.md
  - FPX appears only as a way to fund your own transfer: "You can only pay by bank transfer from your Malaysian bank or via FPX." https://wise.com/help/articles/2932332/myr-transfers
  - A business cannot get MYR account details (section 1), so Malaysian posters cannot pay a Wise business account locally in MYR.
- **"Payment processing"** is on the unsupported list (section 4).
- **Verdict:** confirmed. Wise does not collect card, FPX, DuitNow or Alipay payments for a marketplace. Collection needs another provider.

## 4. Marketplace and third-party funds

### Acceptable Use Policy (Worldwide, "Last updated: 25 March 2026")

https://wise.com/gb/legal/acceptable-use-policy (identical text at `/us/` and `/sg/`)

- "We do not support businesses or transactions which are involved in any of the following categories, such businesses or transactions may be declined."
- Under "1.2.2 Financial and other professional services":
  - "Escrow services." and "Using Wise Borderless account as an escrow account."
  - "Marketplaces from countries outside of European Economic Area and/or European Union or the United States."
  - "Money service businesses, or any businesses that carry on the activity of:" … "Transmitting money, or any representation of monetary value, on behalf of third parties." … "Payment processing."
  - "Any other financial services operating without a licence where one is required."
- "1.3 … not to use your Wise Account in a manner that is likely to result in complaints, disputes, reversals, chargebacks, or other liabilities to Wise".
- "1.4 … You may not use your personal Wise account to receive business payments."

[I] Collect from posters, hold, then pay helpers is the prohibited pattern three times over. It is a marketplace outside the EEA and US, it holds funds like escrow, and it transmits money for third parties. A UK, HK or SG company is still outside the EEA and US. Only an EEA or US marketplace is not excluded by name. Even then, escrow and third-party transmission are still listed. [I]

### Personal accounts as a workaround: also excluded

- "you can't use your personal account to send MYR on behalf of a business or anyone else … If you do this, we'll have to restrict or close your account." https://wise.com/help/articles/2932332/myr-transfers
- Malaysian residents can hold "up to 20,000 MYR" in a personal account. https://wise.com/help/articles/2lDYkmGHRiyfl1T8XKuahU/how-do-i-receive-money-with-my-myr-account-details

### Wise Platform

- There is a marketplace page: "Empower your sellers with reliable, transparent payment experiences". It names no countries and no licence condition. https://wise.com/platform/marketplaces
- Three models: https://docs.wise.com/guides/product/account-setup.md
  - Enterprise: "marketplaces … making outbound payouts". "your organization is the sole sender and legal owner of all transactions." [I] Tapiro would still collect and hold poster money first.
  - Correspondent: for "regulated banks and non-bank financial institutions". The guide says "licensed banks and financial institutions … integrate with Wise Platform as a correspondent partner". https://docs.wise.com/guides/product/send-money/use-cases/correspondent.md
  - Embedded Solutions: "Wise manages or verifies distinct customer identities, giving each end customer their own isolated financial profile". "These unique profiles ensure the customer is the legal sender or recipient of funds."
- An unlicensed partner is possible in Embedded: "Wise onboards the customers for unlicensed institutions by collecting, validating, and verifying customer identity documents".
- Proactive KYC is "available for business accounts in EU, UK, United States, Canada, Singapore, Japan, and Australia markets". https://docs.wise.com/guides/product/account-setup/customer-onboarding.md
- **[U]** Whether Embedded is available for Malaysian consumers (posters and helpers), and whether Wise accepts an early-stage, unlicensed, non-EEA marketplace. Embedded profiles would need Malaysian personal accounts, which cannot send MYR "on behalf of … anyone else". [I] The Platform is sold through sales ("Get in touch"). Expect a high bar for a pre-revenue student project. [I]

## 5. Licensing

### Malaysia (BNM)

- Licence required: "No person shall carry on money services business without a licence issued under this Act." Money services business includes "remittance business". MSBA 2011 s.4(1) and s.2. https://www.bnm.gov.my/documents/20124/ef89a17a-0a5b-27ad-8aba-458a9888cd1f (BNM marks this text "Not yet incorporating with latest amendment, Act A1711". https://www.bnm.gov.my/legislation)
- The current definition (Act A1711, in force 1 August 2024): "'remittance business' means— (a) the business of transferring funds; or (b) the business of facilitating transfer of funds, whether in any form or by any means or whether there is any movement of funds or not, on behalf of an originator person in or outside Malaysia to a beneficiary person in or outside Malaysia". https://www.bnm.gov.my/documents/20124/820862/act-A1711-msba2024-en.pdf
- "Facilitating the transfer of funds" includes "(a) offering services to transfer funds; (b) accepting or receiving funds; … (d) arranging for transfer of funds; … (g) allowing an account to be used for transfer or receipt of funds; or (h) engaging in any form of settlement activity". Same URL.
- Penalty: "imprisonment for a term not exceeding ten years and a fine of not less than fifty thousand ringgit but not exceeding five million ringgit". Same URL.
- Abetting: "A, a remittance system provider, who knows B is not a licensee under this Act, continues to provide B with a system or application that supports B’s remittance business activity. A abets the commission of an offence". Same URL.
- The only exclusion found: "'remittance business' excludes the business of solely providing a remittance system which does not influence or control the operations of the remittance business of the licensee." Money Services Business (Remittance Business) Regulations 2012, P.U. (A) 71. https://www.bnm.gov.my/documents/20124/964944/1.7_MSB+%28Remittance+Business%29+Regulations+2012.pdf/94669b2a-5a54-b3b6-273a-be582104613f?t=1592884637895
- Wise itself is licensed: "Wise Payments Malaysia Sdn. Bhd. … is regulated under the laws of Malaysia by the Bank Negara Malaysia as a licensed remittance, money-changing and e-money issuance business." https://wise.com/help/articles/2932693/how-is-wise-regulated-in-each-countryregion

[I] A platform that takes money from a poster into its own balance and later pays a helper is "accepting or receiving funds" on behalf of an originator for a beneficiary. That matches the definition, wherever the platform is incorporated, because both persons may be "in or outside Malaysia". Wise's licence covers Wise's own customers, not Tapiro's users.

**[U]** Whether BNM treats a marketplace paid for a service as the seller's agent, outside remittance. No prescribed exclusion for marketplaces or commercial agents was found. This is the top lawyer question.

**[U]** Whether the coordinate-only variant counts as "(d) arranging for transfer of funds". The app would show a helper's DuitNow ID, and the money would move bank to bank. [I] The risk is much lower because the app never touches funds and the payment pays for a service. A lawyer should still confirm.

### Home country (UK, HK, SG)

**[U]** I did not research UK, HK or SG payment-services law. A foreign company still faces the MSBA test above for Malaysian users. [I]

## 6. Apple

- "3.1.3(e) Goods and Services Outside of the App: If your app enables people to purchase physical goods or services that will be consumed outside of the app, you must use purchase methods other than in-app purchase to collect those payments, such as Apple Pay or traditional credit card entry." https://developer.apple.com/app-store/review/guidelines/ ("Last Updated: June 8, 2026")
- Errands are services consumed outside the app, so IAP is not allowed. Any non-IAP collection (a PSP, or a direct DuitNow transfer) is compatible. [I]
- Watch 3.2.1(viii): "Apps used for financial trading, investing, or money management should be submitted by the financial institution performing such services and must have necessary licensing and permissions in the locations where you make them available." Same URL. [I] This does not apply to a bounty app that pays for services. It would matter if the app offered a wallet or stored balance.

## 7. Realistic variant: the app coordinates, posters pay helpers directly

- The poster pays the helper bank to bank. The poster's own bank app or Wise personal account sends to the helper's DuitNow ID or bank account. Wise personal can send "MYR to DuitNow IDs". https://wise.com/help/articles/2932332/myr-transfers
- Tapiro shows the helper's payout handle and records "paid / received" confirmations. It never touches funds. [I]
- Costs: none for Tapiro. Wise is optional for posters; most will use their own bank's DuitNow. [I]
- Trade-offs [I]:
  - There is no escrow, so trust comes from reputation and ratings.
  - Disputes are off-platform.
  - The "pay before choosing" guarantee disappears.
- Helpers paid in China by Alipay or Weixin: this is cross-border remittance by the poster. It is out of scope for the app. [I]

---

## Verdict

| #   | Question                                               | Result                       | Why                                                                                                                        |
| --- | ------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1a  | Malaysian company or sole proprietor on Wise Business  | **Blocked**                  | "Malaysia doesn’t have Business yet"                                                                                       |
| 1b  | UK, HK, SG or US company, founder in Malaysia          | **Unknown, likely limited**  | Trading in a different country gives only "services that are available in both countries"                                  |
| 1c  | China company                                          | **Unknown**                  | No China business verification guide found                                                                                 |
| 2a  | Pay many MYR bank accounts and DuitNow IDs in a batch  | **Works** (foreign business) | Up to 1,000 per batch; about 0.25% + 0.73 SGD from SGD; API funding only in some countries                                 |
| 2b  | Pay helpers' Alipay                                    | **Works with limits**        | HK, SG, UK, US business senders only; recipient must be a mainland citizen or HK/Macao resident; "Services" 300,000 CNY/yr |
| 3   | Collect card, FPX, DuitNow or Alipay inside the app    | **Blocked**                  | Card acceptance "unavailable to new Wise Business customers"; no local MYR collection for business accounts                |
| 4   | Collect, hold, pay out under Wise terms                | **Blocked**                  | AUP: marketplaces outside the EEA and US, escrow, and transmitting money for third parties are unsupported                 |
| 4b  | Wise Platform for marketplaces                         | **Unknown, unlikely**        | Embedded allows unlicensed partners, but Malaysian consumer coverage and acceptance are not documented                     |
| 5   | Tapiro holding funds without a BNM licence             | **Blocked [I]**              | MSBA "accepting or receiving funds" on behalf of an originator is remittance business                                      |
| 6   | Apple: non-IAP payment for errands                     | **Works**                    | 3.1.3(e) requires non-IAP methods                                                                                          |
| 7   | Full flow (collect, hold, pay) through Wise            | **Blocked**                  | Fails on items 3, 4 and 5                                                                                                  |
| 7b  | App coordinates; poster pays helper by DuitNow or bank | **Works [I]**                | No funds touch Tapiro; a lawyer must confirm "arranging for transfer of funds" does not apply                              |

**Recommendation [I]:** drop Wise as the marketplace rail. Keep the coin-only design D, or the coordinate-only cash variant (7b) once a lawyer clears it. A collect-hold-pay flow needs a licensed Malaysian PSP with a marketplace product (Curlec Route or Stripe Connect), and that needs an SSM entity.

## Questions for Wise sales

1. Can a UK, HK or SG company open Wise Business when its director lives in Malaysia and its users are in Malaysia? How does the rule "services that are available in both countries" apply?
2. The API docs list Malaysia among countries whose business accounts can fund transfers by API, but wise.com/my says "Malaysia doesn’t have Business yet". Which is current? When will Malaysian businesses be supported?
3. Is a services marketplace from Hong Kong or Singapore that pays Malaysian individuals for completed errands a "Marketplace" under AUP 1.2.2, even if it never holds user funds?
4. Can a business account pay helpers who were paid directly by posters, for example as reimbursements or bonuses? Or is any payout to marketplace users treated as third-party transmission?
5. Does Wise Platform Embedded Solutions support Malaysian individual profiles (residents and foreign students on a passport)? Can those profiles send MYR to each other through a partner app?
6. What are the minimum volume and licence requirements for a Wise Platform marketplace partner? Is a non-licensed early-stage partner accepted?
7. Is card acceptance coming back for new business customers? Will it ever cover FPX, DuitNow or e-wallets?
8. For business transfers to Alipay, which "Services" evidence is required per payout? Does the 300,000 CNY yearly cap count all senders?
9. Do batch payouts to many Malaysian non-resident accounts (foreign students) trigger extra checks? How does the 10,000 MYR daily cap work for those accounts?
