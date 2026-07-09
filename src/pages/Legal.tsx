// src/pages/Legal.tsx
// Privacy Policy + Terms of Service

import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Shield, FileText, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function Legal() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <h1 className="font-display text-2xl font-bold text-gradient-cyan">Legal Documents</h1>
          <p className="text-text-secondary text-sm mt-1">Last updated: January 2025</p>
        </div>

        {/* Privacy Policy */}
        <div id="privacy">
          <Card className="rounded-2xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={22} className="text-cyan-neon" />
            <h2 className="font-display text-xl font-bold text-text-primary">Privacy Policy</h2>
          </div>

          {[
            {
              title: '1. Information We Collect',
              content: `We collect information you provide directly, including your email address, username, and payment details (UPI ID or PayPal email) when you register or request a cashout. We also collect gameplay data including spin history, token balances, game results, and login timestamps to provide our services.`,
            },
            {
              title: '2. How We Use Your Information',
              content: `Your information is used to: (a) provide and improve our gaming services, (b) process token cashout requests, (c) display leaderboard rankings, (d) send important account notifications, (e) prevent fraud and cheating, and (f) comply with legal obligations. We do not sell your personal data to third parties.`,
            },
            {
              title: '3. Advertising',
              content: `AquaSpin Rewards uses third-party advertising networks including Google AdSense, AppLovin MAX, and PropellerAds. These networks may collect anonymous usage data to serve relevant advertisements. Ad revenue is collected directly by the platform owner. You can opt out of personalized ads through your browser settings or device privacy controls.`,
            },
            {
              title: '4. Data Storage & Security',
              content: `Your data is stored securely on Supabase infrastructure with industry-standard PostgreSQL encryption and Row-Level Security (RLS) policies. We implement server-side validation to prevent unauthorized access. Payment addresses are stored encrypted and only used for processing approved cashout requests.`,
            },
            {
              title: '5. Data Retention & Deletion',
              content: `We retain your account data while your account is active. You may request account deletion by contacting support@aquaspin.app. Upon deletion, your profile, game history, and token balance will be permanently removed within 30 days. Pending cashout transactions will be processed before deletion.`,
            },
            {
              title: '6. Cookies',
              content: `We use essential cookies for authentication (Supabase session management) and local storage for preferences (theme, sound settings). We do not use tracking cookies beyond what advertising partners require. You can disable cookies in your browser, though this may affect app functionality.`,
            },
            {
              title: '7. Children\'s Privacy',
              content: `AquaSpin Rewards is not intended for users under 13 years of age. Cashout features require users to be 18+ years old. We do not knowingly collect personal information from children under 13. If you believe a child has provided us information, please contact us immediately.`,
            },
          ].map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-text-primary mb-1">{section.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{section.content}</p>
            </div>
          ))}
        </Card>
        </div>

        {/* Terms of Service */}
        <div id="terms">
          <Card className="rounded-2xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={22} className="text-gold-neon" />
            <h2 className="font-display text-xl font-bold text-text-primary">Terms of Service</h2>
          </div>

          {[
            {
              title: '1. Acceptance of Terms',
              content: `By accessing or using AquaSpin Rewards ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App.`,
            },
            {
              title: '2. Token System',
              content: `Tokens are virtual credits used within the App. Tokens have no real-world monetary value until redeemed through our cashout system at the rate of 1000 tokens = $1 USD. Tokens cannot be transferred between accounts. Token balances may be adjusted for anti-cheat purposes.`,
            },
            {
              title: '3. Cashout Policy',
              content: `Users may request cashouts of 1000+ tokens in multiples of 1000. Cashouts are processed manually by the platform owner within 24–48 business hours. We reserve the right to verify account activity before approving cashouts. Fraudulent activity will result in account suspension and forfeiture of token balance.`,
            },
            {
              title: '4. Fair Play & Anti-Cheat',
              content: `All spin outcomes are generated server-side using cryptographically random algorithms. Attempts to manipulate spin results, token balances, or game outcomes through hacking, script injection, or other means will result in immediate permanent account ban. Reported suspicious activity is investigated and may result in account suspension.`,
            },
            {
              title: '5. Prohibited Activities',
              content: `You agree not to: (a) use automated scripts or bots to spin or play games, (b) create multiple accounts to exploit referral systems, (c) use VPNs to circumvent regional restrictions, (d) share accounts or sell token balances, (e) engage in any activity that disrupts the service for other users.`,
            },
            {
              title: '6. Limitation of Liability',
              content: `AquaSpin Rewards is provided "as is" without warranties. We are not liable for lost tokens due to technical issues, though we will make reasonable efforts to restore balances from server logs. The maximum liability is limited to the USD value of tokens held at the time of any dispute.`,
            },
            {
              title: '7. Account Suspension',
              content: `We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or pose a risk to the integrity of our platform. Suspended accounts forfeit their token balance. Appeals can be submitted to support@aquaspin.app within 30 days of suspension.`,
            },
            {
              title: '8. Changes to Terms',
              content: `We may update these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms. We will notify users of significant changes via email or in-app notification.`,
            },
          ].map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-text-primary mb-1">{section.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{section.content}</p>
            </div>
          ))}
        </Card>
        </div>

        <div className="text-center text-sm text-muted">
          Questions? Contact us at{' '}
          <a href="mailto:support@aquaspin.app" className="text-cyan-neon hover:underline">
            support@aquaspin.app
          </a>
        </div>
      </div>
    </div>
  );
}
