import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Vadem collects, uses, and protects your personal information. Learn about our data practices for pet and house sitter care manuals.",
  alternates: {
    canonical: "https://vadem.app/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-bg">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-block font-display text-2xl text-primary mb-10"
        >
          Vadem
        </Link>

        <h1 className="font-display text-4xl text-text-primary mb-2">
          Privacy Policy
        </h1>
        <p className="font-body text-sm text-text-muted mb-10">
          Last updated: February 23, 2026
        </p>

        <div className="prose-vadem">
          <Section title="What we collect">
            <p>
              When you create a Vadem account, we collect your email address
              and authentication credentials. If you sign in with Google or
              Apple, we receive your name and email from the provider but not
              your password.
            </p>
            <p>
              When you build a care manual, we store the content you provide:
              property details, pet profiles, care instructions, photos,
              emergency contacts, and vault items.
            </p>
            <p>
              For sitters who verify their phone number to access vault items,
              we collect the phone number solely for SMS verification. We do
              not use it for marketing.
            </p>
            <p>
              We also automatically collect technical information when you use
              the service, including IP address, browser type, device type,
              operating system, and pages visited. This data is collected via
              server logs and is used for security, debugging, and service
              improvement. We do not use third-party analytics or tracking
              tools.
            </p>
          </Section>

          <Section title="How we use your data">
            <p>We use your data to:</p>
            <ul>
              <li>Provide and operate the Vadem service</li>
              <li>
                Share your care manual with sitters via the link you generate
              </li>
              <li>Send SMS verification codes for vault access</li>
              <li>
                Send push notifications you opt into (task completions, vault
                access)
              </li>
              <li>
                Detect and prevent fraud, abuse, and security incidents
              </li>
              <li>Improve the service based on usage patterns</li>
            </ul>
            <p>
              We do not sell your personal information. We do not use your data
              for advertising. We do not build advertising profiles based on
              your activity.
            </p>
          </Section>

          <Section title="Vault encryption">
            <p>
              Vault items (door codes, WiFi passwords, alarm codes) are
              encrypted client-side with AES-256-GCM before being stored. Our
              servers never receive or store plaintext vault values. Sitters
              must verify their phone number via SMS to decrypt vault items,
              and access auto-expires when your trip ends.
            </p>
            <p>
              Because encryption happens on your device, we cannot recover
              vault data if you lose access to your account.
            </p>
          </Section>

          <Section title="Data sharing">
            <p>
              Your care manual content is shared only with people who have
              your unique sitter link. You can regenerate this link at any
              time to revoke all existing access.
            </p>
            <p>
              We use third-party service providers for hosting, data storage,
              SMS verification, and authentication. These providers process
              your data only as necessary to operate the Vadem service and are
              bound by their own privacy policies.
            </p>
            <p>
              We may disclose your information if required to do so by law, or
              if we believe in good faith that disclosure is necessary to
              comply with a legal obligation, protect our rights or safety, or
              investigate potential violations of our terms of service.
            </p>
          </Section>

          <Section title="International data transfers">
            <p>
              Vadem is operated from the United States. If you are accessing
              the service from outside the US, your data will be transferred
              to and processed in the United States. By using Vadem, you
              consent to this transfer. We take reasonable steps to ensure
              your data is treated securely and in accordance with this
              policy.
            </p>
          </Section>

          <Section title="Data retention">
            <p>
              Your account data and care manuals are stored as long as your
              account is active. Trip activity logs and vault access records
              are retained for the duration of your account. Sitter phone
              numbers used for vault verification are retained only for the
              duration of the associated trip and deleted afterward.
            </p>
            <p>
              You can delete your account and all associated data by
              contacting us. Upon deletion, we will remove your data from our
              active systems within 30 days. Some data may persist in
              encrypted backups for up to 90 days before being permanently
              deleted.
            </p>
          </Section>

          <Section title="Security">
            <p>
              We use industry-standard measures to protect your data,
              including encrypted connections (HTTPS/TLS), secure
              authentication, and access controls. Vault items receive
              additional protection through client-side encryption. However,
              no method of electronic storage or transmission is 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="Cookies and local storage">
            <p>
              We use a session cookie to keep you signed in. Sitter views use
              local storage and service worker caching for offline access. We
              do not use third-party tracking cookies or advertising cookies.
            </p>
          </Section>

          <Section title="Your rights">
            <p>You have the right to:</p>
            <ul>
              <li>
                Access the personal data we hold about you
              </li>
              <li>
                Request correction of inaccurate data
              </li>
              <li>
                Request deletion of your data
              </li>
              <li>
                Export your data in a portable format
              </li>
              <li>
                Opt out of non-essential communications
              </li>
            </ul>
            <p>
              To exercise any of these rights, email us at{" "}
              <a
                href="mailto:support@vadem.app"
                className="text-primary hover:text-primary-hover transition-colors duration-150"
              >
                support@vadem.app
              </a>
              . We will respond within 30 days.
            </p>
            <p>
              If you are in the EU, UK, or California, you have additional
              rights under GDPR, UK GDPR, or CCPA respectively, including the
              right to lodge a complaint with your local data protection
              authority.
            </p>
          </Section>

          <Section title="Children">
            <p>
              Vadem is not directed at children under 13. We do not knowingly
              collect personal information from children. If we become aware
              that we have collected data from a child under 13, we will
              delete it promptly. If you believe a child has provided us with
              personal information, please contact us.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this policy from time to time. We will notify you
              of material changes via email or an in-app notice. Continued use
              of the service after changes constitutes acceptance. We
              encourage you to review this policy periodically.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this privacy policy? Email us at{" "}
              <a
                href="mailto:support@vadem.app"
                className="text-primary hover:text-primary-hover transition-colors duration-150"
              >
                support@vadem.app
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-16 pt-8 border-t border-border-default">
          <nav className="flex items-center gap-5">
            <Link
              href="/"
              className="font-body text-sm text-text-muted hover:text-text-primary transition-colors duration-150"
            >
              Home
            </Link>
            <Link
              href="/terms"
              className="font-body text-sm text-text-muted hover:text-text-primary transition-colors duration-150"
            >
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-2xl text-text-primary mb-3">{title}</h2>
      <div className="font-body text-base text-text-secondary leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_li]:text-text-secondary">
        {children}
      </div>
    </section>
  );
}
