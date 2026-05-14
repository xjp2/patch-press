import { Mail } from 'lucide-react';

interface TermsOfServicePageProps {
  onBack: () => void;
  brandName?: string;
  contactEmail?: string;
}

export function TermsOfServicePage({ onBack, brandName = 'Patch & Press', contactEmail = 'legal@patchpress.com' }: TermsOfServicePageProps) {
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
          <h1 className="font-heading text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-white/80">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">1. Agreement to Terms</h2>
            <p className="text-ink/60 leading-relaxed">
              By accessing or using {brandName}'s website and services, you agree to be bound by these Terms of Service. 
              If you disagree with any part of these terms, you may not access our services.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">2. Description of Services</h2>
            <p className="text-ink/60 leading-relaxed">
              {brandName} provides a platform for designing and purchasing custom embroidered accessories. 
              Our services include:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2 mt-4">
              <li>Online design tool for customizing products with patches</li>
              <li>E-commerce platform for purchasing custom products</li>
              <li>Order management and tracking</li>
              <li>Customer support services</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">3. Account Registration</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              To use certain features of our services, you may need to create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update your account information if changes occur</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">4. Orders and Payment</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              When you place an order through our website:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li>You agree to pay all charges at the prices displayed at checkout</li>
              <li>You authorize us to charge your selected payment method</li>
              <li>All payments are processed securely through Stripe</li>
              <li>Prices are subject to change without notice</li>
              <li>We reserve the right to refuse or cancel any order</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">5. Intellectual Property</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              <strong>Our Content:</strong> All content on our website, including text, graphics, logos, images, 
              and software, is the property of {brandName} and is protected by copyright and other intellectual property laws.
            </p>
            <p className="text-ink/60 leading-relaxed mb-4">
              <strong>Your Designs:</strong> You retain ownership of designs you create using our tool. 
              By using our services, you grant us a license to use your designs solely for the purpose of 
              fulfilling your order.
            </p>
            <p className="text-ink/60 leading-relaxed">
              <strong>Prohibited Content:</strong> You may not use our services to create designs that:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2 mt-4">
              <li>Infringe on third-party intellectual property rights</li>
              <li>Contain hate speech, violence, or illegal content</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">6. Prohibited Activities</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li>Use our services for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt our services</li>
              <li>Harvest or collect user information without consent</li>
              <li>Use automated means to access our services</li>
              <li>Resell or redistribute our products without authorization</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">7. Limitation of Liability</h2>
            <p className="text-ink/60 leading-relaxed">
              To the maximum extent permitted by law, {brandName} shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
              whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible 
              losses resulting from your use of our services.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-ink/60 leading-relaxed">
              Our services are provided "as is" and "as available" without any warranties of any kind, 
              either express or implied. We do not warrant that our services will be uninterrupted, 
              timely, secure, or error-free.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">9. Indemnification</h2>
            <p className="text-ink/60 leading-relaxed">
              You agree to indemnify and hold harmless {brandName}, its officers, directors, employees, 
              and agents from any claims, damages, losses, liabilities, and expenses arising out of or 
              relating to your use of our services or violation of these Terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">10. Governing Law</h2>
            <p className="text-ink/60 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
              where {brandName} is established, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">11. Changes to Terms</h2>
            <p className="text-ink/60 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of any changes by 
              posting the new Terms on this page and updating the "Last updated" date. Your continued use 
              of our services after any changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">12. Contact Information</h2>
            <p className="text-ink/60 leading-relaxed mb-6">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="bg-cardstock rounded-xl p-6">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-craft-mint" />
                <span className="text-ink/70">{contactEmail}</span>
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

export default TermsOfServicePage;
