/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tlint:disable */
import {Type} from '@google/genai';
import {englishStrings, TranslationSet} from './lib/translations';
import { CharacterConfig } from './types';

// Default day structure for schema generation
const defaultDayStructure = ['Morning', 'Afternoon', 'Evening', 'Night'];

export const baseResponseSchema = {
  type: 'object',
  properties: {
    scene: {
      type: 'array',
      description: "An array of dialogue/narration entries for the current turn.",
      items: {
        type: 'object',
        properties: {
          speaker: { type: 'string', description: "The name of the character speaking, or 'Narrator'." },
          dialogue: { type: 'string', description: "The canonical, GOLDEN SOURCE version of the dialogue or narration, which MUST always be in ENGLISH." },
          expression: { type: 'string', description: "The character's facial expression." },
          sprite_set: { type: 'string', description: "The name of the sprite set to use (e.g., 'default', 'swimsuit'). Defaults to 'default' if not specified." },
          motivation: { type: 'string', description: "The canonical, ENGLISH version of the character's internal motivation for this line." },
        },
        required: ['speaker', 'dialogue', 'motivation', 'expression', 'sprite_set']
      },
    },
    present_characters: { type: 'array', items: { type: 'string' }, description: "An array of all characters currently present in the scene. If no characters are present in the scene (e.g., a solo scene with only narration), you MUST include 'Narrator' as the only entry in this array." },
    location_hint: { type: 'string', description: "A keyword for the background image for this scene." },
    player_choices: { 
      type: 'array', 
      items: { type: 'string' }, 
      nullable: true, 
      description: "An array containing exactly one player choice in ENGLISH. CRITICAL FORMATTING RULE: If the choice is a physical action the player would DO, the string MUST be wrapped in asterisks (e.g., '*Look around*'). If it is something the player would SAY, it must be plain text." 
    },
    affection_changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          character: { type: 'string', description: "The character's first name." },
          change: { type: 'number', description: "The numerical change in affection (e.g., 1, -1)." },
          reason: { type: 'string', description: "The canonical, ENGLISH reason for the affection change." },
        },
        required: ['character', 'change', 'reason']
      },
      nullable: true,
      description: "An array of objects detailing any changes in character affection that occurred this turn."
    },
    end_of_segment: { type: 'boolean', nullable: true, description: "Set to true ONLY when the current scene should conclude and transition to the next segment." },
    question_asked_by: { type: 'string', nullable: true, description: "If an NPC asks a question from the Curiosity Protocol, set this to their name." },
  },
  required: ['scene', 'present_characters', 'location_hint']
};

export const responseSchemaTranslationAddon = {
    dialogueTranslated: { type: 'string', nullable: true, description: "The user-facing translation of the 'dialogue' field into the player's chosen language. Omit if the language is English." },
    motivationTranslated: { type: 'string', nullable: true, description: "The user-facing translation of the 'motivation' field. Omit if the language is English." },
    player_choices_translated: { 
        type: 'array', 
        items: { type: 'string' }, 
        nullable: true, 
        description: "The user-facing translation of the 'player_choices' array. You MUST preserve the asterisks if they were present in the English source." 
    },
    reasonTranslated: {
        type: 'string',
        nullable: true,
        description: "The user-facing translation of the 'reason' field. Omit if the language is English."
    },
    playerDialogueEnglish: { type: 'string', nullable: true, description: "The AI's canonical ENGLISH translation of the player's last input. Only include if the game is in a non-English language." },
};

