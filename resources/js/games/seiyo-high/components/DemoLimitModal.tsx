/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

interface DemoLimitModalProps {
  isVisible: boolean;
  onExportSave: () => void;
  onClose: () => void;
  lastDemoDay: number;
}

export const DemoLimitModal: React.FC<DemoLimitModalProps> = ({
  isVisible,
  onExportSave,
  onClose,
  lastDemoDay,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="vn-modal-panel max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-5xl mb-4 block">🎉</span>
          <h2 className="text-2xl font-bold text-cyan-300 text-shadow-medium mb-2">
            You've Completed the Demo!
          </h2>
          <p className="text-gray-300">
            You've played through Day {lastDemoDay} of the HuggingFace demo.
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Progress is safe message */}
          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💾</span>
              <div>
                <h3 className="text-green-300 font-medium mb-1">Your Progress is Safe!</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Export your save below and import it on the full version to continue your story exactly where you left off.
                </p>
              </div>
            </div>
          </div>

          {/* Continue at full version */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/50">
            <h3 className="text-cyan-300 font-medium mb-2">Continue Your Adventure</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              The full version at ainime-games.com offers:
            </p>
            <ul className="text-gray-300 text-sm space-y-1 ml-4">
              <li>• Unlimited gameplay (50+ in-game days)</li>
              <li>• All languages supported</li>
              <li>• Cloud save sync</li>
              <li>• Multiple stories coming soon</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onExportSave}
            className="vn-primary-button w-full py-3"
          >
            <span className="flex items-center justify-center gap-2">
              <span>📥</span>
              Export My Save
            </span>
          </button>
          
          <a
            href="https://ainime-games.com"
            target="_blank"
            rel="noopener noreferrer"
            className="vn-secondary-button w-full py-3 text-center block"
          >
            <span className="flex items-center justify-center gap-2">
              <span>🌐</span>
              Visit ainime-games.com
            </span>
          </a>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 text-sm mt-2 transition-colors"
          >
            Close (you can still explore the game)
          </button>
        </div>
      </div>
    </div>
  );
};
