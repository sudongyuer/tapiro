# Stripe Connect and Curlec Route: feasibility for paid bounties

Date: 2026-10-05. Research only, not legal advice. This builds on section 3 of `2026-10-05-payments.md` and does not repeat it.

Conventions:

- Every fact has a quote and a URL fetched in this session.
- **[U]** means I could not confirm it from a primary source.
- **[I]** means my own inference from the quoted text.
- `docs.stripe.com` pages were fetched as `.md` (append `.md` to the URL). The Stripe requirement data comes from the public docs endpoints that back the "Required verification information" page.
- Curlec pages were read on `curlec.com/docs/...`. Some pages were read on the docs mirror `doc-test-my.mintlify.app`, which `curlec.com/docs` serves. Some mirror pages still contain Indian content (PAN, GST, RBI, "nodal account"). Treat Curlec API details as **[U]** until sales confirms them for Malaysia.

Target flow:

1. The poster pays when choosing a helper.
2. The provider holds the money.
3. On completion, or auto-confirm after 48 h, the provider pays the helper's Malaysian bank account, ideally in a weekly batch.
4. There is no platform commission, and the poster pays the fees.
5. Tapiro never holds funds.

---

## 0. Founder entity options (founder is on a student pass, with no SSM registration)

### (a) What a student-pass holder can register

**Sole proprietorship or partnership (SSM, ROBA 1956): not available.**

- SSM's guideline lists this requirement: "Owner or partners must be a Malaysian Citizen or Permanent Resident of Malaysia." https://www.ssm.com.my/Pages/Register_Business_Company_LLP/Business/Business-Document/guidelines_for_registration_of_new_business_05062018.pdf
- The same guideline says: "A person who carries on business without registering a business commits an offence under the ROBA 1956 and if found guilty be fined not exceeding RM50,000.00 or imprisonment for a term not exceeding two (2) years or both."

**Sdn Bhd as shareholder: allowed.**

- SSM FAQ: "A foreigner can form a company as the sole shareholder." https://www.ssm.com.my/Pages/Legal_Framework/FAQS-ON-COMPANIES-ACT-2016-AND-TRANSITIONAL-ISSUES/part_c.pdf

**Sdn Bhd as director: depends on the resident-director rule.**

- The same FAQ continues: "However, if he also wants to be the sole director of the company, he has to fulfil the requirement under section 196(4) Companies Act 2016, in that he must ordinarily reside in Malaysia, by having a principal place of residence in Malaysia."
- SSM incorporation guideline: "At least one (1) director who ordinarily resides in Malaysia by having a principal place of residence in Malaysia and minimum of one (1) promoter." https://www.ssm.com.my/Pages/Legal_Framework/GUIDELINES/4.-Guidelines-For-Incorporation-Of-A-Local-Company.pdf
- **[U]** Whether a student-pass holder counts as "ordinarily resident … by having a principal place of residence in Malaysia". No SSM source addresses student passes.

**Foreign ownership caps for this sector:** **[U]**. I found no primary source.

**Does the student pass restrict running a business?**

- The IMI page restricts dependents and guardians explicitly: "Dependents are NOT ALLOWED to work, conduct business …" and "Guardians are NOT ALLOWED to work, conduct business …". It does not say the same about the student-pass holder.
- For the holder, it allows work only through "Work Permission": "Student Pass holders are allowed to work part-time during their study period, limited to 20 hours per week, only at approved locations: Restaurants Petrol stations Mini markets Hotels University/college areas". It also says "Any student found violating regulations will have their Student Pass revoked." https://www.imi.gov.my/index.php/en/main-services/pass/student-pass/
- **[U]** Whether owning shares, or being an unpaid director, counts as "work" or "business" for the holder. This is a lawyer question.
- **[I]** Drawing salary or profit from running the company looks like work outside the approved list.

### (b) Can the Stripe Connect platform be an individual or sole proprietor in Malaysia?

- Stripe's MY regional terms refer to individuals: service of process at "primary address (for individuals or sole proprietors)". https://stripe.com/en-my/legal/ssa
- **FPX needs an SSM number on the account that takes the payment:** "As part of being regulatory compliant, Stripe requires businesses to provide their Business Registration Number (BRN) to process FPX charges and receive payouts." https://docs.stripe.com/payments/fpx
  - With destination charges or separate charges and transfers, the charge is made on the platform. So the platform needs a BRN for FPX. [I]
