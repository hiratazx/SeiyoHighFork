/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState, useRef } from 'react';

interface ApiKeySetupGuideProps {
  isVisible: boolean;
  onClose: () => void;
}

interface GuideStep {
  title: string;
  content: React.ReactNode;
  image?: string;
  imageAlt?: string;
  tip?: string;
  warning?: string;
}

export const ApiKeySetupGuide: React.FC<ApiKeySetupGuideProps> = ({ isVisible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const steps: GuideStep[] = [
    {
      title: "Step 1: Get Your API Key",
      content: (
        <>
          <p className="mb-4">
            First, go to <a 
              href="https://aistudio.google.com/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-400 underline hover:text-cyan-300"
            >
              Google AI Studio → API Keys
            </a>
          </p>
          <p className="mb-4">
            Click <strong>"Create API key"</strong> to generate a new key, or use an existing one.
          </p>
          <p>
            You'll see your API keys listed with their quota tier. New keys start on the <strong>Free trial</strong> tier.
          </p>
        </>
      ),
      image: "/images/apikeys.PNG",
      imageAlt: "Google AI Studio API Keys page",
      tip: "You can create multiple API keys for different projects."
    },
    {
      title: "Step 2: Activate Billing",
      content: (
        <>
          <p className="mb-4">
            Click <strong>"Activate billing"</strong> next to your API key. This will redirect you to the Google Cloud Console.
          </p>
          <p className="mb-4">
            Don't worry — Google gives you <strong>$300 (or ~€255) in free credits</strong> that last for 90 days!
          </p>
          <p className="mb-4">
            You'll need to add a payment method, but <strong className="text-green-400">you will NOT be charged during the trial</strong>. 
            If your credits run out, the service simply stops — no surprise bills.
          </p>
          <p className="text-gray-400 text-sm">
            To actually be charged, you must manually "Upgrade" your account after the trial. If you never upgrade, you're never billed.
          </p>
        </>
      ),
      image: "/images/freecreditgoogle.PNG",
      imageAlt: "Google Cloud free trial with $300 credits",
      tip: "The free credits are more than enough for months of gameplay. You control if/when you upgrade to paid."
    },
    {
      title: "Step 3: Supported Payment Methods",
      content: (
        <>
          <p className="mb-4">
            Google Cloud accepts the following payment methods:
          </p>
          <ul className="list-disc list-inside space-y-1 mb-4 text-gray-300">
            <li>Credit cards (Visa, MasterCard, American Express)</li>
            <li>Debit cards with Visa/MasterCard logo</li>
            <li>Visa Electron (outside US)</li>
            <li>JCB (Japan and US only)</li>
            <li>Discover (US only)</li>
          </ul>
        </>
      ),
      image: "/images/paymentmethods.PNG",
      imageAlt: "Supported payment methods"
    },
    {
      title: "Step 4: Unsupported Payment Methods",
      content: (
        <>
          <p className="mb-4 text-red-300">
            Unfortunately, Google Cloud does <strong>NOT</strong> support:
          </p>
          <ul className="list-disc list-inside space-y-1 mb-4 text-gray-300">
            <li>PayPal</li>
            <li>Prepaid cards</li>
            <li>Virtual Credit Cards (VCCs)</li>
            <li>Debit cards requiring 2FA</li>
            <li>Wire transfers (for monthly billing)</li>
          </ul>
          <p className="text-gray-400 text-sm">
            If you don't have a supported payment method, consider asking a friend or family member with a credit card to help set up billing.
          </p>
        </>
      ),
      image: "/images/unsupportedpayments.PNG",
      imageAlt: "Unsupported payment methods",
      warning: "PayPal is not accepted by Google Cloud."
    },
    {
      title: "Step 5: Ignore Random Errors",
      content: (
        <>
          <p className="mb-4">
            Sometimes Google Cloud shows random "Failed to load" errors. 
            <strong className="text-green-400"> You can safely ignore these!</strong>
          </p>
          <p className="mb-4">
            Simply click the <strong>"Google Cloud"</strong> logo in the top-left corner to go back to the console overview. 
            Your billing setup is likely already complete!
          </p>
          <p>
            These are just temporary display glitches on Google's side — they don't affect your actual account.
          </p>
        </>
      ),
      image: "/images/randomerrorgoogle.PNG",
      imageAlt: "Random Google Cloud error that can be ignored",
      tip: "Click the Google Cloud logo to return to your dashboard and verify everything is working."
    },
    {
      title: "Step 6: Verify Your New Rate Limits",
      content: (
        <>
          <p className="mb-4">
            After activating billing, go to <strong>AI Studio → Usage and Billing → Rate Limit</strong> to verify your upgrade.
          </p>
          <p className="mb-4">
            You should now see <strong className="text-green-400">"Paid tier 1"</strong> instead of "Free trial".
          </p>
          <p className="mb-4">
            Your rate limits will be much higher now, allowing for smoother gameplay without hitting quotas.
          </p>
        </>
      ),
      image: "/images/ratelimitstier1.PNG",
      imageAlt: "Rate limits showing Paid tier 1",
      tip: "It may take a few minutes for Google to update your tier. Be patient!"
    },
    {
      title: "Step 7: Confirm You Won't Be Billed",
      content: (
        <>
          <p className="mb-4">
            Still worried about surprise bills? You can verify your billing status anytime at the{' '}
            <a 
              href="https://console.cloud.google.com/billing/overview" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-400 underline hover:text-cyan-300"
            >
              Google Cloud Billing Overview
            </a>.
          </p>
          <p className="mb-4">
            Look for <strong className="text-green-400">"Free trial account"</strong> at the top. 
            This confirms you're on the free trial and <strong>won't be billed</strong>.
          </p>
          <p className="mb-4">
            Notice how the screenshot shows: Cost €234 − Savings €234 = <strong className="text-green-400">Total cost €0.00</strong>
          </p>
          <p className="text-gray-400 text-sm">
            As long as it says "Free trial account", your total cost will always be €0.00. 
            Google's own documentation confirms: "Free trial account indicates that your account isn't billed."
          </p>
        </>
      ),
      image: "/images/freetrialaccount.PNG",
      imageAlt: "Billing overview showing Free trial account with €0.00 total cost",
      tip: "Bookmark the Billing Overview page to check your status anytime!"
    },
    {
      title: "Step 8: Understanding 'Am I Going to Be Billed?'",
      content: (
        <>
          <p className="mb-4">
            Here's Google's official explanation of billing accounts:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-gray-300">
            <li><strong>"Paid account"</strong> = You ARE billed for resources you use</li>
            <li><strong>"Free trial account"</strong> = You are <strong className="text-green-400">NOT billed</strong></li>
          </ul>
          <p className="mb-4">
            The key quote: <em className="text-cyan-200">"If you don't upgrade to a Paid billing account, then 30 days after your Free Trial ends, your Free Trial billing account might be suspended."</em>
          </p>
          <p className="text-gray-400 text-sm">
            Translation: If you never upgrade, you'll never be billed. Worst case, the service stops working — but you won't owe anything.
          </p>
        </>
      ),
      image: "/images/amIgoingtogetbilled.PNG",
      imageAlt: "Google documentation explaining Free trial vs Paid accounts",
      tip: "This is straight from Google's official documentation. No surprise bills, ever!"
    },
    {
      title: "You're All Set! 🎉",
      content: (
        <>
          <p className="mb-4">
            Congratulations! Your API key is now on the <strong>Paid tier</strong> with Google's generous free credits.
          </p>
          <p className="mb-4">
            <strong>Important notes:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Your API key in AI Studio may still show "Free trial" — this is a display bug, ignore it</li>
            <li>The Rate Limit page is the source of truth for your actual tier</li>
            <li>Changes can take 5-10 minutes to propagate across Google's systems</li>
            <li><strong className="text-green-400">You will NOT be charged during the free trial</strong> — if credits run out, service stops</li>
            <li>To be billed, you must manually "Upgrade" your account (your choice!)</li>
          </ul>
        </>
      ),
      tip: "Copy your API key and paste it in the game's API Key settings. Enjoy!"
    }
  ];

  if (!isVisible) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (mouseDownTargetRef.current === e.target && e.target === e.currentTarget) {
      onClose();
    }
    mouseDownTargetRef.current = null;
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="vn-modal-panel max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-cyan-300 text-shadow-medium">
            API Key Setup Guide
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close guide"
          >
            ×
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentStep 
                  ? 'bg-cyan-400' 
                  : index < currentStep 
                    ? 'bg-cyan-700' 
                    : 'bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Content area - scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {/* Step title */}
          <h3 className="text-xl font-semibold text-white mb-4">
            {currentStepData.title}
          </h3>

          {/* Step content */}
          <div className="text-gray-200 leading-relaxed mb-4">
            {currentStepData.content}
          </div>

          {/* Tip box */}
          {currentStepData.tip && (
            <div className="bg-cyan-900/30 border border-cyan-700/50 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 text-lg">💡</span>
                <p className="text-cyan-200 text-sm">{currentStepData.tip}</p>
              </div>
            </div>
          )}

          {/* Warning box */}
          {currentStepData.warning && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-lg">⚠️</span>
                <p className="text-red-200 text-sm">{currentStepData.warning}</p>
              </div>
            </div>
          )}

          {/* Screenshot */}
          {currentStepData.image && (
            <div className="mt-4 rounded-lg overflow-hidden border border-white/20 bg-black/30">
              <img 
                src={currentStepData.image} 
                alt={currentStepData.imageAlt || 'Setup screenshot'}
                className="w-full h-auto"
              />
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => goToStep(currentStep - 1)}
            disabled={isFirstStep}
            className={`vn-secondary-button px-6 ${isFirstStep ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            ← Previous
          </button>
          
          <span className="text-gray-400 text-sm">
            Step {currentStep + 1} of {steps.length}
          </span>

          {isLastStep ? (
            <button
              onClick={onClose}
              className="vn-primary-button px-6"
            >
              Done ✓
            </button>
          ) : (
            <button
              onClick={() => goToStep(currentStep + 1)}
              className="vn-primary-button px-6"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
