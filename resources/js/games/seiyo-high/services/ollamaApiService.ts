/**
 * Ollama API Bridge
 * Provides the same interface as apiService.ts but uses local Ollama
 */

import { VnScene, DialogueEntry, DaySegment } from '../types';
import { chatWithOllamaStream, OllamaMessage } from '../../../services/ollamaService';

// Global Ollama configuration
let selectedModel = 'llama2';
let systemPrompt = '';

export function setOllamaModel(model: string) {
    selectedModel = model;
}

export function getOllamaModel(): string {
    return selectedModel;
}

export function setSystemPrompt(prompt: string) {
    systemPrompt = prompt;
}

/**
 * Generate a scene using Ollama
 * This replaces postToDungeonMaster from apiService
 */
export async function generateSceneWithOllama(
    prompt: string,
    conversationHistory: OllamaMessage[] = [],
    onChunk?: (chunk: string) => void
): Promise<VnScene> {
    const messages: OllamaMessage[] = [
        ...conversationHistory,
        { role: 'user', content: prompt }
    ];

    const response = await chatWithOllamaStream(
        selectedModel,
        messages,
        systemPrompt,
        onChunk
    );

    if (response.error) {
        throw new Error(response.error);
    }

    // Try to parse JSON response
    try {
        // Look for JSON in the response
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        // If JSON parsing fails, create a simple scene from the text
    }

    // Fallback: Create a simple scene structure from plain text
    return createSimpleScene(response.response);
}

/**
 * Creates a simple VnScene from plain text response
 */
function createSimpleScene(text: string): VnScene {
    // Split the response into parts for different speakers
    const lines = text.split('\n').filter(line => line.trim());

    const scene: DialogueEntry[] = [];
    let currentSpeaker = 'Narrator';

    for (const line of lines) {
        // Check for speaker patterns like "Name:" or "*Name*"
        const speakerMatch = line.match(/^([A-Za-z]+):\s*(.+)/) ||
            line.match(/^\*([A-Za-z]+)\*\s*(.+)/);

        if (speakerMatch) {
            currentSpeaker = speakerMatch[1];
            const dialogue = speakerMatch[2];
            scene.push(createDialogueEntry(currentSpeaker, dialogue));
        } else if (line.trim()) {
            scene.push(createDialogueEntry(currentSpeaker, line));
        }
    }

    // Ensure at least one dialogue entry
    if (scene.length === 0) {
        scene.push(createDialogueEntry('Narrator', text || 'The scene continues...'));
    }

    return {
        scene,
        present_characters: extractCharacterNames(scene),
        location_hint: 'classroom',
        player_choices: null,
    } as VnScene;
}

function createDialogueEntry(speaker: string, dialogue: string): DialogueEntry {
    return {
        id: crypto.randomUUID(),
        speaker,
        dialogue,
        expression: 'neutral',
        spriteSet: 'default',
        motivation: '',
        day: 1,
        segment: 'Morning' as DaySegment,
        presentCharacters: [speaker],
        location: 'classroom',
    };
}

function extractCharacterNames(scene: DialogueEntry[]): string[] {
    const names = new Set<string>();
    for (const entry of scene) {
        if (entry.speaker && entry.speaker !== 'Narrator' && entry.speaker !== 'Player') {
            names.add(entry.speaker);
        }
    }
    return Array.from(names);
}

/**
 * Build the system prompt for the visual novel AI
 */
export function buildVNSystemPrompt(characters: Array<{ name: string; role: string; baseProfile: string }>): string {
    const characterDescriptions = characters.map(c =>
        `- ${c.name}: ${c.role}. ${c.baseProfile}`
    ).join('\n');

    return `You are an AI dungeon master for an interactive visual novel game set in a Japanese high school.

CHARACTERS:
${characterDescriptions}

YOUR ROLE:
- Generate engaging dialogue and narration for scenes
- Stay in character for each NPC
- Respond to player choices naturally
- Create atmospheric descriptions
- Keep responses conversational and appropriate for a visual novel

RESPONSE FORMAT:
Respond with dialogue and narration. Use this format:
- For character speech: "CharacterName: Their dialogue here"
- For narration: Describe actions and scene elements
- For player interactions: Create meaningful choices

Keep responses engaging but concise (2-5 exchanges per turn).`;
}

/**
 * Simple chat with Ollama (for testing)
 */
export async function simpleChat(
    userMessage: string,
    history: OllamaMessage[] = [],
    onChunk?: (chunk: string) => void
): Promise<string> {
    const messages: OllamaMessage[] = [
        ...history,
        { role: 'user', content: userMessage }
    ];

    const response = await chatWithOllamaStream(
        selectedModel,
        messages,
        systemPrompt,
        onChunk
    );

    if (response.error) {
        throw new Error(response.error);
    }

    return response.response;
}
