import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const PrivacyPolicy: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-void-black text-zinc-300 p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-neon-green mb-8 hover:underline">
          <ArrowLeft size={20} /> Back to Chat
        </button>
        
        <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Introduction</h2>
            <p>Welcome to WhisperLink. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. Data We Collect</h2>
            <p>We do not store any messages or personal information on our servers. All chat messages are ephemeral and are either transmitted directly between peers (P2P) or processed by AI services without permanent storage.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Usage Data:</strong> We may collect anonymous usage data to improve our service.</li>
              <li><strong>Cookies:</strong> We use cookies to store your preferences (like theme or language settings).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. Third-Party Services</h2>
            <p>We use third-party services for specific functionality:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Google AdSense:</strong> We use Google AdSense to display advertisements. Google may use cookies to serve ads based on your prior visits to our website or other websites.</li>
              <li><strong>Google Gemini API:</strong> AI chat functionality is provided by Google's Gemini API.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Advertising</h2>
            <p>Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet. Users may opt out of personalized advertising by visiting Ads Settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. Contact Us</h2>
            <p>If you have any questions about this privacy policy, please contact us.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