- Stripe's MY e-invoicing article lists IDs for individuals: "Tax Identification Number (MY TIN) and Business Registration Number (BRN) or MyKad / MyTentera / MyKas / MyPR / Passport". https://support.stripe.com/questions/understanding-e-invoicing-requirements-for-malaysia
  - This shows Stripe MY accounts can belong to individuals with a passport. It does not say an individual can be a Connect platform. **[U]**
- **Verdict [I]:** an individual Stripe MY account may exist. A marketplace that needs FPX needs a BRN, which means an SSM-registered entity. The founder cannot get one alone, as shown in (a).

### (c) Can a platform registered outside Malaysia pay Malaysian individuals?

**Stripe, no.**

- "Platforms based in the US, UK, EEA, Canada, or Switzerland can transfer funds to connected accounts in any of those regions" and "Stripe doesn't support self-serve cross-border payouts to countries outside the listed regions." https://docs.stripe.com/connect/cross-border-payouts
- Charge-type rule: "Stripe supports cross-border transfers on the payments balance between the United States, Canada, United Kingdom, EEA, and Switzerland. In other scenarios, your platform and any connected account must be in the same region." https://docs.stripe.com/connect/separate-charges-and-transfers.md?integration=mobile&platform=react-native
- **SG and HK platforms:** the docs endpoint for `platformCountry=SG` and `platformCountry=HK` returns 43 account countries, and **MY is not among them**. https://docs.stripe.com/_endpoint/get-requirement-selections-for-platform-country?platformCountry=SG
- **China:** CN is not in `platform_countries`. https://docs.stripe.com/_endpoint/get-platform-countries
- **US platform to MY:** MY is listed, but only with `"tos_types": ["recipient"]`. https://docs.stripe.com/_endpoint/get-requirement-selections-for-platform-country?platformCountry=US
  - "You can't make cross-border payouts to connected accounts under a recipient service agreement. For those accounts, use Global payouts." https://docs.stripe.com/connect/cross-border-payouts
- **Global Payouts:**
  - "Global Payouts is available to businesses located in the following countries: GB, US". Malaysian individuals are reachable by "Wire". https://docs.stripe.com/global-payouts and https://docs.stripe.com/global-payouts/recipient-requirements
  - But: "Global Payouts is best for businesses that already hold the Money Transmitter License (MTL) required to move money themselves".
  - This breaks the rule that Tapiro never holds funds, and it needs a US or UK entity. [I]

**Curlec, no.**

- "We currently do not support Individual/Unregistered businesses." The required documents for every company type are "SSM". https://curlec.com/docs/payments/business-types-kyc-documents/
- **[U]** Onboarding mentions a checkbox "My Business is not registered with SSM" that asks for a "Certificate of Registration/Incorporation" instead. https://curlec.com/docs/payments/set-up/
  - Whether this accepts a foreign company is not stated. Ask sales.

### (d) Which path is realistic

| Path                                                                                 | Status                              | Why                                                                                                                                   |
| ------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Founder as SSM sole proprietor or partnership                                        | **Blocked**                         | Citizen or PR only (SSM guideline)                                                                                                    |
| Founder as individual Stripe MY platform                                             | **Unknown, likely blocked for FPX** | FPX needs a BRN; individual-as-platform is not documented [U]                                                                         |
| Sdn Bhd, founder as sole shareholder **and** sole director                           | **Unknown**                         | s.196(4) residence test for a student-pass holder [U]; student-pass "work" question [U]                                               |
| Sdn Bhd, founder as shareholder, plus a Malaysian citizen or PR as resident director | **Works on paper**                  | SSM FAQ allows a foreign sole shareholder; s.196(4) is met by the co-director. A lawyer must confirm the founder's role is not "work" |
| Malaysian co-founder (citizen or PR) registers the entity                            | **Works**                           | Meets SSM requirements; that person carries legal responsibility                                                                      |
| HK, SG or CN company as the Stripe platform                                          | **Blocked**                         | MY is not a valid account country for SG or HK platforms; CN is not a platform country                                                |
| US or UK company with Global Payouts                                                 | **Blocked by our constraints**      | Needs your own money-transmitter licence; Tapiro would hold funds                                                                     |
| Foreign company on Curlec                                                            | **Unknown, likely blocked**         | Curlec asks for SSM documents [U]                                                                                                     |

