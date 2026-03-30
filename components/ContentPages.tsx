import React from 'react';
import { ArrowLeft, Bot, FileText, LifeBuoy, Mail, ShieldCheck } from 'lucide-react';

interface PageProps {
  onBack: () => void;
}

const PageShell: React.FC<{
  title: string;
  eyebrow: string;
  icon: React.ReactNode;
  onBack: () => void;
  children: React.ReactNode;
}> = ({ title, eyebrow, icon, onBack, children }) => (
  <div className="min-h-screen bg-void-black text-zinc-300 px-6 py-8 font-sans">
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-neon-green mb-8 hover:underline">
        <ArrowLeft size={20} /> Back to Home
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 rounded-2xl border border-white/10 bg-void-dark">{icon}</div>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{eyebrow}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{title}</h1>
        </div>
      </div>

      <div className="space-y-6 text-sm md:text-base leading-7">{children}</div>
    </div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="bg-void-dark/60 border border-white/5 rounded-3xl p-6 md:p-8">
    <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
    <div className="space-y-4 text-zinc-300">{children}</div>
  </section>
);

export const PrivacyPolicy: React.FC<PageProps> = ({ onBack }) => {
  const updated = 'March 30, 2026';

  return (
    <PageShell title="Privacy Policy" eyebrow="Legal" icon={<ShieldCheck className="text-neon-green" />} onBack={onBack}>
      <p className="text-zinc-500">Last updated: {updated}</p>

      <Section title="Overview">
        <p>
          WhisperLink is built to minimize data retention. The product offers browser-based AI chat and peer-to-peer
          rooms, so the service is designed to process only the information needed to deliver the feature you actively use.
        </p>
        <p>
          This page explains what data is handled, why it is handled, and what controls are available to visitors. It is
          written for end users rather than for internal compliance checklists.
        </p>
      </Section>

      <Section title="What We Process">
        <p>
          We store local preferences such as username, language, sound, and voice settings in your browser so the interface
          can restore your chosen configuration between visits.
        </p>
        <p>
          Messages in peer-to-peer rooms are exchanged directly between participating browsers. For AI chat, the message you
          send is forwarded to the configured AI provider so the provider can generate a response.
        </p>
        <p>
          We do not operate a persistent message history for the core chat experience. Closing the session removes the active
          conversation from the application state.
        </p>
      </Section>

      <Section title="Third-Party Services">
        <p>
          WhisperLink uses third-party infrastructure only where required for product features, including AI generation and ad
          delivery when ads are enabled on eligible content pages.
        </p>
        <p>
          Google services may set or read cookies according to their own policies. If Google ads are used, personalized or
          contextual advertising behavior is governed by Google’s advertising controls and applicable consent requirements.
        </p>
      </Section>

      <Section title="Your Choices">
        <p>You can clear browser storage at any time to remove locally saved preferences.</p>
        <p>
          You can avoid AI processing by using peer-to-peer chat instead of solo AI mode. You can also disable voice features
          inside the product settings.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about privacy or data handling can be sent through the contact page linked in the site footer. Include the
          date, browser, and a short description of the issue so it can be reproduced.
        </p>
      </Section>
    </PageShell>
  );
};

export const TermsPage: React.FC<PageProps> = ({ onBack }) => (
  <PageShell title="Terms of Use" eyebrow="Legal" icon={<FileText className="text-blue-400" />} onBack={onBack}>
    <Section title="Service Scope">
      <p>
        WhisperLink is a browser-based communication tool for experimental AI chat and direct peer-to-peer conversations. It
        is provided on an as-available basis and may change as features are tested and refined.
      </p>
    </Section>

    <Section title="Acceptable Use">
      <p>Do not use the service for unlawful activity, harassment, spam, impersonation, or attempts to break other systems.</p>
      <p>
        Do not submit sensitive personal information into AI chat unless you understand the third-party processing involved.
        You are responsible for the content you send and for the peers you invite into a room.
      </p>
    </Section>

    <Section title="Availability And Limitations">
      <p>
        The application depends on browser capabilities, third-party APIs, and peer connectivity. Some features may be
        unavailable in certain browsers, devices, or regions.
      </p>
      <p>
        We may suspend features, throttle usage, or remove abusive traffic to protect reliability and comply with provider
        policies.
      </p>
    </Section>

    <Section title="Content And Feedback">
      <p>
        You keep ownership of the content you create. By using the service, you grant only the limited rights needed to
        process requests and deliver the feature you invoked.
      </p>
      <p>
        If you send feedback, suggestions, or bug reports, we may use that feedback to improve the product without any
        obligation to compensate you.
      </p>
    </Section>
  </PageShell>
);

