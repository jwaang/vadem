import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of service for using Vadem, the care manual platform for pet and house sitters.",
  alternates: {
    canonical: "https://vadem.app/terms",
  },
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="font-body text-sm text-text-muted mb-10">
          Last updated: February 23, 2026
        </p>

        <div className="prose-vadem">
          <Section title="Acceptance of terms">
            <p>
              By creating a Vadem account or using the service, you agree to
              these terms. If you do not agree, do not use Vadem. You must be at
              least 18 years old to create an account or use the service.
            </p>
          </Section>

          <Section title="What Vadem is">
            <p>
              Vadem is a web-based platform that lets you create care manuals
              for pet and house sitters, then share them via a unique link. The
              sitter view works in any browser without downloading an app or
              creating an account. Sitters who access a care manual via a shared
              link are also bound by these terms.
            </p>
          </Section>

          <Section title="Your account">
            <p>
              You are responsible for maintaining the security of your account
              credentials. You are responsible for all activity that occurs
              under your account, including content created and links shared.
              Notify us immediately if you suspect unauthorized access.
            </p>
          </Section>

          <Section title="Your content">
            <p>
              You retain ownership of all content you create on Vadem,
              including care instructions, photos, pet profiles, and vault
              items. By using the service, you grant us a limited,
              non-exclusive, royalty-free license to store, process, display,
              and transmit your content solely as needed to operate the
              service.
            </p>
            <p>
              You represent that you have the right to share any content you
              upload, including photos and personal information about other
              people (such as emergency contacts or sitters). You are solely
              responsible for the accuracy of your care instructions. Vadem is
              a communication tool and does not verify the correctness of care
              instructions or assume responsibility for outcomes.
            </p>
            <p>
              We reserve the right to remove any content that violates these
              terms or that we reasonably believe is harmful, misleading, or
              unlawful.
            </p>
          </Section>

          <Section title="Sitter links and access">
            <p>
              When you generate a sitter link, anyone with that link can view
              your care manual (excluding encrypted vault items, which require
              phone verification). You are responsible for sharing links only
              with intended recipients. You can revoke access at any time by
              regenerating the link.
            </p>
          </Section>

          <Section title="Vault items">
            <p>
              Vault items are encrypted client-side before storage. Vadem
              cannot access or recover plaintext vault values. If you lose
              access to your encryption keys or account, we cannot recover
              vault data for you. Vault access requires SMS phone verification
              and auto-expires at the end of your trip. You are responsible for
              keeping vault contents accurate and up to date.
            </p>
          </Section>

          <Section title="Intellectual property">
            <p>
              The Vadem name, logo, design, and all software, code, and
              documentation are owned by Vadem and protected by applicable
              intellectual property laws. These terms do not grant you any
              rights to our trademarks, branding, or proprietary technology.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>You agree not to:</p>
            <ul>
              <li>Use Vadem for any unlawful purpose</li>
              <li>
                Upload content you do not have the right to share, including
                photos of people without their consent
              </li>
              <li>Attempt to access other users&apos; accounts or data</li>
              <li>
                Reverse engineer, decompile, or otherwise attempt to extract
                source code
              </li>
              <li>
                Use automated systems to scrape or extract data from the
                service
              </li>
              <li>
                Abuse the SMS verification system (excessive requests,
                harassment via verification codes)
              </li>
              <li>Upload malicious content or files</li>
              <li>Impersonate another person or entity</li>
            </ul>
          </Section>

          <Section title="Service availability">
            <p>
              We aim to keep Vadem available at all times, but we do not
              guarantee uninterrupted service. We may perform maintenance,
              updates, or experience outages. We may also modify, suspend, or
              discontinue any part of the service at any time. We are not
              liable for any loss resulting from service interruptions or
              changes.
            </p>
          </Section>

          <Section title="Pricing">
            <p>
              Vadem is currently free during early access. We reserve the
              right to introduce paid features or change pricing at any time.
              We will provide reasonable advance notice before any changes that
              would affect your existing use of the service.
            </p>
          </Section>

          <Section title="Disclaimer of warranties">
            <p>
              Vadem is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, whether express
              or implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, and
              non-infringement. We do not warrant that the service will be
              uninterrupted, error-free, or secure.
            </p>
            <p>
              Vadem is a communication tool. We do not verify the accuracy of
              care instructions, medication details, or other content you
              create. You are solely responsible for the information you
              provide to your sitters and for any outcomes that result from
              that information.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              To the maximum extent permitted by applicable law, Vadem and its
              officers, employees, and agents shall not be liable for any
              indirect, incidental, special, consequential, or punitive
              damages, including but not limited to loss of data, loss of
              revenue, or damages arising from pet injury, property damage, or
              any outcomes related to care instructions shared through the
              service.
            </p>
            <p>
              Our total aggregate liability for all claims arising out of or
              relating to the service is limited to the amount you have
              actually paid us in the 12 months preceding the claim, or ten US
              dollars ($10), whichever is less.
            </p>
          </Section>

          <Section title="Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless Vadem and its
              officers, employees, and agents from any claims, damages,
              losses, liabilities, and expenses (including reasonable legal
              fees) arising out of or related to: your use of the service,
              your content, your violation of these terms, or any harm caused
              to a third party as a result of care instructions or information
              you shared through Vadem.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              You may delete your account at any time. We may suspend or
              terminate your account at our discretion, with or without cause,
              with or without notice. We will make reasonable efforts to
              provide notice when possible. Upon termination, your data will
              be deleted in accordance with our privacy policy.
            </p>
            <p>
              The following sections survive termination: Your Content,
              Intellectual Property, Disclaimer of Warranties, Limitation of
              Liability, Indemnification, Governing Law, and this section.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              We may update these terms from time to time. We will notify you
              of material changes via email or an in-app notice. Continued use
              of the service after changes constitutes acceptance. If you do
              not agree to the updated terms, you should stop using the
              service and delete your account.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These terms are governed by the laws of the United States. Any
              disputes will be resolved in the courts of the state where Vadem
              is headquartered.
            </p>
          </Section>

          <Section title="Severability">
            <p>
              If any provision of these terms is found to be unenforceable or
              invalid, that provision will be limited or eliminated to the
              minimum extent necessary, and the remaining provisions will
              remain in full force and effect.
            </p>
          </Section>

          <Section title="Entire agreement">
            <p>
              These terms, together with the privacy policy, constitute the
              entire agreement between you and Vadem regarding the service and
              supersede any prior agreements.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these terms? Email us at{" "}
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
              href="/privacy"
              className="font-body text-sm text-text-muted hover:text-text-primary transition-colors duration-150"
            >
              Privacy
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
