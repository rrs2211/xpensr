// ─── LEGAL DOCUMENTS — ClaimX by RB ──────────────────────────────────────────
// Last updated: May 2026
// Review with counsel before going live with paying clients

export const COMPANY_NAME = "RB Finsol Private Limited";
export const APP_NAME = "ClaimX by RB";
export const CONTACT_EMAIL = "legal@rbshah.co.in";
export const SUPPORT_EMAIL = "support@rbshah.co.in";
export const WEBSITE = "claim-x-beta.vercel.app";
export const COUNTRY = "India";
export const EFFECTIVE_DATE = "1 June 2026";
export const GOVERNING_LAW = "Rajkot, Gujarat, India";

export const PRIVACY_POLICY = `
# Privacy Policy

**Effective Date:** ${EFFECTIVE_DATE}
**Last Updated:** May 2026

## 1. Who We Are

${COMPANY_NAME} ("we", "our", "us") operates ${APP_NAME} ("the Service"), a cloud-based expense management platform. Our registered office is in Rajkot, Gujarat, India.

**Data Controller:** ${COMPANY_NAME}
**Contact:** ${CONTACT_EMAIL}

---

## 2. What Data We Collect

### 2.1 Account & Identity Data
- Full name, email address, username, mobile number
- Role within your organisation (employee, manager, admin)
- Department and company affiliation
- Profile avatar/initials

### 2.2 Expense & Financial Data
- Expense claims (amounts, dates, categories, descriptions)
- Invoice and receipt images (uploaded by users)
- Trip details, budgets, and balances
- GST amounts and ITC eligibility flags
- Bank settlement records

### 2.3 Usage Data
- Login timestamps and session duration
- Feature usage and navigation patterns
- Device type, browser, and operating system
- IP address and approximate location

### 2.4 Communications Data
- In-app notifications and messages
- Email notifications (via Resend)
- WhatsApp notifications (via Interakt/Jio)

### 2.5 Cookies & Local Storage
- Authentication session tokens
- User preferences (dark mode, font size)
- Offline claim queue (temporary)

---

## 3. How We Use Your Data

| Purpose | Legal Basis |
|---------|-------------|
| Providing the expense management service | Contract performance |
| Processing and approving expense claims | Contract performance |
| Sending approval/rejection notifications | Legitimate interests |
| Generating settlement reports and PDFs | Contract performance |
| Preventing fraud and anomaly detection | Legitimate interests |
| Complying with tax/GST record-keeping requirements | Legal obligation |
| Improving the service | Legitimate interests |
| Responding to support queries | Legitimate interests |

---

## 4. Data Storage & Security

- **Primary Storage:** Supabase (PostgreSQL) hosted on AWS infrastructure
- **Invoice Storage:** Supabase Storage (encrypted at rest)
- **Location:** Data may be stored in servers located in the United States, European Union, or Singapore depending on Supabase infrastructure
- **Encryption:** TLS 1.2+ in transit; AES-256 at rest
- **Access Control:** Role-based access; employees see only their own data; managers see department data; admins see company data
- **Retention:** Active account data retained for duration of subscription + 7 years (for tax compliance); deleted on written request subject to legal obligations

---

## 5. Who We Share Data With

We do not sell your personal data. We share data only with:

| Third Party | Purpose | Location |
|-------------|---------|----------|
| Supabase Inc. | Database hosting | USA/EU |
| Anthropic PBC | AI invoice OCR processing | USA |
| Resend Inc. | Email notifications | USA |
| Interakt (Jio Haptik) | WhatsApp notifications | India |
| Vercel Inc. | Application hosting | USA/Global |
| Cloudflare Inc. | CDN and security | USA/Global |

All third-party processors are bound by data processing agreements. Anthropic processes invoice images only for OCR extraction; images are not retained for model training.

---

## 6. International Data Transfers

If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, your data may be transferred to countries outside those regions. We ensure appropriate safeguards through:
- Standard Contractual Clauses (SCCs) with processors
- Adequacy decisions where applicable
- Data Processing Agreements with all sub-processors

---

## 7. Your Rights

Depending on your location, you may have the right to:

**All users:**
- Access your personal data
- Correct inaccurate data (via Profile settings)
- Request deletion of your account (contact your Admin or us)
- Export your data (CSV export available)

**EU/UK users (GDPR/UK GDPR):**
- Data portability
- Object to processing
- Restrict processing
- Lodge a complaint with your supervisory authority

**California users (CCPA/CPRA):**
- Know what personal information is collected
- Delete personal information
- Opt-out of sale (we do not sell data)
- Non-discrimination for exercising rights

**Indian users (DPDP Act 2023):**
- Access and correction
- Erasure
- Grievance redressal (contact our Grievance Officer at ${CONTACT_EMAIL})

To exercise any right, email ${CONTACT_EMAIL}. We will respond within 30 days (15 days for Indian DPDP requests).

---

## 8. Children's Privacy

The Service is not directed to individuals under 18 years of age. We do not knowingly collect personal data from minors.

---

## 9. Invoice & Receipt Images

Invoice images uploaded through the Service are:
- Stored in encrypted storage with access limited to authorised users in your company
- Processed by Anthropic's Claude AI for data extraction only
- Never used to train AI models (as per Anthropic's data processing terms)
- Retained for the period your company subscription is active + 7 years for audit purposes

---

## 10. Cookies

See our Cookie Policy below for full details. We use:
- **Strictly necessary:** Authentication session tokens (cannot be disabled)
- **Functional:** User preferences (dark mode, font size)
- **No advertising or tracking cookies**

---

## 11. Changes to This Policy

We will notify you of material changes via email and in-app notification at least 30 days before they take effect. Continued use of the Service constitutes acceptance.

---

## 12. Contact & Grievance Officer

**${COMPANY_NAME}**
Rajkot, Gujarat — 360001, India
Email: ${CONTACT_EMAIL}
Grievance Officer (India): Same contact

For EU residents, our EU Representative contact is available on request.
`;

