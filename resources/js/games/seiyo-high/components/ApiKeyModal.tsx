/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, {useState, useEffect, useRef} from 'react';
import { TranslationSet } from '../lib/translations';
import { ProviderId, PROVIDERS } from '../lib/modelConfig';

interface ApiKeyModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (keys: { [provider: string]: string }) => void;
  onImport: (key: string, provider: ProviderId) => void;
  onOpenSetupGuide: () => void;
  apiKeys: { [provider: string]: string };
  t: TranslationSet;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isVisible, onClose, onSave, onImport, onOpenSetupGuide, apiKeys, t }) => {
  const [keys, setKeys] = useState<{ [provider: string]: string }>({});
  const [activeTab, setActiveTab] = useState<ProviderId>('gemini');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (isVisible) {
      const initialKeys: { [provider: string]: string } = {};
      PROVIDERS.forEach(p => {
         const loadedKey = Array.isArray(apiKeys[p.id])
             ? (apiKeys[p.id][0] || '')
             : (apiKeys[p.id] || '');
         initialKeys[p.id] = loadedKey;
      });
      setKeys(initialKeys);
    }
  }, [isVisible, apiKeys]);

  if (!isVisible) {
    return null;
  }

  // Track where mousedown started to prevent closing when dragging text outside modal
  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if both mousedown and click happened on the backdrop itself
    if (mouseDownTargetRef.current === e.target && e.target === e.currentTarget) {
      onClose();
    }
    mouseDownTargetRef.current = null;
  };

  const handleKeyChange = (value: string) => {
    setKeys(prev => ({
      ...prev,
      [activeTab]: value,
    }));
  };
  
  const handleSave = () => {
    onSave(keys);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
            const importedKey = text.split(/[,;]/).map(k => k.trim()).filter(Boolean)[0] || '';
            onImport(importedKey, activeTab);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const hasKey = (keys[activeTab] || '').trim() !== '';

  const TabButton: React.FC<{ provider: { id: ProviderId; displayName: string } }> = ({ provider }) => (
    <button
      onClick={() => setActiveTab(provider.id)}
      className={`px-4 py-2 rounded-t-lg font-semibold transition-colors text-sm ${
        activeTab === provider.id
          ? 'bg-slate-700/50 text-white border-b-2 border-cyan-400'
          : 'bg-transparent text-gray-400 hover:bg-slate-800/50 hover:text-gray-200'
      }`}
    >
      {provider.displayName}
    </button>
  );

  return (
    <div 
      className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" 
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="vn-modal-panel max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-center mb-2 text-shadow-medium">
          {t.manageApiKey}
        </h2>
        
        {/* Setup guide link */}
        <div className="text-center mb-4">
          <button
            onClick={onOpenSetupGuide}
            className="text-cyan-400 hover:text-cyan-300 underline text-sm transition-colors"
          >
            📖 Need help setting up your API key?
          </button>
        </div>
        
        <div className="border-b-2 border-white/20 mb-4 -mx-6 px-6">
          <div className="flex space-x-2">
            {PROVIDERS.map(p => <TabButton key={p.id} provider={p} />)}
          </div>
        </div>

        <div className="flex flex-col gap-6 max-h-[65vh] overflow-y-auto custom-scrollbar pr-2">
            <div>
                <h3 className="text-lg text-gray-300 mb-2">API Key ({PROVIDERS.find(p => p.id === activeTab)?.displayName})</h3>
                <input
                    id={`api-key-${activeTab}`}
                    type="password"
                    value={keys[activeTab] || ''}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    className="vn-text-input text-base w-full"
                    placeholder={`Enter ${PROVIDERS.find(p => p.id === activeTab)?.displayName} Key`}
                />
            </div>

            <div>
                <button onClick={handleImportClick} className="vn-secondary-button w-full">
                    Import Key from File (.txt)
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".txt,text/plain" className="hidden" />
            </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
            <button
                onClick={onClose}
                className="vn-primary-button w-36"
                aria-label={t.cancel}
            >
                {t.cancel}
            </button>
            <button
                onClick={handleSave}
                disabled={!hasKey}
                className="vn-primary-button w-36"
                aria-label={t.save}
            >
                {t.save}
            </button>
        </div>
      </div>
    </div>
  );
};
