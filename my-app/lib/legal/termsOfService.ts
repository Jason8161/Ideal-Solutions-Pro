import { composeFullAddress, type CompanyProfile } from "@/lib/profileStorage";

export const TERMS_OF_SERVICE_VERSION = "2026-05-24";

function contactBlock(profile: Partial<CompanyProfile> | null | undefined): {
  phone: string;
  address: string;
} {
  const phone = profile?.phoneNumber?.trim() || profile?.mobilePhone?.trim();
  const address =
    profile?.companyAddress?.trim() ||
    composeFullAddress(
      profile?.companyStreet ?? "",
      profile?.companyCity ?? "",
      profile?.companyState ?? "",
      profile?.companyZip ?? "",
    ).trim();

  return {
    phone: phone || "[Insert Company Phone Number]",
    address: address || "[Insert Business Address]",
  };
}

export function getTermsOfServiceText(profile?: Partial<CompanyProfile> | null): string {
  const { phone, address } = contactBlock(profile);
  const profileNote =
    phone.startsWith("[") || address.startsWith("[")
      ? "\n\n(Update your phone and address under Settings → User info.)"
      : "";

  return `TERMS OF SERVICE
Ideal Solutions Pro
Effective Date: May 24, 2026

These Terms of Service ("Terms") govern your access to and use of the Ideal Solutions Pro mobile application, website, software platform, and related services ("Services") operated by Ideal Electrical Solutions LLC ("Company," "we," "our," or "us").

By accessing or using the Services, you agree to be bound by these Terms.

1. ELIGIBILITY

You must be at least 18 years old and legally authorized to enter into binding agreements to use the Services.

By using the Services, you represent and warrant that:
• You are authorized to use the Services on behalf of your company or employer;
• All information provided is accurate and complete;
• You will comply with all applicable laws and regulations.

2. SERVICES PROVIDED

Ideal Solutions Pro provides contractor workforce management tools, including but not limited to:
• Employee management
• Dispatch and scheduling
• Workforce communication
• Job management
• File and document storage
• AI-powered operational tools
• Mobile workforce tracking features

Features may be modified, updated, suspended, or discontinued at any time without notice.

3. USER ACCOUNTS

Users are responsible for:
• Maintaining account confidentiality;
• Protecting login credentials;
• All activity occurring under their account.

You agree to notify us immediately of any unauthorized use or security breach.

We reserve the right to suspend or terminate accounts at our sole discretion.

4. EMPLOYEE DATA & DOCUMENTS

The Services may collect and store sensitive employee information, including:
• Tax documents
• Identification documents
• Employment records
• Signatures
• Contact information

Users are solely responsible for:
• Obtaining proper employee consent;
• Ensuring lawful collection of employee data;
• Compliance with federal, state, and local employment laws.

The Company is not responsible for misuse of employee data by customers or third parties.

5. ACCEPTABLE USE

You agree NOT to:
• Use the Services for unlawful purposes;
• Upload malicious code or harmful content;
• Attempt unauthorized access to systems or data;
• Interfere with platform operations;
• Violate privacy or employment laws;
• Misrepresent employment or payroll information.

We reserve the right to remove content or terminate accounts violating these Terms.

6. SUBSCRIPTIONS & PAYMENTS

Certain features may require paid subscriptions.

By subscribing, you agree:
• To pay all applicable fees;
• That subscription fees may recur automatically;
• That pricing may change with reasonable notice.

Failure to pay may result in suspension or termination of Services.

All fees are non-refundable unless required by law.

7. DIGITAL SIGNATURES

Users acknowledge that electronic signatures submitted through the Services are legally binding to the fullest extent permitted by law.

Users are responsible for ensuring signatures comply with applicable employment and legal requirements.

8. DATA STORAGE & SECURITY

We implement commercially reasonable security measures to protect user data.

However, no system is completely secure.

By using the Services, you acknowledge and accept:
• Risks associated with cloud storage;
• Risks of electronic communications;
• Risks of unauthorized access beyond our reasonable control.

Users are responsible for maintaining secure devices and passwords.

9. THIRD-PARTY SERVICES

The Services may integrate with third-party platforms including:
• SMS providers
• Payment processors
• Cloud storage services
• Mapping/navigation services

We are not responsible for third-party systems, outages, or policies.

Use of third-party services is subject to their own terms and privacy policies.

10. INTELLECTUAL PROPERTY

All software, content, logos, branding, graphics, and platform materials are owned by Ideal Electrical Solutions LLC or its licensors.

Users may not:
• Copy
• Reverse engineer
• Modify
• Redistribute
• Resell
• License

any portion of the Services without written permission.

11. DISCLAIMERS

The Services are provided "AS IS" and "AS AVAILABLE" without warranties of any kind.

We do not guarantee:
• Uninterrupted service;
• Error-free operation;
• Specific business outcomes;
• Legal compliance for customer workflows.

Users assume full responsibility for use of the platform.

12. LIMITATION OF LIABILITY

To the maximum extent permitted by law, Ideal Electrical Solutions LLC shall not be liable for:
• Indirect damages;
• Lost profits;
• Data loss;
• Employment disputes;
• Payroll errors;
• Government penalties;
• Unauthorized access;
• Service interruptions.

Total liability shall not exceed the amount paid by the user during the previous 12 months.

13. INDEMNIFICATION

Users agree to indemnify and hold harmless Ideal Electrical Solutions LLC from any claims, damages, liabilities, or expenses arising from:
• Use of the Services;
• Violation of these Terms;
• Employment-related disputes;
• Data misuse;
• Regulatory violations.

14. TERMINATION

We reserve the right to suspend or terminate access to the Services at any time for:
• Violations of these Terms;
• Security concerns;
• Fraudulent activity;
• Non-payment.

Users may discontinue use at any time.

15. GOVERNING LAW

These Terms shall be governed by the laws of the State of Florida, without regard to conflict of law principles.

Any disputes shall be resolved in the courts located in Florida.

16. CHANGES TO TERMS

We may update these Terms at any time.

Continued use of the Services after changes constitutes acceptance of the revised Terms.

17. CONTACT INFORMATION

Ideal Electrical Solutions LLC
Ideal Solutions Pro
Email: support@idealsolutionspro.com
Phone: ${phone}
Address: ${address}${profileNote}

By using Ideal Solutions Pro, you acknowledge that you have read, understood, and agreed to these Terms of Service.`;
}
