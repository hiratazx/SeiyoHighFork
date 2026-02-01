/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

export const englishStrings = {
  // Main Menu
  tenDays: 'Seiyo High',
  visualNovelExperience: 'A Visual Novel Experience',
  continue: 'Continue',
  returnToGame: 'Return to Game',
  mainMenu: 'Main Menu',
  newGame: 'New Game',
  start: 'Start',
  exportGame: 'Export Game',
  importGame: 'Import Game',
  importWarningTitle: 'Import Save Game',
  importWarningMessage: 'Importing a save will replace your current game. If you haven\'t backed up your progress, it will be lost forever. We recommend exporting your current save first.',
  replay: 'Replay',
  model: 'Model',
  apiKey: 'API Key',
  website: 'Website',
  promptLogging: 'Prompt Logging',
  on: 'ON',
  off: 'OFF',

  // Name Input
  createYourCharacter: 'Create Your Character',
  whatIsYourName: 'What is your name?',
  enterYourName: 'Enter your name...',
  storyLanguage: 'Story Language',
  storyLanguagePlaceholder: "e.g., 'English', 'Spanish', 'Japanese'",
  begin: 'Begin',
  loading: 'Loading...',
  preparingExperience: 'Preparing your experience...',
  translatingUI: 'Translating UI to', // Will be combined with language name, e.g., "Translating UI to French"
  buildingNarrativeFoundation: 'Building narrative foundation...',
  brainstormingStoryArcs: 'Brainstorming story arcs...',
  generatingRelationshipDynamics: 'Generating relationship dynamics...',
  planningNarrative: 'Planning the first day...',
  translatingItinerary: 'Translating the first day...',
  settingFirstScene: 'Loading the scene...',

  // In-Game
  day: 'Day',
  profile: 'Profile',
  history: 'Story',
  menu: 'Menu',
  itinerary: 'Itinerary',
  motivations: 'Motivations',
  thinking: 'Thinking...',
  typeYourResponse: 'Type your response...',
  send: 'Send',
  nextScene: 'Next Scene',
  
  // Day & Segment Transitions
  segmentMorning: 'Morning',
  segmentAfternoon: 'Afternoon',
  segmentEvening: 'Evening',
  segmentNight: 'Night',

  // Profile Modal
  playerProfile: 'Player Profile',
  affectionLevels: 'Affection Levels',
  personalityAnalysis: 'Psychological Analysis',
  evolvingCharacterTraits: 'Evolving Character Traits',
  noTraitsObserved:
    'No traits have been observed yet. Continue playing to build a profile.',
  close: 'Close',
  directorsAnalysis: "Director's Analysis",
  noAnalysis: 'No analysis available yet. Finish a day to see the summary.',
  analysisFromDay: 'Analysis from End of Day {day}',
  playerAnalysisTitle: "{playerName}'s Analysis",

  // Itinerary Modal
  dailyPlan: 'Daily Plan',
  dayTheme: 'Day Theme',
  segmentGoal: 'Segment Goal',
  keyEvents: 'Key Events',
  characterFocus: 'Character Focus',
  noPlan: 'No plan available for the current day.',
  directorsNotes: "Director's Notes",

  // History Modal
  conversationHistory: 'Conversation History',
  conversationLog: 'Conversation Log',
  factSheet: 'Fact Sheet',

  // Day Transition & Analysis
  endOfDay: 'End of Day',
  analyzingPlayer: 'Analyzing your story...',
  analyzingCharacter: 'Analyzing {characterName}\'s development...',
  storyProgressing: "Planning the next day's events...",
  translatingStoryContent: 'Translating story content to',
  analyzingScene: 'Analyzing scene...',

  // Confirm Modal
  areYouSure: 'Are you sure?',
  newGameWarning: 'Start a new game? Progress will be lost.',
  cancel: 'Cancel',
  confirm: 'Confirm',

  // Replay Menu & Controls
  importSave: 'Import Save File',
  selectDayToReplay: 'Select a day to replay',
  yourMemories: 'Your Memories',
  importedSave: 'Imported Save',
  noImportedMemories: 'No memories in imported save.',
  noMemoriesYet: 'No memories recorded yet. Start playing to create memories!',
  importSaveToReplay: 'Import Save to Replay',
  viewOtherSave: 'View Other Save',
  clearImported: 'Clear Imported',
  play: 'Play',
  pause: 'Pause',
  restart: 'Restart',
  exitReplay: 'Exit Replay',
  speed: 'Speed',
  showEnglish: 'Show English',
  showOriginal: 'Show Original',
  segment: 'Segment',
  skipToEnd: 'Skip',
  nextSegment: 'Next',

  // Model Selection
  selectYourModel: 'AI Model Configuration',
  modelProDescription: 'Highest Quality: Slower, best for immersive storytelling.',
  modelFlashDescription: 'Balanced: Recommended for most users.',
  modelFlashLiteDescription: 'Fastest: Good for rapid testing, less nuance.',

  // API Key Modal
  manageApiKey: 'Manage API Key',
  enterYourApiKey: 'Enter your Gemini API Key',
  save: 'Save',
  apiKeyMissing: 'Please set your API Key first.',

  // End Game Screen
  endGameCongratulations: 'Congratulations!',
  endGameCompletionMessage: 'You have completed this chapter of your story.',
  endGamePlaythroughComplete: 'Playthrough {playthroughCounter} Complete',

  // Veto & End Scene
  endScene: "End Scene",
  vetoEndScene: "Wait, not yet",

  // --- ADD THE FOLLOWING NEW KEYS ---
  exportStory: 'Download Story (.txt)',
  devTools: 'Dev Tools',
  characters: 'Characters',
  storyArcs: 'Story Arcs',
  subplots: 'Subplots',
  relationships: 'Relationships',

  // Profile Modal
  affectionChanges: 'Affection Changes',
  characterAnalysisTitle: "{characterName}'s Analysis",
  noAffectionChangesLogged: 'No affection changes have been logged yet.',
  relationshipDynamics: 'Relationship Dynamics',

  // Story Modal
  noStoryChaptersAvailable: 'No story chapters available yet.',
  
  // Story Modal - Locations Tab
  locations: 'Locations',
  locationsAll: 'All',
  noGeneratedLocations: 'No AI-generated backgrounds yet.',
  enableBackgroundGeneration: 'Enable "AI Background Generation" in Model Settings.',
  newImage: 'New Image',
  generatingImage: 'Generating...',
  newImageTooltip: 'Generate a new version of this background image',
  loadingLocations: 'Loading locations...',
  confirmNewImageTitle: 'Generate New Image?',
  confirmNewImageMessage: 'This will generate a new background image and replace the current one. The old image will be permanently deleted. Are you sure?',
  
  // Story Modal - Characters Tab
  noGeneratedCharacters: 'No AI-generated character sprites yet.',
  enableSpriteGeneration: 'Enable "AI Character Sprite Generation" in Model Settings.',
  newPortrait: 'New Portrait',
  generatingPortrait: 'Generating...',
  newPortraitTooltip: 'Generate a new portrait for this character',
  confirmNewPortraitTitle: 'Generate New Portrait?',
  confirmNewPortraitMessage: 'This will generate a new character portrait and replace the current one. The old portrait will be permanently deleted. Are you sure?',
  
  // Common confirmation
  confirmYes: 'Yes, Generate New',
  confirmCancel: 'Cancel',
  
  // Fix Background confirmation (main game screen)
  fixBackground: 'Fix Background',
  fixingBackground: 'Fixing...',
  confirmFixBackgroundTitle: 'Regenerate Background?',
  confirmFixBackgroundMessage: 'This will generate a new background image for the current scene and replace the existing one. Are you sure?',
  stockImageCannotRegenerate: 'This is a stock image - only generated images can be regenerated.',

  // Itinerary Modal
  noItineraryAvailable: 'No itinerary available for this day.',

  // Model Fallback Modal
  modelFallbackTitle: 'Model Unavailable',
  modelFallbackMessage: 'The AI model ({failedModel}) is experiencing high demand. You can retry, or switch to a faster model ({fallbackModel}) for this action.',
  modelFallbackMessageNoAlternative: 'The AI model ({failedModel}) is experiencing high demand. Please try again or cancel.',
  retryWithModel: 'Retry with {modelName}',
  switchToModel: 'Use {modelName} (Faster)',

  // ===== PIPELINE STEP LABELS =====
  // New Game Pipeline
  pipelineNewGameInitializing: 'Initializing...',
  pipelineNewGameTranslatingUI: 'Translating UI...',
  pipelineNewGameBuildingFoundation: 'Building narrative foundation...',
  pipelineNewGameRelationships: 'Generating relationship dynamics...',
  pipelineNewGameTraits: 'Developing character traits...',
  pipelineNewGamePlanning: 'Planning the first day...',
  pipelineNewGameSettingScene: 'Loading the scene...',
  pipelineNewGameFinalizing: 'Finalizing...',

  // Segment Transition Pipeline
  pipelineSegmentAnalysis: 'Analyzing the last scene...',
  pipelineSegmentGeneratingScene: 'Setting the next scene...',
  pipelineSegmentStateUpdate: 'Advancing time...',

  // End of Day Pipeline
  pipelineEodArchiving: 'Archiving final moments...',
  pipelineEodRelationships: 'Analyzing relationship shifts...',
  pipelineEodCasting: 'Reviewing cast performances...',
  pipelineEodPlayerAnalysis: 'Analyzing your choices...',
  pipelineEodNovelChapter: "Writing today's novel chapter...",
  pipelineEodArchivist: 'Extracting key facts...',
  pipelineEodArcManager: 'Analyzing story arc progress...',
  pipelineEodCharacterDeveloper: 'Evolving character traits...',
  pipelineEodPlanner: "Planning tomorrow's events...",
  pipelineEodSceneGeneration: "Setting tomorrow's opening scene...",
  pipelineEodSaving: 'Saving progress...',
};

export type TranslationSet = typeof englishStrings;