/**
 * First-time disclaimer modal for legal protection and informed consent.
 * Shows once on first visit, stored in both cookies and localStorage for redundancy.
 */
import React, { useState, useEffect } from 'react';

const DISCLAIMER_ACCEPTED_KEY = 'ainimegames_disclaimer_accepted_v1';
const DISCLAIMER_COOKIE_NAME = 'ainime_disclaimer_v1';

// Helper to get a cookie by name
function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

// Helper to set a cookie with expiration (days)
function setCookie(name: string, value: string, days: number) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

interface DisclaimerModalProps {
  onAccept: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept }) => {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [apiCostsConfirmed, setApiCostsConfirmed] = useState(false);
  const [apiSecurityConfirmed, setApiSecurityConfirmed] = useState(false);
  const [aiProviderConfirmed, setAiProviderConfirmed] = useState(false);
  const [contentConfirmed, setContentConfirmed] = useState(false);
  const [termsConfirmed, setTermsConfirmed] = useState(false);

  const allConfirmed = ageConfirmed && apiCostsConfirmed && apiSecurityConfirmed && aiProviderConfirmed && contentConfirmed && termsConfirmed;

  const handleAccept = () => {
    if (allConfirmed) {
      // Set both cookie (1 year expiry) and localStorage for redundancy
      setCookie(DISCLAIMER_COOKIE_NAME, 'accepted', 365);
      localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, JSON.stringify({
        accepted: true,
        timestamp: new Date().toISOString(),
        version: 'v1'
      }));
      onAccept();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-6 pb-4">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to Ainimegames</h1>
          <p className="text-zinc-400 text-sm">Please review and accept the following before playing.</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Age Verification */}
          <label className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-600">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900 cursor-pointer"
            />
            <div>
              <span className="text-white font-medium">I am 18 years or older</span>
              <p className="text-zinc-400 text-sm mt-1">
                This is a mature visual novel experience intended for adult audiences only. 
                All characters depicted are fictional adults (18+).
              </p>
            </div>
          </label>

          {/* API Costs */}
          <label className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-600">
            <input
              type="checkbox"
              checked={apiCostsConfirmed}
              onChange={(e) => setApiCostsConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900 cursor-pointer"
            />
            <div>
              <span className="text-white font-medium">I understand the API cost responsibility</span>
              <p className="text-zinc-400 text-sm mt-1">
                This game uses a "Bring Your Own Key" model. I am solely responsible for any fees 
                incurred by my AI provider (Google Gemini, etc.). Ainimegames is not responsible for my API costs.
              </p>
            </div>
          </label>

          {/* API Key Security */}
          <label className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-600">
            <input
              type="checkbox"
              checked={apiSecurityConfirmed}
              onChange={(e) => setApiSecurityConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900 cursor-pointer"
            />
            <div>
              <span className="text-white font-medium">I am responsible for my API key security</span>
              <p className="text-zinc-400 text-sm mt-1">
                I will monitor my API provider's dashboard for unauthorized usage and set appropriate 
                usage limits. Ainimegames is not liable for any unauthorized use of my API key.
              </p>
            </div>
          </label>

          {/* AI Provider Terms */}
          <label className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-600">
            <input
              type="checkbox"
              checked={aiProviderConfirmed}
              onChange={(e) => setAiProviderConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900 cursor-pointer"
            />
            <div>
              <span className="text-white font-medium">I understand AI behavior and availability is controlled by my provider</span>
              <p className="text-zinc-400 text-sm mt-1">
                Ainimegames does not control the AI models or their outputs. The behavior and content 
                policies of the AI are determined by my chosen AI provider (Google, OpenAI, etc.). 
                I agree to comply with their terms of service. I understand that AI model availability 
                is not guaranteed and may vary due to provider outages or high demand.
              </p>
            </div>
          </label>

          {/* Content Responsibility */}
          <label className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-600">
            <input
              type="checkbox"
              checked={contentConfirmed}
              onChange={(e) => setContentConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900 cursor-pointer"
            />
            <div>
              <span className="text-white font-medium">I am responsible for generated content</span>
              <p className="text-zinc-400 text-sm mt-1">
                All AI-generated content is produced based on my own inputs and API keys. 
                I am solely responsible for the content generated through my use of this application 
                and agree to use it lawfully.
              </p>
            </div>
          </label>

          {/* Terms Agreement */}
          <label className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-600">
            <input
              type="checkbox"
              checked={termsConfirmed}
              onChange={(e) => setTermsConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900 cursor-pointer"
            />
            <div>
              <span className="text-white font-medium">I agree to the Terms of Service</span>
              <p className="text-zinc-400 text-sm mt-1">
                I have read and agree to the{' '}
                <a 
                  href="/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-rose-400 hover:text-rose-300 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service & Disclaimer
                </a>
                , including the indemnification clause.
              </p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-700 p-6 pt-4">
          <button
            onClick={handleAccept}
            disabled={!allConfirmed}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all ${
              allConfirmed
                ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg shadow-rose-900/30'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {allConfirmed ? 'Enter Game' : 'Please accept all terms to continue'}
          </button>
          <p className="text-zinc-500 text-xs text-center mt-3">
            Your acceptance is stored locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to check if disclaimer has been accepted
 */
export const useDisclaimerStatus = () => {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    // Check cookie first, then localStorage for backwards compatibility
    const cookieAccepted = getCookie(DISCLAIMER_COOKIE_NAME) === 'accepted';
    
    if (cookieAccepted) {
      setHasAccepted(true);
      return;
    }

    // Fallback to localStorage check
    const stored = localStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.accepted === true) {
          // Migrate to cookie for future sessions
          setCookie(DISCLAIMER_COOKIE_NAME, 'accepted', 365);
          setHasAccepted(true);
          return;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    
    setHasAccepted(false);
  }, []);

  const acceptDisclaimer = () => {
    setHasAccepted(true);
  };

  return { hasAccepted, acceptDisclaimer };
};

