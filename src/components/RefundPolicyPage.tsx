import { RefreshCcw, Clock, Package, Mail, AlertCircle } from 'lucide-react';

interface RefundPolicyPageProps {
  onBack: () => void;
  brandName?: string;
  contactEmail?: string;
}

export function RefundPolicyPage({ onBack, brandName = 'Patch & Press', contactEmail = 'support@patchpress.com' }: RefundPolicyPageProps) {
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
          <h1 className="font-heading text-4xl font-bold mb-4">Refund & Return Policy</h1>
          <p className="text-white/80">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Overview Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-craft-mint/5 rounded-xl p-6 text-center">
            <Clock className="w-8 h-8 text-craft-mint mx-auto mb-3" />
            <h3 className="font-bold text-ink mb-1">14-Day Returns</h3>
            <p className="text-sm text-ink/60">From date of delivery</p>
          </div>
          <div className="bg-craft-mint/5 rounded-xl p-6 text-center">
            <Package className="w-8 h-8 text-craft-mint mx-auto mb-3" />
            <h3 className="font-bold text-ink mb-1">Custom Items</h3>
            <p className="text-sm text-ink/60">Made-to-order products</p>
          </div>
          <div className="bg-craft-mint/5 rounded-xl p-6 text-center">
            <RefreshCcw className="w-8 h-8 text-craft-mint mx-auto mb-3" />
            <h3 className="font-bold text-ink mb-1">Store Credit</h3>
            <p className="text-sm text-ink/60">For custom design issues</p>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">1. Overview</h2>
            <p className="text-ink/60 leading-relaxed">
              At {brandName}, we take pride in creating high-quality custom accessories. Because each item 
              is made-to-order with your unique design, our return policy differs from standard retail. 
              Please read this policy carefully before placing your order.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">2. Return Eligibility</h2>
            
            <div className="bg-craft-mint/10 border border-ink/10 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                <RefreshCcw className="w-5 h-5" />
                We Accept Returns For:
              </h3>
              <ul className="list-disc pl-6 text-green-700 space-y-2">
                <li><strong>Manufacturing defects:</strong> Stitching errors, material flaws, or construction issues</li>
                <li><strong>Wrong item shipped:</strong> Product doesn't match your order</li>
                <li><strong>Damaged in transit:</strong> Item arrived damaged due to shipping</li>
                <li><strong>Design errors by us:</strong> We placed patches in wrong locations vs. your design</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                We Cannot Accept Returns For:
              </h3>
              <ul className="list-disc pl-6 text-amber-700 space-y-2">
                <li><strong>Change of mind:</strong> Custom items cannot be returned for buyer's remorse</li>
                <li><strong>Design choices:</strong> Colors, patch placement, or design decisions you made</li>
                <li><strong>Sizing expectations:</strong> Please check dimensions before ordering</li>
                <li><strong>Minor variations:</strong> Slight color differences due to screen calibration</li>
                <li><strong>Personalized items:</strong> Items with names, dates, or custom text</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">3. Return Process</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-craft-mint text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-ink">Contact Us Within 14 Days</h4>
                  <p className="text-ink/60">Email us at {contactEmail} with your order number and photos of the issue.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-craft-mint text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-ink">Review & Approval</h4>
                  <p className="text-ink/60">Our team will review your request within 2-3 business days and respond with next steps.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-craft-mint text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-ink">Return Shipping (if approved)</h4>
                  <p className="text-ink/60">For approved returns, we'll provide a prepaid shipping label or reimburse your return shipping.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-craft-mint text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                <div>
                  <h4 className="font-bold text-ink">Refund or Replacement</h4>
                  <p className="text-ink/60">Once we receive the item, we'll process your refund or ship a replacement within 5 business days.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">4. Refund Options</h2>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-ink/10">
                  <th className="py-3 font-bold text-ink">Situation</th>
                  <th className="py-3 font-bold text-ink">Refund Method</th>
                  <th className="py-3 font-bold text-ink">Timeframe</th>
                </tr>
              </thead>
              <tbody className="text-ink/60">
                <tr className="border-b border-ink/10">
                  <td className="py-3">Manufacturing defect</td>
                  <td className="py-3">Full refund or replacement</td>
                  <td className="py-3">5-7 business days</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="py-3">Wrong item shipped</td>
                  <td className="py-3">Full refund + free replacement</td>
                  <td className="py-3">5-7 business days</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="py-3">Damaged in transit</td>
                  <td className="py-3">Full refund or replacement</td>
                  <td className="py-3">5-7 business days</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="py-3">Design error by us</td>
                  <td className="py-3">Store credit or replacement</td>
                  <td className="py-3">5-7 business days</td>
                </tr>
                <tr>
                  <td className="py-3">Order cancellation (before production)</td>
                  <td className="py-3">Full refund</td>
                  <td className="py-3">3-5 business days</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">5. Order Cancellation</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              You may cancel your order for a full refund if:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li>You cancel within 2 hours of placing the order, OR</li>
              <li>Your order has not yet entered production status</li>
            </ul>
            <p className="text-ink/60 leading-relaxed mt-4">
              Once production begins, orders cannot be cancelled as the custom item is already being made. 
              Check your order status in your account dashboard.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">6. Non-Returnable Items</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              The following items are final sale and cannot be returned:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li>Gift cards</li>
              <li>Sale or clearance items marked "Final Sale"</li>
              <li>Items without original packaging</li>
              <li>Items showing signs of wear or use</li>
              <li>Items returned after 14 days from delivery</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">7. Late or Missing Refunds</h2>
            <p className="text-ink/60 leading-relaxed">
              If you haven't received your refund after 10 business days:
            </p>
            <ol className="list-decimal pl-6 text-ink/60 space-y-2 mt-4">
              <li>Check your bank account again</li>
              <li>Contact your credit card company (refunds may take time to post)</li>
              <li>Contact your bank (processing times vary)</li>
              <li>If you've done all this and still haven't received your refund, contact us at {contactEmail}</li>
            </ol>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">8. Contact Us</h2>
            <p className="text-ink/60 leading-relaxed mb-6">
              Have questions about returns? We're here to help!
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

export default RefundPolicyPage;
