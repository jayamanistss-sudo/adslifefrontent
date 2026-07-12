import { useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSiteSettings } from '../store/useSiteSettings';

const SECTIONS = [
  {
    title: '1. What We Collect',
    body: `When you register, we collect your name, email, password (stored as a secure hash, never in plain text), phone number, and city. We use your city and, with your permission, your device location to show offers near you. If you sign in with Google, we receive your name, email, and profile photo from Google. If you upload a profile photo, offer image, or banner ad creative, we store that image/video file. If you subscribe to a Vendor plan or purchase a banner ad, we store the order ID, plan/item purchased, amount, currency, and payment status — never your card number, UPI ID, or bank details (see "Payments" below). If you enable notifications, we store a device push token so we can deliver alerts to that device.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to: show you relevant local offers, let you save/redeem deals and track rewards, run referral and leaderboard features, process Vendor plan and banner ad payments, send service emails and push notifications (like a welcome email when you join, payment confirmations, and offer alerts you've opted into), detect fraudulent listings or accounts, and improve the platform based on aggregate usage patterns.`,
  },
  {
    title: '3. Location Data',
    body: `Your city (and live location, when granted) is used to rank and filter nearby offers. You can deny location access in your browser/device settings — AdsLife still works using your registered city, just without real-time proximity sorting.`,
  },
  {
    title: '4. Payments',
    body: `All payments (Vendor plan subscriptions, banner ad purchases) are processed by Cashfree Payments, a PCI-DSS-compliant third-party payment gateway. When you pay, your card, UPI, or netbanking details are entered directly into Cashfree's secure checkout — AdsLife's servers never receive, see, or store that information. We only receive and store the outcome: an order ID, the amount, and whether the payment succeeded, so we can activate your plan or banner and show you a payment history.`,
  },
  {
    title: '5. What We Share',
    body: `We don't sell your personal data. Vendors only see aggregated, anonymized engagement numbers (views, saves, followers) for their own offers — never your name, email, or contact details. We share data with service providers who help us run the platform, strictly to provide their specific service: Cashfree Payments (payment processing), Google Firebase (push notification delivery and, if you use it, Google Sign-In), and Cloudinary (image/video hosting for uploaded photos and banner creatives).`,
  },
  {
    title: '6. Cookies & Local Storage',
    body: `On the web, we use an httpOnly authentication cookie to keep you signed in, plus local/session storage for non-sensitive preferences like theme. We don't use third-party advertising trackers.`,
  },
  {
    title: '7. Data Retention',
    body: `We keep your account data while your account is active. If you delete your account, we remove personally identifying information within a reasonable period, except where we're required to retain records (e.g. payment records for accounting/legal compliance, or fraud-prevention logs).`,
  },
  {
    title: '8. Your Choices & Account Deletion',
    body: `You can update your profile details, unsubscribe from push and email notifications individually in Settings, and request full account deletion at any time — see adslife.in/delete-account for exactly what's removed, what's retained, and how to request it. We'll confirm and process deletion requests within a reasonable period.`,
  },
  {
    title: '9. Security',
    body: `Passwords are hashed, not stored in plain text. Sessions are authenticated via a secure httpOnly cookie (web) or encrypted local storage (mobile). We use industry-standard practices to protect your data, but no system is 100% secure — please use a strong, unique password.`,
  },
  {
    title: '10. Permissions We Ask For (Mobile App)',
    body: `Location — to sort and filter offers by distance. Camera/Photos — only when you choose to upload a profile photo, offer image, or banner creative. Notifications — to deliver offer alerts, payment confirmations, and account updates you've opted into. You can grant, deny, or revoke any of these at any time in your device settings; AdsLife degrades gracefully without them.`,
  },
  {
    title: '11. Children',
    body: `AdsLife isn't directed at children under 13, and we don't knowingly collect data from them.`,
  },
  {
    title: '12. Changes to This Policy',
    body: `We may update this Privacy Policy as the product evolves. Material changes will be reflected here with an updated date.`,
  },
  {
    title: '13. Contact',
    body: `Questions about your data? Reach us at starttechss@gmail.com.`,
  },
];

export default function Privacy() {
  const { settings, fetch } = useSiteSettings();
  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const customContent = settings.privacy_content?.trim();

  return (
    <div className="min-h-screen px-4 py-10 bg-[var(--surface-2)]">
      <div className="mx-auto max-w-2xxl">
        <Link to="/login" className="flex items-center gap-1.5 text-[var(--text-muted)] text-sm mb-6 hover:text-primary transition-colors">
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="p-8 card rounded-3xl sm:p-10">
          <h1 className="mb-1 text-2xl font-bold text-[var(--text)] sm:text-3xl">Privacy Policy</h1>
          <p className="mb-8 text-sm text-[var(--text-muted)]">Last updated: July 2026</p>

          {customContent ? (
            <div
              className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(customContent) }}
            />
          ) : (
            <div className="space-y-6">
              {SECTIONS.map((s) => (
                <section key={s.title}>
                  <h2 className="text-sm font-bold text-[var(--text)] mb-1.5">{s.title}</h2>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{s.body}</p>
                </section>
              ))}
            </div>
          )}

          <p className="pt-6 mt-8 text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
            See also our <Link to="/terms" className="underline hover:text-primary">Terms of Service</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