export const ContactPage: React.FC<PageProps> = ({ onBack }) => (
  <PageShell title="Contact And Support" eyebrow="Support" icon={<Mail className="text-orange-400" />} onBack={onBack}>
    <Section title="How To Reach Us">
      <p>
        For policy, technical, or partnership questions, contact the WhisperLink team at
        {' '}
        <a className="text-neon-green hover:underline" href="mailto:support@whisperlink.app">support@whisperlink.app</a>.
      </p>
      <p>
        Include your browser, device type, and the route where the issue occurred. That reduces back-and-forth and makes
        reproduction possible.
      </p>
    </Section>

    <Section title="Support Topics">
      <p>Use this channel for account-free product support, privacy questions, accessibility issues, and ad policy reports.</p>
      <p>
        If you are reporting a content or ad-placement issue, include a screenshot and the exact page URL so the page can be
        reviewed quickly.
      </p>
    </Section>
  </PageShell>
);

export const AboutPage: React.FC<PageProps> = ({ onBack }) => (
  <PageShell title="How WhisperLink Works" eyebrow="Product Guide" icon={<Bot className="text-neon-purple" />} onBack={onBack}>
    <Section title="Purpose">
      <p>
        WhisperLink was created as a lightweight communication product for people who want a faster, lower-friction way to
        open a private room or start a guided AI conversation without creating an account first.
      </p>
      <p>
        The goal is practical: reduce setup time, reduce retained data, and make the mechanics of secure browser chat easier
        to understand for ordinary users.
      </p>
    </Section>

    <Section title="Modes">
      <p>
        Solo Link connects you to the AI assistant. It is intended for brainstorming, drafting, translation, and private
        practice conversations.
      </p>
      <p>
        Group Link creates a browser-based room that peers can join through a shareable invite URL. The room host can allow
        the AI to participate as a moderator or responder when context calls for it.
      </p>
    </Section>

    <Section title="Why The Product Is Different">
      <p>
        The product is not a generic anonymous-chat clone. It combines direct peer messaging, AI assistance, configurable
        conversation tone, language switching, and voice features in a single browser workflow.
      </p>
      <p>
        The visual interface is intentionally stylized, but the underlying design choices are functional: fast start, no
        account dependency, and clear separation between peer chat and AI processing.
      </p>
    </Section>

    <Section title="Who It Is For">
      <p>
        Typical use cases include quick collaborative ideation, language practice, low-friction group chat, and short-lived
        private discussions that do not need a permanent archive.
      </p>
    </Section>
  </PageShell>
);

export const HelpPage: React.FC<PageProps> = ({ onBack }) => (
  <PageShell title="Help Center" eyebrow="Usage Guide" icon={<LifeBuoy className="text-red-400" />} onBack={onBack}>
    <Section title="Getting Started">
      <p>Enter a display name, choose Solo Link or Group Link, and then configure language, personality, sound, or voice.</p>
      <p>
        Group Link creates a shareable session URL. Solo Link connects directly to the AI workflow. If browser microphone
        permissions are granted, voice input can be used from the chat composer.
      </p>
    </Section>

    <Section title="Troubleshooting">
      <p>If a peer cannot join, confirm both users are using modern browsers and that the invite URL was copied in full.</p>
      <p>
        If AI replies are unavailable, the application may not have access to the required API configuration. In that case,
        peer-to-peer chat remains available, but AI-specific features will not respond.
      </p>
    </Section>

    <Section title="Best Practices">
      <p>
        Use Group Link only with people you trust. Avoid sharing confidential information with any AI system unless you have
        reviewed the provider’s data-handling terms and your own risk tolerance supports that use.
      </p>
    </Section>
  </PageShell>
);