**Realistic path [I]:** a Sdn Bhd with a Malaysian-resident director, either a co-founder or a nominee. Until a lawyer clears the student-pass question, the founder should hold shares only and should not take pay. Until then, ship the coin-only design D from the earlier research. The cash track stays off.

---

## 1. Platform eligibility (Stripe first)

- **MY is a supported platform country.**
  - The list includes `"MY"`. https://docs.stripe.com/_endpoint/get-platform-countries
  - The Malaysian contracting entity is "Stripe Payments Malaysia Sdn. Bhd." https://stripe.com/en-my/legal/ssa
- **The MY-to-MY setup is inconsistent in the docs.**
  - For `platformCountry=MY`, the `country_map` returns 43 countries, and **MY itself is not among them**. https://docs.stripe.com/_endpoint/get-requirement-selections-for-platform-country?platformCountry=MY
  - The requirements endpoint still accepts MY to MY without validation errors. It rejects an invalid country with "Invalid country for account-setup-A".
  - Separate charges and transfers lists MY as a supported region. https://docs.stripe.com/connect/separate-charges-and-transfers.md?integration=mobile&platform=react-native
  - **[U]** Confirm MY to MY with sales.
- **Entity type:** see section 0. The platform needs a BRN for FPX.
- **Non-Malaysian platform:** blocked, see 0(c).
- **Curlec:** the platform must be SSM-registered. "We currently do not support Individual/Unregistered businesses." https://curlec.com/docs/payments/business-types-kyc-documents/

## 2. Payee onboarding (individual connected account in MY)

### Stripe

**Fields required for a MY individual** (MY platform, MY account, Express dashboard, `card_payments` + `transfers`; v1 field names, with v2 names in brackets):

- `individual.first_name`, `last_name`, `dob`, `address`, `phone`, `email`;
- `business_profile.url`, `mcc`;
- `individual.id_number` (v2 `identity.individual.id_numbers.my_nric`, display name "Tax information");
- `individual.verification.document`, with `payment_limit_amount: 250000` (RM2,500 before the document is due);
- `tos_acceptance`;
- `external_account`.

Source: https://docs.stripe.com/_endpoint/get-requirements-for-setups?account-setup-A[apiVersion]=v1&account-setup-A[platformCountry]=MY&account-setup-A[accountCountry]=MY&account-setup-A[dashboardType]=express&account-setup-A[tosType]=full&account-setup-A[legalEntityType]=individual&account-setup-A[capabilities][0]=card_payments&account-setup-A[capabilities][1]=transfers

**Accepted identity documents for MY: MyKad and passport.**

- The page data lists `my.identity_card` ("Kad Pengenalan / MyKad") and `my.passport` ("Pasport"). https://docs.stripe.com/acceptable-verification-documents?country=MY&document-type=identity
- Same page: "If the country of residence differs from the country of the account, a passport is required for identity verification."

**Gap for foreign students:**

- A passport is an accepted document.
- But the only ID-number field is `my_nric`, and no alternative is listed (`"v2_alternatives": []`).
- **[U]** Whether a student without an NRIC can complete `id_number`, for example with a passport number. This is the top question for sales.

**Bank account:**

- MY payouts go to a local bank account (test SWIFT `TESTMYKLXXX`). https://docs.stripe.com/payouts
- For bank accounts in general: "Also required is the name of the person or business that owns the bank account; use the account_holder_name attribute". https://docs.stripe.com/connect/payouts-bank-accounts
- **[U]** Whether the account must be in the payee's own name, and whether Stripe checks it for MY.

**Minimum payout:** "MY | 5 MYR". https://docs.stripe.com/payouts

### Curlec

**Linked accounts are created through support, not self-serve.**

- "Contact our Support team to create Linked Accounts for your business." https://curlec.com/docs/payments/route/linked-account/
- Required information listed: "Linked Account name, Contact number, Email address", and bank details: "Account number, Account type, Bank name, Beneficiary name". No identity documents are listed.

**`business_type` includes `individual` and `not_yet_registered`.** https://doc-test-my.mintlify.app/docs/payments/route/integration-guide.md

