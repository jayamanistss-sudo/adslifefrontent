import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. What We Collect',
    body: `When you register, we collect your name, email, password (stored as a secure hash, never in plain text), phone number, and city. We use your city and, with your permission, your device location to show offers near you. If you sign in with Google, we receive your name, email, and profile photo from Google.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to: show you relevant local offers, let you save/redeem deals and track rewards, run referral and leaderboard features, send service emails (like a welcome email when you join, and offer/notification alerts you've opted into), and improve the platform based on aggregate usage patterns.`,
  },
  {
    title: '3. Location Data',
    body: `Your city (and live location, when granted) is used to rank and filter nearby offers. You can deny location access in your browser/device settings — AdsLife still works using your registered city, just without real-time proximity sorting.`,
  },
  {
    title: '4. What We Share',
    body: `We don't sell your personal data. Vendors only see aggregated, anonymized engagement numbers (views, saves) for their own offers — never your name, email, or contact details. We may share data with service providers who help us run the platform (e.g. cloud hosting, email delivery, push notifications), bound to use it only to provide that service.`,
  },
  {
    title: '5. Cookies & Local Storage',
    body: `We use local/session storage to keep you signed in and remember preferences like theme. We don't use third-party advertising trackers.`,
  },
  {
    title: '6. Data Retention',
    body: `We keep your account data while your account is active. If you delete your account, we remove personally identifying information within a reasonable period, except where we're required to retain records (e.g. for fraud prevention or legal compliance).`,
  },
  {
    title: '7. Your Choices',
    body: `You can update your profile details, unsubscribe from promotional notifications, and request account deletion at any time by contacting us.`,
  },
  {
    title: '8. Security',
    body: `Passwords are hashed, not stored in plain text. We use industry-standard practices to protect your data, but no system is 100% secure — please use a strong, unique password.`,
  },
  {
    title: '9. Children',
    body: `AdsLife isn't directed at children under 13, and we don't knowingly collect data from them.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy as the product evolves. Material changes will be reflected here with an updated date.`,
  },
  {
    title: '11. Contact',
    body: `Questions about your data? Reach us at starttechss@gmail.com.`,
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/login" className="flex items-center gap-1.5 text-gray-500 text-sm mb-6 hover:text-primary transition-colors">
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
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
            See also our <Link to="/terms" className="underline hover:text-primary">Terms of Service</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