export const dailyItinerarySchema = {
  type: Type.OBJECT,
  properties: {
    day_theme: {
      type: Type.STRING,
      description: "A short, thematic title for the day's events, like 'A Surprising Alliance' or 'The Weight of Secrets'."
    },
    segments: {
      type: Type.ARRAY,
      description: `An array of ${defaultDayStructure.length} objects, one for each segment of the day: ${defaultDayStructure.join(', ')}.`,
      items: {
        type: Type.OBJECT,
        properties: {
          segment: { type: Type.STRING, description: `Must be one of: '${defaultDayStructure.join("', '")}'.`},
          scenarioProse: {
            type: Type.STRING,
            description: "A multi-paragraph prose scenario for this segment. This is NOT a checklist. It must describe the scene's setup, character motivations, and the core dilemmas or choices the player should face, including embedded (DM MANDATE: ...) instructions."
          },
          location_hint: {
            type: Type.STRING,
            description: 'The specific name of the location where this segment should primarily take place. MUST exactly match one of the location names provided in the world context for the corresponding segment of the day.'
          },
          character_focus: {
            type: Type.ARRAY,
            description: "An array of character names who are central to this segment's events.",
            items: { type: Type.STRING }
          },
          character_role_check: {
            type: Type.ARRAY,
            description: "MANDATORY. An array of objects. For EACH character (Main and Side) in this segment's `character_focus` array, add an object with 'name' and 'role' properties. The 'name' MUST be the character's full name, and the 'role' MUST be copied VERBATIM from the <CharacterRoleQuickReference>.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The character's full name." },
                    role: { type: Type.STRING, description: "The character's role, copied verbatim." }
                },
                required: ['name', 'role']
            }
          }
        },
        required: ['segment', 'scenarioProse', 'location_hint', 'character_focus', 'character_role_check']
      }
    }
  },
  required: ['day_theme', 'segments']
};

export const fullItinerarySchema = {
  type: Type.ARRAY,
  description: "A full 14-day itinerary, which is an array of daily itinerary objects.",
  items: dailyItinerarySchema,
};

export const storyArcSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A short, catchy title for the story arc." },
    summary: { type: Type.STRING, description: "A 1-2 sentence summary of the arc's plot." },
    key_beats: {
      type: Type.ARRAY,
      description: "An array of 3-5 key events or scenes that define the progression of this arc.",
      items: { type: Type.STRING }
    }
  },
  required: ['title', 'summary', 'key_beats']
};

// ADDED: New schema for a single story arc beat.
const storyArcBeatSchema = {
  type: Type.OBJECT,
  properties: {
    beat: { type: Type.NUMBER },
    description: { type: Type.STRING },
    status: { type: Type.STRING, enum: ['pending', 'completed'] },
    requiredAffection: { type: Type.NUMBER },
  },
  required: ['beat', 'description', 'status', 'requiredAffection'],
};

// MODIFIED: Updated to use Type enum, added 'stalled', and added 'storyArcBeats'.
export const evolvingStoryArcSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    involvedCharacters: { type: Type.ARRAY, items: { type: Type.STRING } },
    status: { type: Type.STRING, enum: ['ongoing', 'concluded', 'dormant', 'stalled'] },
    startDay: { type: Type.NUMBER },
    endDay: { type: Type.NUMBER },
    storyArcBeats: {
      type: Type.ARRAY,
      items: storyArcBeatSchema,
      nullable: true,
    }
  },
  required: ['id', 'title', 'summary', 'involvedCharacters', 'status', 'startDay'],
};

const buildCharacterLikesDislikesSchemaPart = (description: string) => {
    const properties: {[key: string]: object} = {};
    // Placeholder for dynamic schema generation.
    // Actual characters are injected at runtime or backend.
    // currentStory.characters.forEach(char => { ... });
    return {
        type: Type.OBJECT,
        properties: properties, // Empty initially
        description: description,
        required: [],
    };
};

// Schema for the initial story foundation generation (story arcs + structured dynamics only)
export const initialStoryFoundationSchema = {
  type: Type.OBJECT,
  properties: {
    story_arcs: {
      type: Type.ARRAY,
      description: `An array of story arcs, one foundational, personal story arc for each of the main characters.`,
      items: evolvingStoryArcSchema
    },
  },
  required: ['story_arcs']
};