- The create-linked-account API example uses Indian fields (`"pan"`, `"gst"`). https://doc-test-my.mintlify.app/docs/api/payments/route/create-linked-account.md
- **[U]** The KYC rules for a Malaysian individual linked account, including passport holders.

## 3. Business model acceptability

### Stripe

Prohibited list (updated 2026-09-22): "Peer-to-peer money transmission" and "Adult services, including prostitution, escorts …". https://stripe.com/en-my/legal/restricted-businesses

- **[I]** A bounty for an errand is payment for a service, not a money transfer. The companion and "accompany" categories must never read as escort or dating services.

Restricted list (needs due diligence):

- "Payment facilitation and aggregation (including receiving settlement proceeds for goods or services that you did not provide, on behalf of one or multiple third-party sellers)";
- "Online dating and matchmaking services".

Malaysia-specific prohibitions: "Domestic charter air travel, Genital and nipple jewellery, Genital prosthetics, Matchmaking, Sex accessories or sex toys". None of these is an errand category.

Connect fits this model, according to Stripe's own examples: destination charges suit "A branded service that uses independent contractors, such as a rideshare app" and "a website that matches contractors with homeowners". https://docs.stripe.com/connect/charges

MCC restrictions for `card_payments` and `transfers`: `{"restrictions_by_capability":{}}`, so there are none. https://docs.stripe.com/_endpoint/get-mcc-restrictions-for-capabilities?capabilities[0]=card_payments&capabilities[1]=transfers

**[U]** Whether Stripe classifies a P2P errand marketplace as needing pre-approval. Ask sales.

### Curlec

Prohibited items include:

- "escort or prostitution services";
- "Merchant providing services that have the potential of casting the payment gateway facilitators in a poor light … (e.g., adult material/ mature content/escort services/ friend finders)";
- "website that promise online match-making";
- "Unregulated/ unlicensed money service business (MSB) or money and value transfer services (MVTS)".

Source: https://curlec.com/s/terms-of-use/

**[I]** Errands are not listed. The "friend finders" wording is a risk for companion and "accompany" tasks.

## 4. Holding and releasing funds

### Stripe

There is no escrow: "Stripe doesn't provide escrow services or support escrow accounts." https://docs.stripe.com/connect/manual-payouts

**Option A: separate charges and transfers (SCT).**

- "hold them when you don't know the specific user at the time of the charge"; "You can create a charge before being able to transfer the funds." https://docs.stripe.com/connect/charges
- Until the transfer, the money sits in **the platform's Stripe balance**.
- "Funds segregation", which keeps those funds in "a protected holding state", is "a private preview feature". It only covers "Visa, Mastercard, Discover, American Express, and Swish". https://docs.stripe.com/connect/funds-segregation
- **[U]** No transfer-delay limit is documented for SCT.

**Option B: destination charge at helper selection, plus manual payouts on the helper's account.**

- "we hold funds in the account holder's balance until you specify otherwise. You must pay out the funds within … All other countries: 90 days." https://docs.stripe.com/connect/manual-payouts
- Weekly batching uses `interval: weekly` with `weekly_payout_days`. https://docs.stripe.com/connect/manage-payout-schedule
- Default MY settlement timing is "7 calendar days". https://docs.stripe.com/payouts

**Fit [I]:** destination charges plus manual payouts keep the money in the helper's Stripe balance, not Tapiro's. That matches "Tapiro never holds funds" better than SCT. Under SCT the funds sit in Tapiro's Stripe balance before release.

**Refunds before release:**

- Destination charges: "Stripe debits your platform balance for the refund amount. You can reverse the transfers made to your connected accounts to recover your refund cost." https://docs.stripe.com/connect/charges
- Reversal only works while funds are still there: "It's only possible to reverse a transfer if the connected account's available balance is greater than the reversal amount". https://docs.stripe.com/connect/separate-charges-and-transfers.md?integration=mobile&platform=react-native
- [I] Holding with manual payouts keeps the funds reversible.
- FPX refunds: "up to 60 days after the original payment". https://docs.stripe.com/payments/fpx
- GrabPay refunds: "up to 90 days". https://docs.stripe.com/payments/grabpay

**Disputes: the platform is liable.**

