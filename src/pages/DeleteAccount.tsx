import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Trash2 } from 'lucide-react';

const KEPT = [
  'Payment and transaction records (order ID, amount, status) — required for accounting and legal compliance.',
  'Records needed for active fraud, abuse, or dispute investigations already in progress.',
];

const DELETED = [
  'Your name, email, phone number, and city',
  'Profile photo and any uploaded images',
  'Saved offers, follows, reviews, and rewards/coins balance',
  'Vendor business profile and offer listings (if you have a Vendor account)',
  'Push notification device tokens',
];

export default function DeleteAccount() {
  return (
    <div className="min-h-screen px-4 py-10 bg-[var(--surface-2)]">
      <div className="mx-auto max-w-2xxl">
        <Link to="/login" className="flex items-center gap-1.5 text-[var(--text-muted)] text-sm mb-6 hover:text-primary transition-colors">
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="p-8 card rounded-3xl sm:p-10">
          <h1 className="mb-1 text-2xl font-bold text-[var(--text)] sm:text-3xl">Delete Your AdsLife Account</h1>
          <p className="mb-8 text-sm text-[var(--text-muted)]">Last updated: July 2026</p>

          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-bold text-[var(--text)] mb-1.5">How to Request Deletion</h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Send an email to <a href="mailto:starttechss@gmail.com?subject=Delete%20my%20AdsLife%20account" className="underline text-primary">starttechss@gmail.com</a> from
                the email address registered on your account, with the subject "Delete my AdsLife account." Include the name or
                phone number on your account so we can locate it. We'll confirm your identity and process the request within a
                reasonable period, generally within 30 days.
              </p>
              <a
                href="mailto:starttechss@gmail.com?subject=Delete%20my%20AdsLife%20account&body=Please%20delete%20my%20AdsLife%20account.%0A%0AName%20on%20account%3A%0APhone%20number%20on%20account%3A"
                className="btn btn-primary mt-4 inline-flex items-center gap-2 !w-auto"
              >
                <Mail size={15} /> Email to Request Deletion
              </a>
            </section>

            <section>
              <h2 className="text-sm font-bold text-[var(--text)] mb-1.5 flex items-center gap-1.5">
                <Trash2 size={14} /> What Gets Deleted
              </h2>
              <ul className="text-sm leading-relaxed text-[var(--text-secondary)] list-disc pl-5 space-y-1">
                {DELETED.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-[var(--text)] mb-1.5">What We Keep, and Why</h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-2">
                A small amount of data is retained even after account deletion, strictly where the law requires it or where
                it's needed to protect the platform:
              </p>
              <ul className="text-sm leading-relaxed text-[var(--text-secondary)] list-disc pl-5 space-y-1">
                {KEPT.map((k) => <li key={k}>{k}</li>)}
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-[var(--text)] mb-1.5">Partial Deletion</h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                You don't need to delete your whole account to control your data day-to-day — you can update your profile
                details or turn off individual push/email notifications any time in Settings without contacting us.
              </p>
            </section>
          </div>

          <p className="pt-6 mt-8 text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
            See also our <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link> and{' '}
            <Link to="/terms" className="underline hover:text-primary">Terms of Service</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
