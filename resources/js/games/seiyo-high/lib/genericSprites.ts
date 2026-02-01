/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import { SpriteSet } from '../types';

// Master list of all potentially available generic sprite sets.
// Some might only have a 'neutral' expression, others might be more complete.
export const genericSpriteSets: SpriteSet[] = [
  { "name": "male_young_01", "description": "Male, young, short layered red hair, gold eyes, school blazer.", "expressions": { "neutral": "https://i.postimg.cc/B659Qb5j/male-young-01.jpg" }},
  { "name": "male_young_02", "description": "Male, young, medium-length silver hair, green eyes, track jacket.", "expressions": { "neutral": "https://i.postimg.cc/SsLFNRLX/male-young-02.jpg" }},
  { "name": "male_young_03", "description": "Male, young, short neat blue hair, glasses, grey eyes, gakuran uniform.", "expressions": { "neutral": "https://i.postimg.cc/bJ0cNr02/male-young-03.jpg" }},
  { "name": "male_young_04", "description": "Male, young, heavyset, short brown hair, brown eyes, sweatshirt.", "expressions": { "neutral": "https://i.postimg.cc/7618Yh12/male-young-04.jpg" }},
  { "name": "male_young_05", "description": "Male, young, combed-back blonde hair, blue eyes, open school blazer.", "expressions": { "neutral": "https://i.postimg.cc/xCGDT8GH/male-young-05.jpg" }},
  { "name": "female_young_01", "description": "Female, young, long straight black hair, red eyes, white sailor uniform with red scarf.", "expressions": { "neutral": "https://i.postimg.cc/W3mLbzms/female-young-01.jpg" }},
  { "name": "female_young_02", "description": "Female, young, long wavy blonde hair, blue eyes, pink hoodie.", "expressions": { "neutral": "https://i.postimg.cc/bJ0cNr0p/female-young-02.jpg" }},
  { "name": "female_young_03", "description": "Female, young, short pink bob, brown eyes, white sailor uniform with red scarf.", "expressions": { "neutral": "https://i.postimg.cc/fL7nTy7w/female-young-03.jpg" }},
  { "name": "female_young_04", "description": "Female, young, dark skin, curly white hair, amber eyes, white sweater.", "expressions": { "neutral": "https://i.postimg.cc/7618Yh1H/female-young-04.jpg" }},
  { "name": "female_young_05", "description": "Female, young, messy green hair, purple eyes, leather jacket.", "expressions": { "neutral": "https://i.postimg.cc/SsLFNRLQ/female-young-05.jpg" }},
  { "name": "male_adult_01", "description": "Male, adult (40s), short brown hair with grey, brown eyes, V-neck sweater.", "expressions": { "neutral": "https://i.postimg.cc/85dQPcdP/male-adult-01.jpg" }},
  { "name": "male_adult_02", "description": "Male, adult (20s), short white hair, brown eyes, stylish button-down shirt.", "expressions": { "neutral": "https://i.postimg.cc/k4N3XGNG/male-adult-02.jpg" }},
  { "name": "male_adult_03", "description": "Male, adult (30s), medium-length slicked-back black hair, grey eyes, dark suit.", "expressions": { "neutral": "https://i.postimg.cc/9MP5F0PQ/male-adult-03.jpg" }},
  { "name": "male_adult_04", "description": "Male, adult (middle-aged), balding, circular glasses, tweed jacket.", "expressions": { "neutral": "https://i.postimg.cc/qRcVMqc7/male-adult-04.jpg" }},
  { "name": "male_adult_05", "description": "Male, adult (20s), messy orange hair, green eyes, black apron.", "expressions": { "neutral": "https://i.postimg.cc/nzKbcrKC/male-adult-05.jpg" }},
  { "name": "female_adult_01", "description": "Female, adult (30s), long wavy light brown hair, green eyes, professional blazer.", "expressions": { "neutral": "https://i.postimg.cc/sXPdDxP7/female-adult-01.jpg" }},
  { "name": "female_adult_02", "description": "Female, adult (20s), short red bob, blue eyes, turtleneck.", "expressions": { "neutral": "https://i.postimg.cc/rmGXFsG4/female-adult-02.jpg" }},
  { "name": "female_adult_03", "description": "Female, adult (40s), short neat black hair, sharp brown eyes, black dress.", "expressions": { "neutral": "https://i.postimg.cc/KjZXKbQY/female-adult-03.jpg" }},
  { "name": "female_adult_04", "description": "Female, elderly (60s), short curly grey hair, cardigan.", "expressions": { "neutral": "https://i.postimg.cc/7618Yh14/female-adult-04.jpg" }},
  { "name": "female_adult_05", "description": "Female, adult (20s), long lavender hair, purple eyes, knit sweater.", "expressions": { "neutral": "https://i.postimg.cc/505dNy5M/female-adult-05.jpg" }}
];

// Helper to get just names and descriptions for the AI prompt
export const getAvailableGenericSetInfo = (availableNames: string[]): { name: string, description: string }[] => {
    return genericSpriteSets
        .filter(set => availableNames.includes(set.name))
        .map(set => ({ name: set.name, description: set.description }));
};

// Helper to find a full SpriteSet object by its name
export const findGenericSpriteSet = (name: string): SpriteSet | undefined => {
    return genericSpriteSets.find(set => set.name === name);
};