- "For disputes where payments were created on your platform using destination charges or separate charges and transfers … your platform balance is automatically debited for the disputed amount and fee." https://docs.stripe.com/connect/charges
- Connect terms: "User is responsible for all Activity on its Connected Accounts … User is liable to Stripe for all: (a) Transactions, Disputes, Refunds, Reversals and resulting Merchant Losses". https://stripe.com/en-my/legal/ssa-services-terms (Stripe Connect—Platform, s.3.1)
- FPX, GrabPay and Alipay all show "Dispute support: No". https://docs.stripe.com/payments/fpx, https://docs.stripe.com/payments/grabpay, https://docs.stripe.com/payments/alipay
- Dispute fee: "RM90.00 for each dispute you receive". https://stripe.com/en-my/pricing

**Account type:**

- Express and Custom are "legacy account types". https://docs.stripe.com/connect/charges
- The recommendation is Accounts v2 with the `recipient` configuration (capability `stripe_balance.stripe_transfers`, "required to use indirect charges"). https://docs.stripe.com/connect/accounts-v2
- KYC stays with Stripe unless "you set `defaults.responsibilities.losses_collector` to `application` and `dashboard` to `none`". https://docs.stripe.com/connect/accounts-v2/connected-account-configuration
- For indirect charges: "assign negative balance responsibility to your platform, not to Stripe." https://docs.stripe.com/connect/risk-management
- **[I] Choice:** destination charges, v2 `recipient` accounts, `dashboard: express`, `losses_collector: application`, Stripe collects the requirements, and manual or weekly payouts.

### Curlec

Hold mechanism:

- Hold indefinitely: "You can choose to defer settlements for a transfer indefinitely by putting it on hold. In this case, the settlement for the transfer happens once you allow it."
- Hold until a time: "`on_hold_until` … Once this time has elapsed, Razorpay Curlec settles the funds to the Linked Account on the next business day."
- Source: https://curlec.com/docs/payments/route/schedule-settlement/

Constraints:

- "You cannot request a transfer on payment once a refund has been initiated." https://curlec.com/docs/payments/route/integration-guide/
- Linked-account settlement: "Linked Account settlements take 2 working days". https://curlec.com/docs/payments/route/linked-account/

Chargebacks: "liability for Chargeback, whether domestic or international … rests with You" (the merchant, that is, Tapiro). https://curlec.com/s/terms-of-use/

**[U]** The maximum hold duration.

## 5. Fees in Malaysia today

### Stripe (https://stripe.com/en-my/pricing, https://stripe.com/en-my/connect/pricing)

| Item                        | Fee                                                                                                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domestic card               | "3% + RM1.00 per successful transaction"; "+ 1% for international cards"; "+ 2% if currency conversion is required"                                                                           |
| FPX                         | "3% + RM1.00"                                                                                                                                                                                 |
| Alipay                      | "2.9% + RM1.00"                                                                                                                                                                               |
| GrabPay                     | "3%"                                                                                                                                                                                          |
| DuitNow, TNG, ShopeePay     | Not on the pricing page. The docs page `payments/duitnow` returns 404. `duitnow_payments` and `shopeepay_payments` appear as MY capabilities in the selection endpoint (US platform). **[U]** |
| Connect, you handle pricing | "RM6 per monthly active account" ("active in any month payouts are sent to its bank account"); "0.25% + RM1.50 per payout sent"                                                               |
| Instant payouts             | "1% of payout volume"                                                                                                                                                                         |
| Dispute                     | "RM90.00"                                                                                                                                                                                     |

**Batching [I]:**

- Weekly batching saves RM1.50 per avoided payout.
- The 0.25% and the RM6 per active month do not change.
- Example: one RM50 card bounty costs RM2.50 + (RM0.125 + RM1.50) + RM6 per active month. For a helper with one task a month, that is about RM10.

**Alipay on Connect:**

- "Connect support: Requires approval".
- Destination charges and SCT are supported.
- "the platform needs to request the `alipay_payments` capability. This is a private preview feature". https://docs.stripe.com/payments/alipay

### Curlec (https://curlec.com/pricing/, Basic plan; the Premium plan has a RM999 setup fee)