const buildTranslationSchema = () => {
  const properties: {[key: string]: {type: Type; description: string}} = {};
  const requiredKeys: string[] = [];
  const typedEnglishStrings = englishStrings as TranslationSet;

  for (const key in typedEnglishStrings) {
    if (Object.prototype.hasOwnProperty.call(typedEnglishStrings, key)) {
      requiredKeys.push(key);
      properties[key] = {
        type: Type.STRING,
        description: `Translation for the english text: "${
          typedEnglishStrings[key as keyof TranslationSet]
        }"`,
      };
    }
  }

  return {
    type: Type.OBJECT,
    properties,
    required: requiredKeys,
  };
};

export const uiTranslationSchema = buildTranslationSchema();

export const novelChapterSchema = {
  type: Type.OBJECT,
  properties: {
    proseChapter: {
      type: Type.STRING,
      description: "The full text of the new novel chapter, written in a beautiful, prose-based narrative style from the player's first-person perspective."
    },
    brutalSummary: {
        type: Type.ARRAY,
        description: "A list of 3-5 concise, single-sentence bullet points summarizing only the most critical, plot-altering events of the day from a third-person, objective perspective.",
        items: { type: Type.STRING }
    }
  },
  required: ['proseChapter', 'brutalSummary']
};

// Schema for the Transition Director's response.
export const baseTransitionDirectorSchema = {
  type: Type.OBJECT,
  properties: {
    revised_itinerary_segment: {
      type: Type.OBJECT,
      description: "MANDATORY. The revised and improved prose scenario for the upcoming segment, polished to reflect the immediate past.",
      properties: {
        scenarioProse: {
          type: Type.STRING,
          description: "The revised multi-paragraph prose scenario, explaining the new setup, motivations, and dilemmas, including embedded (DM MANDATE: ...) instructions."
        },
        location_hint: {
          type: Type.STRING,
          description: 'The specific, valid location name for this revised scene.'
        },
        character_focus: {
            type: Type.ARRAY,
            description: "An array of character names who are central to this revised segment's events.",
            items: { type: Type.STRING },
        },
        character_role_check: {
            type: Type.ARRAY,
            description: "MANDATORY. An array of objects. For EACH character (Main and Side) in this segment's `character_focus` array, add an object with 'name' and 'role' properties. The 'name' MUST be the character's full name, and the 'role' MUST be copied VERBATIM from the <CharacterRoleQuickReference>.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The character's full name." },
                    role: { type: Type.STRING, description: "The character's role, copied verbatim." }
                },
                required: ['name', 'role']
            }
        }
      },
      required: ['scenarioProse', 'location_hint', 'character_focus', 'character_role_check']
    },
    opening_scene: {
      type: Type.OBJECT,
      description: "The first 1-4 lines of dialogue and narration for the new scene.",
      properties: {
        scene: {
          type: Type.ARRAY,
          description: "An array of dialogue/narration entries that start the scene.",
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING, description: "The name of the character speaking, or 'Narrator'." },
              dialogue: { type: Type.STRING, description: "The canonical, GOLDEN SOURCE version of the dialogue or narration, which MUST always be in ENGLISH." },
              expression: { type: Type.STRING, nullable: true, description: "The character's facial expression." },
              sprite_set: { type: Type.STRING, nullable: true, description: "The name of the sprite set to use. Defaults to 'default' if not specified." },
              motivation: { type: Type.STRING, nullable: true, description: "The canonical, ENGLISH version of the character's internal motivation for this line." },
            },
            required: ['speaker', 'dialogue']
          },
        },
        present_characters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of all characters present at the start of the scene." },
        location_hint: { type: Type.STRING, description: "A keyword for the background image for this scene." },
        player_choices: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          nullable: true, 
          description: "An array containing exactly one player choice in ENGLISH. CRITICAL FORMATTING RULE: If the choice is a physical action the player would DO, the string MUST be wrapped in asterisks (e.g., '*Look around*'). If it is something the player would SAY, it must be plain text." 
        },
      },
      required: ['scene', 'present_characters', 'location_hint']
    },
    opening_scene_role_check: {
      type: Type.ARRAY,
      description: "MANDATORY. An array of objects. For EACH character (Main and Side) in the `opening_scene.present_characters` array, add an object with 'name' and 'role' properties. The 'name' MUST be the character's full name, and the 'role' MUST be copied VERBATIM from the <CharacterRoleQuickReference>.",
      items: {
          type: Type.OBJECT,
          properties: {
              name: { type: Type.STRING, description: "The character's full name." },
              role: { type: Type.STRING, description: "The character's role, copied verbatim." }
          },
          required: ['name', 'role']
      }
    }
  },
  required: ['opening_scene', 'opening_scene_role_check', 'revised_itinerary_segment']
};