// ─────────────────────────────────────────────────────────────────────────────

export const TERMS_OF_SERVICE = `
# Terms of Service

**Effective Date:** ${EFFECTIVE_DATE}

## 1. Agreement

By accessing or using ${APP_NAME} ("the Service"), you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy. If you are using the Service on behalf of a company, you represent that you have authority to bind that company.

These Terms constitute a legally binding agreement between you and **${COMPANY_NAME}** ("we", "us").

---

## 2. The Service

${APP_NAME} is a cloud-based expense management platform that enables organisations to:
- Submit, approve, and track employee expense claims
- Manage travel budgets and trip settlements
- Process invoices using AI-powered OCR
- Generate financial reports and accounting exports

---

## 3. Accounts & Access

### 3.1 Company Accounts
A "Company Admin" account is created for each subscribing organisation. The Admin is responsible for:
- Creating and managing employee accounts
- Setting expense policies and approval rules
- Ensuring all users comply with these Terms

### 3.2 User Accounts
- Each user must have a unique username
- You are responsible for maintaining the confidentiality of your credentials
- Notify us immediately at ${SUPPORT_EMAIL} if you suspect unauthorised access
- You may not share credentials or allow others to access your account

### 3.3 Account Suspension
We reserve the right to suspend accounts that:
- Violate these Terms
- Submit fraudulent expense claims
- Engage in abuse of the platform

---

## 4. Acceptable Use

You agree NOT to:
- Submit false, fabricated, or inflated expense claims
- Upload documents that are not genuine business invoices
- Attempt to bypass approval workflows through technical means
- Reverse-engineer, decompile, or extract source code from the Service
- Use the Service to store or process data unrelated to expense management
- Violate any applicable law or regulation

---

## 5. Financial Data & Accuracy

- You are solely responsible for the accuracy of expense claims submitted
- Approval of a claim by a manager/admin does not constitute our endorsement of its accuracy
- We are not responsible for disputes between employers and employees regarding expense reimbursements
- The Service is a tool; financial decisions remain with your organisation

---

## 6. AI Features

The Service includes AI-powered invoice scanning (powered by Anthropic Claude):
- AI extraction is for convenience only; always verify extracted data before submitting
- We do not guarantee accuracy of AI-extracted information
- Invoice images are processed by Anthropic under their usage policies

---

## 7. Subscription & Payment

- Plans are as agreed at signup (Starter, Growth, Enterprise)
- Subscriptions auto-renew unless cancelled 30 days before renewal
- No refunds for partial periods unless required by applicable law
- We reserve the right to modify pricing with 60 days' notice

---

## 8. Data Ownership

- **You own your data.** We process it only to provide the Service.
- On termination, you may request a full data export within 30 days
- After 30 days post-termination, data is deleted (except where required by law)

---

## 9. Intellectual Property

- The Service, including all software, design, and content, is owned by ${COMPANY_NAME}
- You retain ownership of all data you submit
- You grant us a limited licence to process your data solely to provide the Service

---

## 10. Availability & Warranties

- We target 99.5% uptime but do not guarantee uninterrupted availability
- The Service is provided "as is" without warranty of fitness for a particular purpose
- We are not liable for losses caused by service downtime, data loss, or third-party failures

---

## 11. Limitation of Liability

To the maximum extent permitted by applicable law:
- Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim
- We are not liable for indirect, incidental, consequential, or punitive damages
- Nothing in these Terms limits liability for death, personal injury, or fraud

---

## 12. Indemnification

You agree to indemnify and hold harmless ${COMPANY_NAME} from claims arising from:
- Your use of the Service in violation of these Terms
- False or fraudulent expense claims submitted through your account
- Your violation of any third party's rights

---

## 13. Termination

- Either party may terminate with 30 days' written notice
- We may terminate immediately for material breach of these Terms
- On termination, your access ceases and data export window begins (30 days)

---

## 14. Governing Law & Disputes

These Terms are governed by the laws of India. Disputes shall be:
1. First attempted to be resolved through good-faith negotiation (30 days)
2. If unresolved, submitted to arbitration under the Arbitration and Conciliation Act, 1996, in Rajkot, Gujarat
3. For EU consumers: you may also use EU ODR platform at https://ec.europa.eu/consumers/odr

---

## 15. Changes to Terms

We will notify you 30 days before material changes take effect. Continued use constitutes acceptance.

---

## 16. Contact

${COMPANY_NAME}
Rajkot, Gujarat — 360001, India
Email: ${SUPPORT_EMAIL}
`;