| Item                               | Fee                                                                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cards                              | "2.40 %" (foreign "3.30%")                                                                                                                                        |
| FPX                                | "1.50 % (or RM1 per transaction, whichever is greater)"                                                                                                           |
| DuitNow Pay                        | "1.20 % (or RM0.30 per transaction, whichever is greater)"                                                                                                        |
| E-Wallet (TNG, GrabPay and others) | "1.50 %"                                                                                                                                                          |
| Alipay+                            | "2.70%"                                                                                                                                                           |
| Route transfer fee                 | Example "Transfer Fees = 0.25%" on the amount transferred (https://curlec.com/docs/payments/route/transfer-fees-example/). There is no per-payout or monthly fee. |

Batching: **[U]**. No per-settlement fee is documented, so batching probably saves nothing. [I]

## 6. Licensing: who is the regulated party

### Stripe

Malaysia regional terms in the Stripe Payments Terms:

- "15.1 No Banking or Remittance Services. Stripe does not offer banking or remittance services regulated by Bank Negara Malaysia."
- "5.1 Safeguarding of Funds … Stripe safeguards funds Stripe holds for User as required by Law."
- Source: https://stripe.com/en-my/legal/ssa-services-terms

Payment Terms, card section: "User must not act as or hold itself out as a payment facilitator, intermediary or aggregator, or otherwise resell the Stripe Payments Services."

**[U]** No page I fetched states Stripe's BNM registration, or that Connect platforms need no licence. **[I]** The no-remittance clause is a warning against treating Connect as a licensed transfer service. Ask Stripe and a lawyer.

### Curlec

- Funds are held by Curlec: "'Escrow Account' or 'Nodal Account' is an account held by Razorpay Curlec with an Escrow Bank or nodal bank … for the purpose of receiving the Transaction Amount and effecting settlements to You." https://curlec.com/s/terms-of-use/
- The footer shows "Regulated by:" with a Bank Negara logo (alt text "Bank Negara"). https://curlec.com/pricing/
- **[U]** Curlec's licence type. BNM's registered merchant acquirer page returned only a redirect stub.
- The terms are written for "Payment Aggregation Services". [I] Curlec is the aggregator, and Tapiro is its merchant.

## 7. Expo / React Native

**Stripe SDK on Expo SDK 57**

- "Android, iOS, Included in Expo Go". Install with `bun expo install @stripe/stripe-react-native`. https://docs.expo.dev/versions/v57.0.0/sdk/stripe/
- Redirect methods need `urlScheme` in `initStripe`.
- "If you're using Expo, set your scheme in the `app.json` file." https://docs.stripe.com/payments/alipay/accept-a-payment.md?payment-ui=mobile&platform=react-native

**PaymentSheet (Mobile Payment Element) support**

| Method  | Mobile Payment Element |
| ------- | ---------------------- |
| FPX     | ✓ Supported            |
| Alipay  | ✓ Supported            |
| GrabPay | **"- Unsupported"**    |

Source: https://docs.stripe.com/payments/payment-methods/payment-method-support

- FPX mobile: "integrate with the Mobile Payment Element … You can choose between Android, iOS, and React Native." https://docs.stripe.com/payments/fpx/accept-a-payment.md?payment-ui=mobile
- Alipay React Native: return URL is "`myapp://safepay/`". https://docs.stripe.com/payments/alipay/accept-a-payment.md?payment-ui=mobile&platform=react-native

**Onboarding helpers on mobile**

- Hosted: "Stripe-hosted onboarding is only supported in web browsers. You can't use it in embedded web views". The iOS sample uses `SFSafariViewController`. Account Links are single-use and expire after "a few minutes". https://docs.stripe.com/connect/hosted-onboarding
- Embedded, in React Native:
  - `ConnectComponentsProvider` and `ConnectAccountOnboarding` from `@stripe/stripe-react-native`;
  - install command `npm install @stripe/stripe-react-native react-native-webview`;
  - "Some behavior … must be presented in an authenticated WebView." https://docs.stripe.com/connect/get-started-connect-embedded-components.md?platform=react-native
- The React Native components are "Account onboarding", "Payments" and "Payouts". https://docs.stripe.com/connect/supported-embedded-components.md?platform=react-native
- **[U]** Whether `react-native-webview` is compatible with Expo SDK 57.

**Curlec**

- The React Native SDK is `react-native-razorpay`, with "for expo $ npx expo install react-native-razorpay". https://curlec.com/docs/payments/payment-gateway/react-native-integration/standard/integration-steps-ios/
- Route supports iOS Standard Checkout. https://curlec.com/docs/payments/route/
- There is no self-serve onboarding UI for linked accounts; it goes through support (section 2).

---

## Verdict

| #   | Question                                       | Stripe Connect                                                                              | Curlec Route                                                                |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 0   | Founder entity (student pass, no SSM)          | **Blocked** for the founder alone; needs a Sdn Bhd with a resident director                 | **Blocked** for the founder alone; needs SSM                                |
| 1   | Platform eligibility (MY entity)               | **Unknown, ask sales**: MY to MY has a data gap                                             | **Works** with an SSM entity                                                |
| 1b  | Non-MY platform paying MY individuals          | **Blocked**                                                                                 | **Unknown, ask sales** (likely blocked)                                     |
| 2   | Foreign student onboarding (passport, no NRIC) | **Unknown, ask sales**: passport accepted as a document, but `my_nric` is the only ID field | **Unknown, ask sales**                                                      |
| 3   | P2P errand marketplace allowed                 | **Works** (not prohibited); pre-approval **Unknown**                                        | **Works** (not prohibited); "friend finders" risk                           |
| 4   | Hold until completion, weekly payout           | **Works**: destination charge + manual payouts, max 90 days; platform bears disputes        | **Works**: `on_hold` / `on_hold_until`; max hold **Unknown**                |
| 5   | Fees                                           | **Works but costly** (3% + RM1 plus RM6/active month plus 0.25% + RM1.50/payout)            | **Works, cheaper** (1.2–2.7% plus 0.25%)                                    |
| 6   | Provider is the regulated party                | **Unknown, ask sales/lawyer**: "does not offer banking or remittance services"              | **Unknown**: Curlec is the aggregator; licence type [U]                     |
| 7   | Expo SDK and mobile onboarding                 | **Works**: PaymentSheet for cards, FPX and Alipay (not GrabPay); embedded RN onboarding     | **Works** for checkout; linked-account onboarding is manual through support |

## Questions for Stripe sales (Malaysia)

1. Can a Malaysia-based Connect platform onboard **Malaysian** individual connected accounts? The docs endpoint for `platformCountry=MY` does not list MY as an account country.
2. Can a non-citizen individual without an NRIC (student pass, passport only) complete `individual.id_number` (`my_nric`)? What value is accepted?
3. Must the payout bank account be in the connected account holder's own name? Is ownership verified in MY?
4. Can a Connect platform account in MY be an individual? Or must it be a company or SSM-registered business? Is a BRN mandatory for the platform when FPX runs on destination charges?
5. Does a P2P errand and gig marketplace (moving help, parcel pickup, tutoring, accompaniment to clinics) need pre-approval? Which MCC applies?
6. Is DuitNow, Touch 'n Go or ShopeePay available for MY platforms? At what price? Is GrabPay coming to the Mobile Payment Element?
7. Is the `alipay_payments` private preview needed when Alipay runs on destination charges without `on_behalf_of`?
8. Is the 90-day manual-payout limit enforced per charge or per balance? Is Accounts v2 `recipient` with `dashboard: express` available for MY?
9. Which Stripe entity holds funds for MY Connect, under which BNM registration? Does Stripe's role mean the platform needs no BNM registration of its own?
10. Is funds segregation, or any other non-platform holding state, available in MY?

## Questions for Curlec sales

1. Can a linked account be an individual who is a foreign student on a passport (no MyKad)? What KYC does Curlec perform on it?
2. Must the linked account's bank account be in the individual's own name?
3. Can linked accounts be created by API, self-serve? Or only through support as the docs say? Is there a hosted KYC flow for helpers?
4. What is the maximum `on_hold` duration for a transfer?
5. Can a company registered outside Malaysia (HK, SG, CN) be a Curlec merchant? What does "My Business is not registered with SSM" accept?
6. Is a P2P errand marketplace acceptable? Do companion or "accompany" tasks fall under the "friend finders" restriction?
7. What is Curlec's BNM licence or registration for payment aggregation and Route? Does Route need any registration by the platform?
8. Does the React Native SDK show Alipay+, DuitNow and TNG in Standard Checkout on iOS? Is Expo SDK 57 supported?
9. Does any per-settlement fee exist for linked accounts, and does batching settlements weekly change cost?
10. Which Route API fields apply in Malaysia? The docs show PAN and GST.
