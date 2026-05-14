import { Truck, Clock, Globe, Package, Mail, MapPin } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface ShippingPolicyPageProps {
  onBack: () => void;
  brandName?: string;
  contactEmail?: string;
}

export function ShippingPolicyPage({ onBack, brandName = 'Patch & Press', contactEmail = 'support@patchpress.com' }: ShippingPolicyPageProps) {
  const { currencySymbol } = useCurrency();
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
          <h1 className="font-heading text-4xl font-bold mb-4">Shipping Policy</h1>
          <p className="text-white/80">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          <div className="bg-craft-mint/5 rounded-xl p-5 text-center">
            <Clock className="w-7 h-7 text-craft-mint mx-auto mb-2" />
            <h3 className="font-bold text-ink text-sm mb-1">Processing</h3>
            <p className="text-xs text-ink/60">3-5 business days</p>
          </div>
          <div className="bg-craft-mint/5 rounded-xl p-5 text-center">
            <Truck className="w-7 h-7 text-craft-mint mx-auto mb-2" />
            <h3 className="font-bold text-ink text-sm mb-1">Domestic</h3>
            <p className="text-xs text-ink/60">5-10 business days</p>
          </div>
          <div className="bg-craft-mint/5 rounded-xl p-5 text-center">
            <Globe className="w-7 h-7 text-craft-mint mx-auto mb-2" />
            <h3 className="font-bold text-ink text-sm mb-1">International</h3>
            <p className="text-xs text-ink/60">10-20 business days</p>
          </div>
          <div className="bg-craft-mint/5 rounded-xl p-5 text-center">
            <Package className="w-7 h-7 text-craft-mint mx-auto mb-2" />
            <h3 className="font-bold text-ink text-sm mb-1">Free Shipping</h3>
            <p className="text-xs text-ink/60">Orders over {currencySymbol}50</p>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">1. Processing Time</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              All orders are custom-made to your specifications. Our typical processing times are:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li><strong>Order Processing:</strong> 1-2 business days (verification and preparation)</li>
              <li><strong>Production Time:</strong> 3-5 business days (design, embroidery, quality check)</li>
              <li><strong>Total Before Shipping:</strong> 4-7 business days</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-blue-700 text-sm">
                <strong>Note:</strong> During peak seasons (holidays, sales events), processing may take an additional 2-3 business days.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">2. Shipping Methods & Rates</h2>
            
            <h3 className="text-xl font-semibold text-ink/80 mb-3">Domestic Shipping (United States)</h3>
            <table className="w-full text-left border-collapse mb-6">
              <thead>
                <tr className="border-b-2 border-ink/10">
                  <th className="py-3 font-bold text-ink">Method</th>
                  <th className="py-3 font-bold text-ink">Cost</th>
                  <th className="py-3 font-bold text-ink">Delivery Time</th>
                </tr>
              </thead>
              <tbody className="text-ink/60">
                <tr className="border-b border-ink/10">
                  <td className="py-3">Standard Shipping</td>
                  <td className="py-3">{currencySymbol}5.99 (FREE over {currencySymbol}50)</td>
                  <td className="py-3">5-10 business days</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="py-3">Expedited Shipping</td>
                  <td className="py-3">{currencySymbol}12.99</td>
                  <td className="py-3">3-5 business days</td>
                </tr>
                <tr>
                  <td className="py-3">Express Shipping</td>
                  <td className="py-3">{currencySymbol}24.99</td>
                  <td className="py-3">2-3 business days</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-xl font-semibold text-ink/80 mb-3">International Shipping</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-ink/10">
                  <th className="py-3 font-bold text-ink">Region</th>
                  <th className="py-3 font-bold text-ink">Cost</th>
                  <th className="py-3 font-bold text-ink">Delivery Time</th>
                </tr>
              </thead>
              <tbody className="text-ink/60">
                <tr className="border-b border-ink/10">
                  <td className="py-3">Canada</td>
                  <td className="py-3">{currencySymbol}12.99 (FREE over {currencySymbol}75)</td>
                  <td className="py-3">7-14 business days</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="py-3">Europe</td>
                  <td className="py-3">{currencySymbol}15.99 (FREE over {currencySymbol}100)</td>
                  <td className="py-3">10-20 business days</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="py-3">Australia/NZ</td>
                  <td className="py-3">{currencySymbol}18.99 (FREE over {currencySymbol}100)</td>
                  <td className="py-3">12-25 business days</td>
                </tr>
                <tr>
                  <td className="py-3">Rest of World</td>
                  <td className="py-3">{currencySymbol}24.99</td>
                  <td className="py-3">14-30 business days</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">3. Order Tracking</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              Once your order ships, you will receive an email with:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li>Tracking number</li>
              <li>Carrier information</li>
              <li>Link to track your package</li>
            </ul>
            <p className="text-ink/60 leading-relaxed mt-4">
              You can also track your order by logging into your account and viewing your order history.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">4. Shipping Restrictions</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              We currently do not ship to:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li>PO Boxes (physical addresses only)</li>
              <li>APO/FPO/DPO addresses</li>
              <li>Certain restricted countries due to customs regulations</li>
            </ul>
            <p className="text-ink/60 leading-relaxed mt-4">
              If you're unsure whether we ship to your location, please contact us before placing your order.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">5. Customs & Duties</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              <strong>International Orders:</strong> Please be aware that:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li>You are responsible for any customs fees, import duties, or taxes imposed by your country</li>
              <li>These charges are not included in your order total</li>
              <li>Customs policies vary by country; contact your local customs office for information</li>
              <li>Delivery times may be extended due to customs processing</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">6. Lost or Damaged Packages</h2>
            
            <h3 className="text-lg font-semibold text-ink/80 mb-2">Lost Packages</h3>
            <p className="text-ink/60 leading-relaxed mb-4">
              If your package hasn't arrived within the estimated delivery time:
            </p>
            <ol className="list-decimal pl-6 text-ink/60 space-y-2">
              <li>Check your tracking information for any delivery attempts</li>
              <li>Verify your shipping address</li>
              <li>Check with neighbors or building management</li>
              <li>Contact us after 5 days past the estimated delivery date</li>
            </ol>

            <h3 className="text-lg font-semibold text-ink/80 mb-2 mt-6">Damaged Packages</h3>
            <p className="text-ink/60 leading-relaxed mb-4">
              If your package arrives damaged:
            </p>
            <ol className="list-decimal pl-6 text-ink/60 space-y-2">
              <li>Take photos of the damaged packaging and contents immediately</li>
              <li>Contact us within 48 hours of delivery</li>
              <li>Keep all packaging materials for potential carrier inspection</li>
              <li>We will file a claim and send a replacement</li>
            </ol>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">7. Address Changes</h2>
            <p className="text-ink/60 leading-relaxed">
              We can only change shipping addresses if the order has not yet entered production. 
              Contact us immediately at {contactEmail} with your order number and correct address. 
              Once production begins, we cannot modify the shipping address.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">8. Delivery Issues</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              <strong>Failed Delivery Attempts:</strong> If a delivery attempt fails due to an incorrect address 
              or no one being available to receive the package, the carrier may:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li>Attempt redelivery (typically 2-3 attempts)</li>
              <li>Hold the package at a local facility</li>
              <li>Return the package to us (additional shipping fees may apply for reshipment)</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">9. Contact Us</h2>
            <p className="text-ink/60 leading-relaxed mb-6">
              Have questions about shipping? We're here to help!
            </p>
            <div className="bg-cardstock rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-craft-mint" />
                <span className="text-ink/70">{contactEmail}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-craft-mint" />
                <span className="text-ink/70">{brandName} Shipping Department</span>
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

export default ShippingPolicyPage;
