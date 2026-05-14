import { Mail, MapPin } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
  brandName?: string;
  contactEmail?: string;
}

export function PrivacyPolicyPage({ onBack, brandName = 'Patch & Press', contactEmail = 'privacy@patchpress.com' }: PrivacyPolicyPageProps) {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <div className="bg-gradient-to-r from-craft-mint to-[#f48fb1] text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <button 
            onClick={onBack}
            className="text-white/80 hover:text-white mb-4 flex items-center gap-2 transition-colors"
          >
            ← Back to Home
          </button>
          <h1 className="font-heading text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-white/80">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">1. Introduction</h2>
            <p className="text-ink/60 leading-relaxed">
              Welcome to {brandName}. We respect your privacy and are committed to protecting your personal data. 
              This Privacy Policy explains how we collect, use, store, and protect your information when you use our website and services.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">2. Information We Collect</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              We collect the following types of information:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li><strong>Personal Information:</strong> Name, email address, shipping address, phone number</li>
              <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store card details)</li>
              <li><strong>Account Information:</strong> Login credentials, profile preferences</li>
              <li><strong>Design Data:</strong> Custom designs you create using our design tool</li>
              <li><strong>Usage Data:</strong> IP address, browser type, pages visited, time spent on site</li>
              <li><strong>Cookie Data:</strong> Information collected through cookies and similar technologies</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">3. How We Use Your Information</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              We use your information for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li>Process and fulfill your orders</li>
              <li>Communicate with you about your orders and account</li>
              <li>Provide customer support</li>
              <li>Improve our website and services</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Comply with legal obligations</li>
              <li>Prevent fraud and ensure security</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">4. Data Storage and Security</h2>
            <p className="text-ink/60 leading-relaxed">
              Your data is stored securely using Supabase's infrastructure with industry-standard encryption. 
              We implement appropriate technical and organizational measures to protect your personal data against 
              unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">5. Third-Party Services</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li><strong>Stripe:</strong> For secure payment processing</li>
              <li><strong>Supabase:</strong> For database and authentication services</li>
              <li><strong>Apple Sign-In:</strong> For optional authentication</li>
            </ul>
            <p className="text-ink/60 leading-relaxed mt-4">
              These services have their own privacy policies and may collect information as governed by their terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">6. Your Rights</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Request transfer of your data</li>
              <li><strong>Objection:</strong> Object to processing of your data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">7. Cookies</h2>
            <p className="text-ink/60 leading-relaxed">
              We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, 
              and understand where our visitors are coming from. You can control cookies through your browser settings.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">8. Children's Privacy</h2>
            <p className="text-ink/60 leading-relaxed">
              Our services are not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children under 13. If you are a parent or guardian and believe your 
              child has provided us with personal information, please contact us.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">9. Changes to This Policy</h2>
            <p className="text-ink/60 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">10. Contact Us</h2>
            <p className="text-ink/60 leading-relaxed mb-6">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-cardstock rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-craft-mint" />
                <span className="text-ink/70">{contactEmail}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-craft-mint" />
                <span className="text-ink/70">{brandName} Headquarters</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-cardstock text-ink py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-ink/40 text-sm">
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PrivacyPolicyPage;