// NOTE: This addon is nearly identical to the responseSchema one.
// This is a great example of composability.
export const transitionDirectorSchemaTranslationAddon = {
    dialogueTranslated: { type: 'string', nullable: true, description: "The user-facing translation of the 'dialogue' field into the player's chosen language. Omit if the language is English." },
    motivationTranslated: { type: 'string', nullable: true, description: "The user-facing translation of the 'motivation' field. Omit if the language is English." },
    player_choices_translated: { 
        type: 'array', 
        items: { type: 'string' }, 
        nullable: true, 
        description: "The user-facing translation of the 'player_choices' array. You MUST preserve the asterisks if they were present in the English source." 
    },
};

// Helper function to build the properties for the character profiles object
// NOTE: This function is kept for backward compatibility but is no longer used for RelationshipAnalyst
// The backend now uses an array format instead of dynamic object keys
export const buildCharacterProfilesSchema = (characters: CharacterConfig[]) => {
  const properties: {[key: string]: {type: Type, description: string}} = {};
  // Dynamically create a property for each character in the provided list
  characters.forEach(char => {
    properties[char.name] = {
      type: Type.STRING,
      description: `The updated psychological profile for ${char.name}. Include this only if the character was present in the scene.`
    };
  });
  return properties;
};

export const baseStateAnalystSchema = {
  type: Type.OBJECT,
  properties: {
    updated_relationship_dynamics: {
      type: Type.STRING,
      description: "The complete, rewritten narrative summary of all key interpersonal relationships, in canonical ENGLISH."
    },
    // Updated to array format to match backend schema
    updated_character_profiles: {
      type: Type.ARRAY,
      description: "List of updated psychological profiles for characters present in the scene.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "The name of the character."
          },
          profile: {
            type: Type.STRING,
            description: "The updated psychological profile text in canonical ENGLISH."
          }
        },
        required: ['name', 'profile']
      }
    },
    newly_inspired_questions: {
      type: Type.ARRAY,
      nullable: true,
      description: "An array of objects, where each object contains a character's name and a single, profound question they are now pondering about the player. Only include characters with high affection (7+) who had a resonant moment.",
      items: {
        type: Type.OBJECT,
        properties: {
          character: { type: Type.STRING },
          question: { type: Type.STRING }
        },
        required: ['character', 'question']
      }
    },
    new_chronicle_entries: {
      type: Type.ARRAY,
      nullable: true,
      description: "An array of pivotal memories experienced by characters present in the scene, from their unique perspective.",
      items: {
        type: Type.OBJECT,
        properties: {
          character: { type: Type.STRING, description: "The name of the character whose memory this is." },
          summary: { type: Type.STRING, description: "A concise, one-sentence summary of the event from their perspective." },
          category: { type: Type.STRING, description: "The category of the memory: 'Core Memory', 'Intimacy Milestone', 'Conflict', 'Social Observation', or 'Fact'." },
          participants: {
            type: Type.ARRAY,
            description: "An array of names for all characters who directly participated in or witnessed this specific event.",
            items: { type: Type.STRING }
          }
        },
        required: ['character', 'summary', 'category', 'participants']
      }
    }
  },
  required: ['updated_relationship_dynamics', 'updated_character_profiles']
};

