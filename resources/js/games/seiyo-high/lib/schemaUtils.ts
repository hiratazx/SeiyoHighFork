// In src/lib/schemaUtils.ts

/**
 * A simple deep copy function to prevent schema mutation.
 */
function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  const copy = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (copy as any)[key] = deepCopy(obj[key]);
    }
  }
  return copy as T;
}

/**
 * Dynamically constructs a JSON schema by adding translation-related fields
 * only if the language is not English. This is a generic builder.
 * @param baseSchema The core, non-translatable schema object.
 * @param translationAddons An object containing the translation fields to add.
 * @param language The current game language string.
 * @returns The fully constructed, language-appropriate schema.
 */
export function buildDynamicSchema(
  baseSchema: any,
  translationAddons: any,
  language: string
): object {
  const schema = deepCopy(baseSchema);

  if (language.toLowerCase() === 'english') {
    return schema; // Return the base schema as-is.
  }

  // If multilingual, surgically add the translation properties.
  // This logic handles nested structures for different agent schemas.

  // For DungeonMaster & TransitionDirector schemas (nested scene objects)
  const sceneItems = schema.properties?.scene?.items?.properties;
  if (sceneItems) {
    Object.assign(sceneItems, {
      dialogueTranslated: translationAddons.dialogueTranslated,
      motivationTranslated: translationAddons.motivationTranslated,
    });
  }
  const openingSceneItems = schema.properties?.opening_scene?.properties?.scene?.items?.properties;
  if (openingSceneItems) {
    Object.assign(openingSceneItems, {
        dialogueTranslated: translationAddons.dialogueTranslated,
        motivationTranslated: translationAddons.motivationTranslated,
    });
  }

  // For DungeonMaster & TransitionDirector schemas (nested affection_changes)
  const affectionItems = schema.properties?.affection_changes?.items?.properties;
  if (affectionItems && translationAddons.reasonTranslated) {
      affectionItems.reasonTranslated = translationAddons.reasonTranslated;
  }

  // For DungeonMaster & TransitionDirector schemas (top-level properties)
   if (translationAddons.player_choices_translated) {
       schema.properties.player_choices_translated = translationAddons.player_choices_translated;
   }
   if (translationAddons.playerDialogueEnglish) {
       schema.properties.playerDialogueEnglish = translationAddons.playerDialogueEnglish;
   }


  // For RelationshipAnalyst schema (top-level properties)
  if (translationAddons.updated_relationship_dynamics_translated) {
    schema.properties.updated_relationship_dynamics_translated = translationAddons.updated_relationship_dynamics_translated;
  }
  if (translationAddons.updated_character_profiles_translated) {
    schema.properties.updated_character_profiles_translated = translationAddons.updated_character_profiles_translated;
  }

  return schema;
}