// ─────────────────────────────────────────────────────────────────────────────

export const COOKIE_POLICY = `
# Cookie Policy

**Effective Date:** ${EFFECTIVE_DATE}

## What Are Cookies?

Cookies and similar technologies (localStorage, sessionStorage) are small files stored on your device that help the Service function correctly and remember your preferences.

---

## Cookies We Use

### Category 1: Strictly Necessary (Cannot be disabled)

| Name | Purpose | Duration |
|------|---------|----------|
| \`claimx_session\` | Keeps you logged in | Session / 30 days |
| \`claimx_logout\` | Prevents session restore during logout | Session only |
| \`sb-*\` | Supabase authentication tokens | Session / 7 days |

These cookies are essential for the Service to function. You cannot use the Service without them.

### Category 2: Functional (Can be disabled — functionality reduced)

| Name | Purpose | Duration |
|------|---------|----------|
| \`claimx_prefs_v1\` | Your display preferences (dark mode, font size) | 1 year |
| \`claimx_offline_queue\` | Temporarily queues claims when offline | Until submitted |
| \`claimx_db\` | Offline data cache | Session |

### Category 3: Analytics

We do not currently use analytics cookies. If we add them in future, we will update this policy and seek your consent.

### Category 4: Advertising

**We use no advertising or tracking cookies.** We do not participate in advertising networks.

---

## Third-Party Cookies

| Provider | Purpose |
|----------|---------|
| Supabase | Authentication (sb-* cookies) |

No other third-party cookies are set.

---

## Managing Cookies

**Browser settings:** You can block or delete cookies in your browser settings. Note that blocking strictly necessary cookies will prevent login.

**Preference cookies:** Toggle in your profile → Display Preferences.

**Clearing all cookies:** Use the Sign Out button, which clears all session data. Or manually clear localStorage from browser DevTools.

---

## Contact

For questions about our use of cookies: ${CONTACT_EMAIL}
`;

export const LEGAL_LAST_UPDATED = "May 2026";
