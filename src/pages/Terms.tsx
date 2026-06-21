import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By creating an account or using AdsLife, you agree to these Terms of Service. If you don't agree, please don't use the platform.`,
  },
  {
    title: '2. What AdsLife Is',
    body: `AdsLife is a hyperlocal discovery platform connecting users with offers, deals, and coupons from nearby businesses ("Vendors"). We list and surface offers — we are not a party to any purchase, redemption, or transaction between you and a Vendor.`,
  },
  {
    title: '3. Your Account',
    body: `You're responsible for keeping your account credentials secure and for all activity under your account. You must provide accurate information when registering (including a working phone number and city, which help us show you relevant local offers). You must be at least 13 years old to use AdsLife.`,
  },
  {
    title: '4. Offers & Redemption',
    body: `Offers are created and fulfilled by Vendors, not AdsLife. Discount percentages, validity windows, coupon codes, and redemption terms are set by each Vendor and may change or expire without notice. AdsLife is not responsible for a Vendor's failure to honor an offer, product quality, or service issues — please contact the Vendor directly for those.`,
  },
  {
    title: '5. Rewards, Coins & Referrals',
    body: `Coins, streaks, and referral bonuses are part of an engagement program and have no cash value. We may adjust earning rates or expire inactive balances with reasonable notice, and may suspend rewards activity we believe is fraudulent (e.g. fake referrals or self-referrals).`,
  },
  {
    title: '6. Vendor Accounts',
    body: `If you register as a Vendor, you confirm you're authorized to represent the listed business, that the offers you post are accurate and genuinely available, and that you'll honor published terms for any customer who redeems through AdsLife. We may remove listings or suspend Vendor accounts that post misleading, fraudulent, or fake offers.`,
  },
  {
    title: '7. Reporting & Fraud',
    body: `Users can report offers that look fake, misleading, expired, or scam-like. We review reports and may flag, suspend, or remove offers and accounts found to violate these terms.`,
  },
  {
    title: '8. Prohibited Conduct',
    body: `You agree not to misuse the platform — this includes posting false offers, manipulating ratings or referrals, scraping data, attempting to bypass security, or impersonating another person or business.`,
  },
  {
    title: '9. Disclaimers & Liability',
    body: `AdsLife is provided "as is." We don't guarantee uninterrupted availability, the accuracy of every listed offer, or that any specific deal will be available when you arrive. To the extent permitted by law, AdsLife isn't liable for losses arising from your interactions with Vendors or reliance on listed offers.`,
  },
  {
    title: '10. Changes to These Terms',
    body: `We may update these Terms from time to time. Continued use of AdsLife after changes take effect means you accept the revised Terms.`,
  },
  {
    title: '11. Contact',
    body: `Questions about these Terms? Reach us at starttechss@gmail.com.`,
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/login" className="flex items-center gap-1.5 text-gray-500 text-sm mb-6 hover:text-primary transition-colors">
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Terms of Service</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: June 2026</p>

          <div className="space-y-6">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="text-sm font-bold text-gray-800 mb-1.5">{s.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
              </section>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-8 pt-6 border-t border-gray-100">
            See also our <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
