/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React from 'react';
import { TranslationSet } from '../lib/translations';
import { PsychologicalProfiles, AffectionChange, CharacterConfig, RelationshipDynamicsStructured } from '../types';

interface ProfileModalProps {
  isVisible: boolean;
  onClose: () => void;
  affection: {[key: string]: number};
  t: TranslationSet;
  characters: CharacterConfig[];
  mainCharacters: CharacterConfig[];
  playerName: string;
  language: string;
  // Canonical English props
  playerPsychoanalysisProse: string | null;
  psychologicalProfiles: PsychologicalProfiles | null;
  affectionLog: { [day: number]: AffectionChange[] };
  relationshipDynamics: string | null;
  // Translated "Doppelganger" props
  playerPsychoanalysisProseTranslated?: string | null;
  psychologicalProfilesTranslated?: PsychologicalProfiles | null;
  affectionLogTranslated?: { [day: number]: AffectionChange[] };
  relationshipDynamicsTranslated?: string | null;
  relationshipDynamicsStructured?: RelationshipDynamicsStructured | null;
  relationshipDynamicsStructuredTranslated?: RelationshipDynamicsStructured | null;
  currentDay: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ 
  isVisible, 
  onClose, 
  affection, 
  t, 
  characters, 
  mainCharacters,
  playerName, 
  language,
  playerPsychoanalysisProse, 
  psychologicalProfiles, 
  playerPsychoanalysisProseTranslated, 
  psychologicalProfilesTranslated, 
  currentDay,
  affectionLog,
  affectionLogTranslated,
  relationshipDynamics,
  relationshipDynamicsTranslated,
  relationshipDynamicsStructured,
  relationshipDynamicsStructuredTranslated,
}) => {
  if (!isVisible) {
    return null;
  }

  const isEnglish = language?.toLowerCase() === 'english';
  const analysisForDisplay = (!isEnglish && playerPsychoanalysisProseTranslated) ? playerPsychoanalysisProseTranslated : playerPsychoanalysisProse;
  // In English, always show English profiles. In other languages, prefer translated when non-empty.
  const profilesForDisplay = React.useMemo(() => {
    if (isEnglish) return psychologicalProfiles;

    // Array formats are handled later unchanged.
    if (Array.isArray(psychologicalProfilesTranslated) || Array.isArray(psychologicalProfiles)) {
      const translatedArray = Array.isArray(psychologicalProfilesTranslated) ? psychologicalProfilesTranslated : null;
      if (translatedArray && translatedArray.length > 0) {
        return translatedArray;
      }
      return psychologicalProfiles;
    }
    const translated = psychologicalProfilesTranslated;
    const hasTranslated = translated && Object.keys(translated).length > 0;
    if (hasTranslated) return translated;
    return psychologicalProfiles;
  }, [isEnglish, psychologicalProfiles, psychologicalProfilesTranslated]);

  const analysisDay = currentDay > 1 ? currentDay - 1 : 1;

  const mainCharacterNamesSet = React.useMemo(() => new Set(mainCharacters.map(mc => mc.name)), [mainCharacters]);
  const logForDisplay = (!isEnglish && affectionLogTranslated) ? affectionLogTranslated : affectionLog;
  const filteredLogEntries = React.useMemo(() => Object.entries(logForDisplay)
    .map(([day, changes]) => {
      const filteredChanges = changes.filter(change => mainCharacterNamesSet.has(change.character));
      return [day, filteredChanges] as const; // Ensure tuple type
    })
    .filter(([_, filteredChanges]) => filteredChanges.length > 0) // Remove days with no relevant changes
    .sort(([dayA], [dayB]) => Number(dayB) - Number(dayA)), // Sort days descending
  [logForDisplay, mainCharacterNamesSet]);

  // Helper to get character color (keep using the full 'characters' list)
  const getCharacterColor = (characterName: string) => {
    const character = characters.find(c => c.name === characterName);
    return character ? character.color : 'text-white';
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-cyan-300">{t.profile}</h2>
        </div>

        <div className="p-6 flex-grow overflow-y-auto space-y-6 custom-scrollbar">
          {/* Affection Changes Section */}
          <div>
            <h3 className="text-xl font-semibold text-pink-300 mb-3 border-b border-pink-500/30 pb-2">
              {t.affectionChanges}
            </h3>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {filteredLogEntries.length > 0 ? (
                filteredLogEntries
                  .map(([day, changes]) => ( // Already sorted
                    <div key={day}>
                      <p className="font-bold text-slate-300">{t.day} {day}:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1 text-slate-400">
                        {changes.map((change, index) => (
                          <li key={index}>
                            <span className={`${getCharacterColor(change.character)} font-semibold`}>
                              {change.character}
                            </span>
                            : {change.change > 0 ? `+${change.change}` : change.change} - <span className="italic">"{change.reason}"</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
              ) : (
                <p className="text-slate-500 italic">{t.noAffectionChangesLogged}</p>
              )}
            </div>
          </div>
          
          {/* Affection Levels Section */}
          <div>
            <h3 className="text-xl font-semibold text-pink-300 mb-3 border-b border-pink-500/30 pb-2">{t.affectionLevels}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {mainCharacters.map(char => (
                <div key={char.name} className="bg-slate-900/50 p-3 rounded-md">
                  <span className={`${char.color} font-bold`}>{char.name}:</span>
                  <span className="text-white ml-2">{affection[char.name] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Psychological Analysis Section */}
          <div>
            <h3 className="text-xl font-semibold text-pink-300 mb-3 border-b border-pink-500/30 pb-2">{t.personalityAnalysis}</h3>
             <small className="block text-center text-sm text-gray-400 mb-4 -mt-2">
              {t.analysisFromDay.replace('{day}', String(analysisDay))}
            </small>
            <div className="space-y-4">
              {/* Player Analysis */}
              <div className="bg-slate-900/50 p-4 rounded-md">
                <h4 className="font-bold text-cyan-400 mb-2">{t.playerAnalysisTitle.replace('{playerName}', playerName)}</h4>
                <p className="text-slate-300 whitespace-pre-wrap">
                  {analysisForDisplay || t.noAnalysis}
                </p>
              </div>

              {/* Character Analyses */}
              {profilesForDisplay && characters.map(char => {
                let profileText = '';

                // Handle Array Format (New Schema)
                if (Array.isArray(profilesForDisplay)) {
                  const entry = profilesForDisplay.find((p: any) => p.name === char.name);
                  profileText = entry ? entry.profile : '';
                } 
                // Handle Object Format (Legacy Save Data)
                else if (typeof profilesForDisplay === 'object' && profilesForDisplay !== null) {
                  // @ts-ignore - We know it's an object here
                  profileText = profilesForDisplay[char.name] || '';
                }

                if (!profileText) return null;

                return (
                  <div key={char.name} className="bg-slate-900/50 p-4 rounded-md">
                    <h4 className={`font-bold ${char.color} mb-2`}>
                      {t.characterAnalysisTitle.replace('{characterName}', char.name)}
                    </h4>
                    <p className="text-slate-300 whitespace-pre-wrap">
                      {profileText}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 text-right">
          <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200">
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};