export const stateAnalystSchemaTranslationAddon = {
    updated_relationship_dynamics_translated: {
        type: Type.STRING,
        nullable: true,
        description: "The user-facing translation of the relationship dynamics summary. Omit if language is English."
    },
    // Updated to array format to match backend schema
    updated_character_profiles_translated: {
        type: Type.ARRAY,
        nullable: true,
        description: "Localized versions of the character profiles.",
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                profile: { type: Type.STRING }
            },
            required: ['name', 'profile']
        }
    },
};

export const playerAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        new_psychoanalysis_prose: {
            type: Type.STRING,
            description: "The new, insightful psychoanalysis of the player's emergent personality based on their actions during the day's events."
        },
        updated_player_backstory: {
            type: Type.STRING,
            description: "The rewritten player backstory, integrating any new, factual revelations from the day's events."
        }
    },
    required: ['new_psychoanalysis_prose', 'updated_player_backstory']
};

export const buildPsychologicalProfilesSchemaPart = (characters: CharacterConfig[]) => {
    const properties: {[key: string]: {type: Type, description: string}} = {
        player: {
            type: Type.STRING,
            description: "The translated psychological profile for the player character."
        }
    };
    // Check if characters array is valid before mapping
    const safeCharacters = Array.isArray(characters) ? characters : [];
    
    const required = ['player', ...safeCharacters.map(c => c.name)];
    safeCharacters.forEach(char => {
        properties[char.name] = {
            type: Type.STRING,
            description: `The translated psychological profile for ${char.name}.`
        };
    });
    return {
        type: Type.OBJECT,
        properties: properties,
        description: "An object containing the translated psychological profiles for the player and all NPCs.",
        required: required,
    };
}

export const endOfDayTranslationSchema = {
    type: Type.OBJECT,
    properties: {
        novelChapter: {
            type: Type.STRING,
            description: "The translated version of the novel chapter."
        },
        playerProse: {
            type: Type.STRING,
            description: "The translated version of the player's prose analysis."
        },
        profiles: buildPsychologicalProfilesSchemaPart([]), // Pass empty array, real schema is built dynamically in service
        itinerary: fullItinerarySchema,
        relationshipDynamics: {
            type: Type.STRING,
            description: "The translated version of the relationship dynamics summary."
        },
    },
    required: ['novelChapter', 'playerProse', 'profiles', 'itinerary', 'relationshipDynamics']
};

export const subplotSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A short, descriptive title for the subplot." },
        summary: { type: Type.STRING, description: "A prose-based summary of the subplot's history, key events, and current emotional state." },
        status: { type: Type.STRING, description: "The current status of the subplot. Must be one of: 'ongoing', 'concluded', 'stalled'." },
        involvedCharacters: { type: Type.ARRAY, items: { type: 'string' }, description: "A list of characters central to this subplot." }
    },
    required: ['title', 'summary', 'status', 'involvedCharacters']
};

/**
 * Dynamically generates the JSON schema properties for a non-nullable string value
 * for each character in the provided list.
 */
export function buildCharacterStringSchema(characters: CharacterConfig[]): { [key: string]: { type: Type, description: string } } {
  const properties: { [key: string]: { type: Type, description: string } } = {};
  for (const character of characters) {
    properties[character.name] = {
      type: Type.STRING,
      description: `The updated evolving persona for ${character.name}.`
    };
  }
  return properties;
}

export const nextDayResponseSchema = {
  type: 'object',
  properties: {
    itinerary: dailyItinerarySchema,
    updated_scheduled_events: {
      type: 'array',
      description: "The complete, updated list of all scheduled events, with the 'isComplete' status correctly set for any events that were concluded in the previous day's transcript.",
      items: {
        type: 'object',
        properties: {
          day: { type: 'number' },
          description: { type: 'string' },
          isComplete: { type: 'boolean' }
        },
        required: ['day', 'description', 'isComplete']
      }
    }
  },
  required: [
    'itinerary',
    'updated_scheduled_events' 
  ],
};