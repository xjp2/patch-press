import { Truck, Clock, Globe, Package, Mail, MapPin } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { SHIPPING_ZONES, SHIPPING_COUNTRIES } from '../lib/shipping';

interface ShippingPolicyPageProps {
  onBack: () => void;
  brandName?: string;
  contactEmail?: string;
}

export function ShippingPolicyPage({ onBack, brandName = 'Patchuu', contactEmail = 'contact@patchuu.shop' }: ShippingPolicyPageProps) {
  const { formatPrice } = useCurrency();
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const domesticZone = SHIPPING_ZONES.find((z) => z.countries.includes('SG'))!;
  const internationalZones = SHIPPING_ZONES.filter((z) => !z.countries.includes('SG'));
  const countryNames = SHIPPING_COUNTRIES.map((c) => c.name).join(', ');

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
            <h3 className="font-bold text-ink text-sm mb-1">Made to Order</h3>
            <p className="text-xs text-ink/60">4-7 business days</p>
          </div>
          <div className="bg-craft-mint/5 rounded-xl p-5 text-center">
            <Truck className="w-7 h-7 text-craft-mint mx-auto mb-2" />
            <h3 className="font-bold text-ink text-sm mb-1">Singapore</h3>
            <p className="text-xs text-ink/60">{domesticZone.estimate}</p>
          </div>
          <div className="bg-craft-mint/5 rounded-xl p-5 text-center">
            <Globe className="w-7 h-7 text-craft-mint mx-auto mb-2" />
            <h3 className="font-bold text-ink text-sm mb-1">International</h3>
            <p className="text-xs text-ink/60">8-18 working days</p>
          </div>
          <div className="bg-craft-mint/5 rounded-xl p-5 text-center">
            <Package className="w-7 h-7 text-craft-mint mx-auto mb-2" />
            <h3 className="font-bold text-ink text-sm mb-1">Fully Tracked</h3>
            <p className="text-xs text-ink/60">Every order, every destination</p>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">1. Where We Ship From</h2>
            <p className="text-ink/60 leading-relaxed">
              {brandName} is based in <strong>Singapore</strong>, and every order is handmade and
              dispatched from here. We ship within Singapore and internationally to: {countryNames}.
              If your country is not listed at checkout, contact us at {contactEmail} before ordering
              and we'll let you know if we can arrange delivery.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">2. Processing Time</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              All orders are custom-made to your specifications. Our typical processing times are:
            </p>
            <ul className="list-disc pl-6 text-ink/60 space-y-2">
              <li><strong>Order Processing:</strong> 1-2 business days (verification and preparation)</li>
              <li><strong>Production Time:</strong> 3-5 business days (design, pressing, quality check)</li>
              <li><strong>Total Before Shipping:</strong> 4-7 business days</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-blue-700 text-sm">
                <strong>Note:</strong> During peak seasons (holidays, sales events), processing may take an additional 2-3 business days.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">3. Shipping Methods & Rates</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              We charge a simple flat rate per order based on your destination. All services are
              provided by Singapore Post and include tracking. Delivery times below are estimates
              in working days after dispatch and exclude our made-to-order processing time.
            </p>
            <table className="w-full text-left border-collapse mb-6">
              <thead>
                <tr className="border-b-2 border-ink/10">
                  <th className="py-3 font-bold text-ink">Destination</th>
                  <th className="py-3 font-bold text-ink">Flat Rate</th>
                  <th className="py-3 font-bold text-ink">Estimated Delivery</th>
                </tr>
              </thead>
              <tbody className="text-ink/60">
                {SHIPPING_ZONES.map((zone) => (
                  <tr key={zone.label} className="border-b border-ink/10 last:border-0">
                    <td className="py-3">{zone.label}</td>
                    <td className="py-3">{formatPrice(zone.rateSgd)}</td>
                    <td className="py-3">{zone.estimate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {internationalZones.length > 0 && (
              <p className="text-ink/60 leading-relaxed text-sm">
                Rates are shown in your selected currency for reference; the exact charge is
                calculated at checkout. International delivery times vary by destination and
                customs clearance — remote areas may take longer.
              </p>
            )}
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">4. Order Tracking</h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              All our shipping services include tracking. Once your order ships, you will receive an email with:
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
            <p className="text-ink/60 leading-relaxed mt-4">
              Please note that our standard postal services include tracking but limited or no
              compensation for loss. We will always do our best to make things right — contact us
              and we'll review each case individually.
            </p>

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
                <span className="text-ink/70">{brandName}, Singapore</span>
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
