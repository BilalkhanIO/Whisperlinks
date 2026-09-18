import React from 'react';
import { ArrowLeft, Bot, FileText, LifeBuoy, Mail, ShieldCheck, Shield,   HelpCircle, CheckCircle2 } from 'lucide-react';
import { AdBanner } from './ads/AdBanner';

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

      <div className="mt-12">
        <AdBanner placement="content-bottom" />
      </div>
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

export const SecurityPage: React.FC<PageProps> = ({ onBack }) => (
  <PageShell title="Security Architecture & Audit" eyebrow="Technical Verification" icon={<Shield className="text-neon-green" />} onBack={onBack}>
    <Section title="Zero-Knowledge & Memory-Only Backend">
      <p>
        WhisperLink is architected from the ground up to prevent server-side data retention. The signalling backend operates
        strictly in-memory:
      </p>
      <ul className="space-y-2 list-none pl-1 text-sm font-mono text-zinc-300">
        <li className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-neon-green shrink-0" />
          <span>No database: All ephemeral presence tokens expire after 5 minutes (TTL) and are held only in RAM.</span>
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-neon-green shrink-0" />
          <span>Zero message logs: Chat messages and files travel directly between browsers over WebRTC DataChannels.</span>
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-neon-green shrink-0" />
          <span>No identity accounts: Private keys never touch any server.</span>
        </li>
      </ul>
    </Section>

    <Section title="Cryptographic WhisperID (Web Crypto API)">
      <p>
        Instead of usernames backed by centralized databases, WhisperLink utilizes ECDSA P-256 keypairs generated inside the
        user’s browser using the standardized W3C Web Crypto API.
      </p>
      <p>
        Your human-readable alias (e.g., <span className="text-neon-green font-mono">alice#7K4M</span>) is deterministically
        anchored to a SHA-256 fingerprint of your public key. When protected with a local PIN, private keys are encrypted using
        AES-GCM-256 with keys derived via PBKDF2 (100,000 rounds of SHA-256).
      </p>
    </Section>

    <Section title="Media Encryption & DTLS-SRTP">
      <p>
        Voice, video, and screen sharing streams leverage WebRTC’s mandatory DTLS (Datagram Transport Layer Security) and SRTP
        (Secure Real-time Transport Protocol). Streams are negotiated peer-to-peer with ephemeral session keys that are never shared
        with intermediaries.
      </p>
    </Section>

    <Section title="File Transfer Integrity (SHA-256)">
      <p>
        All peer-to-peer file transfers calculate client-side cryptographic SHA-256 digests in real-time. The sender and recipient
        both verify file hash integrity to guarantee that documents and media cannot be intercepted or modified in transit.
      </p>
    </Section>

    <Section title="Panic Wipe & Content Security Policy">
      <p>
        In an emergency, activating the Panic feature immediately halts all media tracks, closes active peer connections, clears
        ephemeral memory state, and triggers UI camouflage.
      </p>
      <p>
        Strict Content Security Policy (CSP) and no-sniff headers are enforced at the network layer to mitigate script injection and
        cross-origin threats.
      </p>
    </Section>
  </PageShell>
);

export const FaqPage: React.FC<PageProps> = ({ onBack }) => (
  <PageShell title="Frequently Asked Questions" eyebrow="FAQ & Guides" icon={<HelpCircle className="text-cyan-400" />} onBack={onBack}>
    <Section title="How does anonymity work without accounts?">
      <p>
        You do not register with an email, phone number, or password. When you launch WhisperLink, your browser creates a local
        cryptographic keypair. Your WhisperID is calculated directly from your public key fingerprint. You can connect with others
        either by sharing an ephemeral room link or by sharing your WhisperID.
      </p>
    </Section>

    <Section title="Can the server read my messages or files?">
      <p>
        No. In peer-to-peer rooms, messages and files are transmitted directly browser-to-browser over encrypted WebRTC
        DataChannels. The server only facilitates the initial handshake (signaling) and has no access to room conversations.
      </p>
    </Section>

    <Section title="How do I backup or transfer my identity?">
      <p>
        Click on the Identity badge (or press <span className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">Ctrl+K</span> and select &quot;WhisperID&quot;).
        You can reveal your deterministic 12-word mnemonic recovery phrase. Store this phrase safely offline to restore your cryptographic identity
        on another device.
      </p>
    </Section>

    <Section title="Are there ads in the chat rooms?">
      <p>
        Never. In accordance with strict privacy guidelines and advertising policies, ads are 100% prohibited from chat interfaces,
        call rooms, and ephemeral spaces. Ad placements are confined solely to static public documentation and educational pages.
      </p>
    </Section>

    <Section title="What happens when I click the PANIC button?">
      <p>
        The emergency panic trigger immediately tears down all active peer connections, revokes microphone and camera streams, clears
        unencrypted memory logs, and displays a neutral camouflage screen (such as spreadsheet data or code) to protect your privacy in physical environments.
      </p>
    </Section>
  </PageShell>
);
