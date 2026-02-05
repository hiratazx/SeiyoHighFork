import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function GameGuide() {
    return (
        <AuthenticatedLayout>
            <Head title="Game Guide" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden glass-panel sm:rounded-2xl">
                        <div className="p-6 text-white/90">
                            <h1 className="mb-8 text-3xl font-bold font-display">Game Guide</h1>

                            {/* Quick Test */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">⚡ Quick Test (Free Tier API Key)</h2>
                                
                                <p className="text-white/70 mb-4">
                                    Want to test the game before adding a payment method? You can try a few interactions with a <strong>basic free tier</strong> Gemini API key!
                                </p>

                                <div className="rounded-lg bg-gradient-to-r from-cyan-900/40 to-purple-900/40 border border-cyan-500/30 p-5 mb-4">
                                    <h3 className="font-semibold text-cyan-300 mb-3">🎮 Quick Start (Free Tier)</h3>
                                    <ol className="list-decimal list-inside text-white/70 space-y-2 mb-4">
                                        <li>Go to{' '}
                                            <a 
                                                href="https://aistudio.google.com/app/apikey" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-cyan-400 hover:underline"
                                            >
                                                Google AI Studio
                                            </a>
                                            {' '}and create an API key (no payment method needed)
                                        </li>
                                        <li>Visit the{' '}
                                            <a 
                                                href="https://huggingface.co/spaces/ainimegamesplatform/SeiyoHigh" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-purple-400 hover:underline font-semibold"
                                            >
                                                HuggingFace Demo
                                            </a>
                                            {' '}(optimized for free tier)
                                        </li>
                                        <li>Enter your name and API key — start playing!</li>
                                    </ol>
                                    <p className="text-white/50 text-sm">
                                        The demo has image generation disabled by default because free tier API keys don't support it. You'll play with pre-made stock images instead — the story experience is identical!
                                    </p>
                                </div>

                                <div className="rounded-lg bg-white/5 border border-white/10 p-4 mb-4">
                                    <h3 className="font-semibold text-white mb-2">Free Tier Limits</h3>
                                    <ul className="list-disc list-inside text-white/50 space-y-1">
                                        <li>~20 interactions on <strong>Gemini 2.5 Flash</strong></li>
                                        <li>~20 interactions on <strong>Gemini 3 Flash</strong></li>
                                        <li>No image generation (backgrounds & sprites use stock images)</li>                                        
                                    </ul>
                                    <p className="text-white/70 mt-3">
                                        This is enough to get a feel for the AI storytelling and see if it's for you. But you'll hit rate limits quickly — <strong>free tier is for testing only</strong>, not extended play.
                                    </p>
                                </div>

                                <div className="rounded-lg bg-yellow-900/30 border border-yellow-600/30 p-4 mb-4">
                                    <p className="text-yellow-200 text-sm">
                                        <strong>💎 Have a Tier 1 account?</strong> You can enable AI image generation in the demo via <strong>Model Settings</strong> (gear icon), or play here on{' '}
                                        <a href="/" className="text-cyan-400 hover:underline">ainime-games.com</a>
                                        {' '}where everything is enabled by default!
                                    </p>
                                </div>

                                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                    <p className="text-white/50 text-sm">
                                        <strong>💡 Note:</strong> You can also play on the main site with a free tier key, but you'll need to go through new game generation first (which uses a few API calls), then manually disable image generation in Model Settings. Either way, <strong>you will hit rate limits quickly</strong> — free tier is really just for a quick taste!
                                    </p>
                                </div>
                            </section>

                            {/* Getting Started */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">🚀 Getting Started (Full Experience)</h2>
                                
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">Step 1: Get Your API Key</h3>
                                        <p className="text-white/70 mb-3">
                                            Visit{' '}
                                            <a 
                                                href="https://aistudio.google.com/app/apikey" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                Google AI Studio
                                            </a>
                                            {' '}to create your Gemini API key. <strong>You'll need to add a payment method</strong> to get Tier 1 access—the free tier has rate limits too low to actually play the game fully.
                                        </p>
                                        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 mb-3">
                                            <p className="text-green-200 text-sm">
                                                <strong>💰 Don't worry about charges:</strong> Google gives you <strong>$300 in free credits</strong> for 90 days. 
                                                During the free trial, you will NOT be charged—if credits run out, the service simply stops. 
                                                To be billed, you must manually "Upgrade" your account (your choice!).
                                            </p>
                                        </div>
                                        <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-3">
                                            <p className="text-cyan-200 text-sm">
                                                <strong>📖 Need help?</strong> In the game, click <strong>"API Key"</strong> from the main menu, 
                                                then click <em>"Need help setting up your API key?"</em> for a detailed step-by-step tutorial with screenshots.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">Step 2: Enter Your Key</h3>
                                        <p className="text-white/70">
                                            From the main menu, click <strong>"API Key"</strong> and paste your Gemini API key. The game will validate it automatically.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">Step 3: Configure Models (Optional)</h3>
                                        <p className="text-white/70">
                                            Click <strong>"Model"</strong> to customize your AI settings. See the recommended settings below.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Language */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">🌍 Language Selection</h2>
                                
                                <div className="rounded-lg bg-white/5 border border-white/10 p-4 mb-4">
                                    <p className="text-white/70 mb-3">
                                        When starting a new game, you can choose your preferred language. The AI will automatically translate all dialogue, narration, and UI elements for you.
                                    </p>
                                    <ul className="list-disc list-inside text-white/50 space-y-1">
                                        <li>All NPC dialogue is generated in your language</li>
                                        <li>Narrator text and descriptions are translated</li>
                                        <li>Character profiles and story summaries appear in your language</li>
                                        <li>You can type your inputs in your native language too!</li>
                                    </ul>
                                </div>

                                <div className="rounded-lg bg-yellow-900/30 p-4">
                                    <p className="text-yellow-200 text-sm">
                                        <strong>💡 Recommendation:</strong> For the best narrative quality, we recommend playing in <strong>English</strong>. AI language models are primarily trained on English text, so they produce the richest vocabulary and most nuanced writing in English. That said, all supported languages work great!
                                    </p>
                                </div>
                            </section>

                            {/* How to Play */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">🎮 How to Play</h2>
                                
                                <p className="text-white/70 mb-4">
                                    This is a text-based visual novel where you type what your character says and does. The AI responds as the other characters and narrates the world around you.
                                </p>

                                <div className="space-y-4">
                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">💬 Dialogue (What You Say)</h3>
                                        <p className="text-white/70 mb-2">
                                            Type normally to speak as your character:
                                        </p>
                                        <code className="block bg-black/40 p-3 rounded text-green-400 text-sm">
                                            Hey Rin, want to grab lunch together?
                                        </code>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">✨ Actions (What You Do)</h3>
                                        <p className="text-white/70 mb-2">
                                            Use <strong>asterisks</strong> to describe actions, thoughts, or narration:
                                        </p>
                                        <code className="block bg-black/40 p-3 rounded text-green-400 text-sm">
                                            *I nervously scratch the back of my head, avoiding eye contact*
                                        </code>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">🎭 Combining Both</h3>
                                        <p className="text-white/70 mb-2">
                                            The most expressive inputs combine dialogue with actions:
                                        </p>
                                        <code className="block bg-black/40 p-3 rounded text-green-400 text-sm">
                                            *I take a deep breath and gather my courage* Look, I need to tell you something important... *my voice trails off as I struggle to find the words*
                                        </code>
                                    </div>
                                </div>
                            </section>

                            {/* Gameplay Loop */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">🔄 The Gameplay Loop</h2>
                                
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">Day Structure</h3>
                                        <p className="text-white/70">
                                            Each day is divided into <strong>segments</strong>: Morning, Afternoon, Evening, and Night. Each segment is a scene with its own setting, characters, and events.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">Scene Flow</h3>
                                        <p className="text-white/70">
                                            You interact with the characters through your inputs. The AI manages pacing and will naturally transition between segments when the scene reaches a good stopping point.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">End of Day (EOD)</h3>
                                        <p className="text-white/70">
                                            At the end of each day, the game runs an <strong>End of Day analysis</strong>. This takes a few minutes as multiple AI agents analyze what happened:
                                        </p>
                                        <ul className="list-disc list-inside mt-2 text-white/50 space-y-1">
                                            <li><strong>Relationship Analyst:</strong> Updates how characters feel about each other</li>
                                            <li><strong>Character Developer:</strong> Evolves character traits and personalities</li>
                                            <li><strong>Arc Manager:</strong> Tracks story arcs and character development</li>
                                            <li><strong>Narrative Architect:</strong> Plans tomorrow's events</li>
                                            <li><strong>Novelist:</strong> Writes a chapter summary for the Story tab</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            {/* Scene Controls */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">🎬 Scene Controls</h2>
                                
                                <p className="text-white/70 mb-4">
                                    During gameplay, you have several buttons to control the flow of scenes:
                                </p>

                                <div className="space-y-4">
                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-cyan-400 mb-2">🎯 Choice</h3>
                                        <p className="text-white/70 mb-2">
                                            The AI always generates exactly <strong>one suggested choice</strong> for your current situation. Click it to select that option, or use it as inspiration to type your own unique response.
                                        </p>
                                        <p className="text-orange-300 text-sm">
                                            ⚠️ <strong>Careful:</strong> This is NOT the "right" choice — just <em>a</em> direction you could take. The outcome can be fantastic... or disastrous. That's part of the fun!
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-blue-400 mb-2">💬 Continue</h3>
                                        <p className="text-white/70 mb-2">
                                            An ambiguous "your turn" command. Use this when you don't want to type anything but want the AI to keep going. It tells the AI:
                                        </p>
                                        <ul className="list-disc list-inside text-white/50 text-sm space-y-1">
                                            <li>"I'm being a passive observer, show me what happens next"</li>
                                            <li>"I'm ceding control to another character" (useful in intimate or dramatic scenes)</li>
                                            <li>"I'm done with this scene" (if the scene feels complete, the AI may end it)</li>
                                        </ul>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-yellow-400 mb-2">🚫 Veto ("Wait, not yet")</h3>
                                        <p className="text-white/70">
                                            Appears when the AI decides to end a scene. Click this to <strong>undo the AI's ending</strong> and continue the current scene. Use this when the AI tries to move on but you're not ready—you want more time with the current characters or moment.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-primary mb-2">⏹️ End Scene</h3>
                                        <p className="text-white/70">
                                            Force the current scene to end immediately and move to the next segment. Use this when you feel the scene has run its course and you're ready to move on, even if the AI hasn't suggested ending yet.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-green-400 mb-2">▶️ Next Scene</h3>
                                        <p className="text-white/70">
                                            Only appears after a scene has ended. Click to proceed to the next segment—the AI will set up the new location, time of day, and characters based on the day's itinerary.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Psychoanalysis */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">🧠 Psychoanalysis System</h2>
                                
                                <p className="text-white/70 mb-4">
                                    One of the game's unique features is deep psychological profiling of both you and the NPCs.
                                </p>

                                <div className="space-y-4">
                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">Your Psychological Profile</h3>
                                        <p className="text-white/70 mb-2">
                                            The <strong>Psychoanalyst</strong> AI watches how you play and builds a profile of your character's psychology:
                                        </p>
                                        <ul className="list-disc list-inside text-white/50 space-y-1">
                                            <li>Your attachment style and relationship patterns</li>
                                            <li>Defense mechanisms and coping strategies</li>
                                            <li>Core desires, fears, and motivations</li>
                                            <li>How you respond to conflict, intimacy, and vulnerability</li>
                                        </ul>
                                        <p className="text-white/50 mt-2 text-sm">
                                            View your profile in the <strong>Profile tab</strong> → <strong>Player Profile</strong>.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">NPC Psychological States</h3>
                                        <p className="text-white/70 mb-2">
                                            Each character has a <strong>psychological state</strong> that updates <strong>after every scene</strong> and at the end of each day:
                                        </p>
                                        <ul className="list-disc list-inside text-white/50 space-y-1">
                                            <li>Their current emotional state after recent events</li>
                                            <li>How they perceive you based on your interactions</li>
                                            <li>Active internal conflicts and surface-level desires</li>
                                            <li>What's on their mind right now</li>
                                        </ul>
                                        <p className="text-white/50 mt-2 text-sm">
                                            View NPC states in the <strong>Profile tab</strong> — they're listed for each character.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-purple-900/30 p-4">
                                        <p className="text-purple-200 text-sm">
                                            <strong>🔮 Why it matters:</strong> These profiles aren't just flavor text—they directly influence how characters behave, what they say, and how they react to your choices. The AI uses these profiles to create psychologically authentic interactions.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Model Selection */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">⚙️ Recommended Model Settings</h2>
                                
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-green-900/30 border border-green-600/30 p-4">
                                        <h3 className="font-semibold text-green-400 mb-2">⭐ Recommended: Flash Everything</h3>
                                        <p className="text-white/70 mb-2">
                                            Use <strong>Gemini 3 Flash Preview</strong> for both dialogue AND story analysis.
                                        </p>
                                        <ul className="list-disc list-inside text-white/50 text-sm space-y-1">
                                            <li>Dialogue: <span className="text-green-400">Gemini 3 Flash Preview</span> — fast, great quality, cost-effective</li>
                                            <li>Story: <span className="text-green-400">Gemini 3 Flash Preview</span> — excellent EOD analysis at a fraction of the cost</li>
                                            <li>Images: <span className="text-purple-400">Imagen 4</span> — high quality anime-style backgrounds</li>
                                        </ul>
                                        <p className="text-green-200 text-sm mt-2">
                                            This is what we recommend for most players. Flash 3 is incredibly capable and keeps costs low.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-blue-400 mb-2">✨ Premium Mode: Flash + Pro</h3>
                                        <p className="text-white/70 mb-2">
                                            Use <strong>Gemini 3 Flash</strong> for dialogue and <strong>Gemini 3 Pro</strong> for End of Day story analysis.
                                        </p>
                                        <p className="text-white/50 text-sm">
                                            When you're feeling fancy! Pro produces richer narrative summaries and deeper character analysis at EOD. The dialogue stays on Flash to keep real-time costs reasonable.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-purple-400 mb-2">💎 Luxury Mode: Pro Everything</h3>
                                        <p className="text-white/70 mb-2">
                                            Use <strong>Gemini 3 Pro Preview</strong> for both dialogue and story analysis.
                                        </p>
                                        <p className="text-white/50 text-sm">
                                            Maximum quality, maximum cost. Only recommended if you have credits to burn and want the absolute best AI responses in every interaction.
                                        </p>
                                    </div>
                                </div>

                                <p className="text-white/50 text-sm mt-4">
                                    💡 <strong>Tip:</strong> Start with Flash Everything — it's genuinely great. You likely won't feel the need to upgrade!
                                </p>

                                <div className="rounded-lg bg-amber-900/30 border border-amber-600/30 p-4 mt-4">
                                    <p className="text-amber-200 text-sm">
                                        <strong>⚠️ Important:</strong> Game context is cached per model. Switching models constantly forces the game to rebuild its context cache, which <strong>increases costs significantly</strong>. Pick your model settings at the start of a play session and stick with them!
                                    </p>
                                </div>
                            </section>

                            {/* Image Generation */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">🎨 Image Generation</h2>
                                
                                <p className="text-white/70 mb-4">
                                    The game can generate custom anime-style images using Imagen 4. Both location backgrounds and character sprites have two modes:
                                </p>

                                <div className="space-y-4">
                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-yellow-400 mb-2">🔀 Hybrid Mode (Default, Recommended)</h3>
                                        <p className="text-white/70 mb-2">
                                            The smart middle ground:
                                        </p>
                                        <ul className="list-disc list-inside text-white/50 text-sm space-y-1">
                                            <li><strong>Locations:</strong> Uses stock backgrounds when available, generates only for new/unique locations</li>
                                            <li><strong>Sprites:</strong> Uses hand-crafted sprites for main characters, generates only for emergent characters you invent</li>
                                        </ul>
                                        <p className="text-white/50 text-sm mt-2">
                                            Fewer API calls while still getting custom images where it matters.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-purple-400 mb-2">✨ Override Mode (Maximum Immersion)</h3>
                                        <p className="text-white/70 mb-2">
                                            Generate fresh images for everything:
                                        </p>
                                        <ul className="list-disc list-inside text-white/50 text-sm space-y-1">
                                            <li><strong>Locations:</strong> All backgrounds are AI-generated, ignoring stock images</li>
                                            <li><strong>Sprites:</strong> All characters get unique generated portraits</li>
                                        </ul>
                                        <p className="text-white/50 text-sm mt-2">
                                            Most immersive and unique, but uses more API credits.
                                        </p>
                                    </div>
                                </div>

                                <p className="text-white/50 text-sm mt-4">
                                    💡 <strong>Tip:</strong> Generated images are stored locally in your browser and reused when you revisit the same location or character.
                                </p>
                            </section>

                            {/* Planning & Dates */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">📅 Planning Activities & Dates</h2>
                                
                                <p className="text-white/70 mb-4">
                                    Don't just react to what happens—<strong>take initiative!</strong> The game's AI planning system listens to your plans and tries to incorporate them into future days.
                                </p>

                                <div className="space-y-4">
                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">Ask NPCs on Dates</h3>
                                        <p className="text-white/70 mb-2">
                                            Want to spend time with someone? Just ask them!
                                        </p>
                                        <code className="block bg-black/40 p-3 rounded text-green-400 text-sm mb-2">
                                            Hey Rin, want to grab coffee after school tomorrow?
                                        </code>
                                        <code className="block bg-black/40 p-3 rounded text-green-400 text-sm">
                                            *I turn to Shinobu* Would you... maybe want to study together this weekend?
                                        </code>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">Plan Group Activities</h3>
                                        <p className="text-white/70 mb-2">
                                            Suggest outings, events, or hangouts:
                                        </p>
                                        <code className="block bg-black/40 p-3 rounded text-green-400 text-sm mb-2">
                                            We should all go to the summer festival together next week!
                                        </code>
                                        <code className="block bg-black/40 p-3 rounded text-green-400 text-sm">
                                            *I look at the group* Anyone want to hit the arcade after class?
                                        </code>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">How It Works</h3>
                                        <p className="text-white/70">
                                            The <strong>Narrative Architect</strong> AI plans each day's events. When you make plans with NPCs, the system tracks these and tries to work them into future itineraries. If Rin agrees to coffee tomorrow, expect to find that date on tomorrow's schedule!
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-purple-900/30 p-4">
                                        <p className="text-purple-200 text-sm">
                                            <strong>🎯 Pro Tip:</strong> Be proactive! The best stories come from players who drive the narrative. Don't wait for the game to hand you romance—pursue the characters you're interested in. Ask them out, suggest activities, make plans. The AI rewards initiative!
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Emergent Characters */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">👥 Emergent Characters</h2>
                                
                                <p className="text-white/70 mb-4">
                                    One of the most powerful features: <strong>you can invent characters on the fly!</strong> Simply describe a new character in your input, and the game will bring them to life.
                                </p>

                                <div className="rounded-lg bg-white/5 border border-white/10 p-4 mb-4">
                                    <h3 className="font-semibold text-white mb-2">Example 1: Inventing a Family Member</h3>
                                    <code className="block bg-black/40 p-3 rounded text-green-400 text-sm mb-3">
                                        *I walk into the living room to greet my dad, a tired but good-natured man with grey hair, warm blue eyes, and heavy-rimmed glasses. He's reading the newspaper in his favorite armchair.*
                                    </code>
                                    <p className="text-white/70">
                                        The AI will immediately roleplay your dad based on this description.
                                    </p>
                                </div>

                                <div className="rounded-lg bg-white/5 border border-white/10 p-4 mb-4">
                                    <h3 className="font-semibold text-white mb-2">Example 2: Creating a Unique Character</h3>
                                    <code className="block bg-black/40 p-3 rounded text-green-400 text-sm mb-3">
                                        *I knock on my sister's door. She's a total shut-in otaku—pale skin, messy black hair, always wearing the same oversized anime hoodie. Her room is a cave of manga, figures, and glowing monitors.* Yuki, dinner's ready...
                                    </code>
                                    <p className="text-white/70">
                                        Your shut-in sister Yuki now exists! The AI will roleplay her personality based on your description—probably reluctant to leave her room, socially awkward, but maybe secretly sweet.
                                    </p>
                                </div>

                                <div className="rounded-lg bg-white/5 border border-white/10 p-4 mb-4">
                                    <h3 className="font-semibold text-white mb-2">What Happens Next</h3>
                                    <p className="text-white/70">
                                        At the end of the day, the <strong>Cast Analyst</strong> will:
                                    </p>
                                    <ul className="list-disc list-inside mt-2 text-white/50 space-y-1">
                                        <li>Canonize them as official side characters</li>
                                        <li>Generate character profiles based on the interactions</li>
                                        <li>Create sprites/portraits (if image generation is enabled)</li>
                                        <li>Add them to the character roster for future scenes</li>
                                    </ul>
                                </div>

                                <div className="rounded-lg bg-yellow-900/30 p-4">
                                    <p className="text-yellow-200 text-sm">
                                        <strong>💡 Pro Tip:</strong> The more detail you give when introducing a character, the better the AI will portray them. Include appearance, personality hints, and their relationship to you.
                                    </p>
                                </div>
                            </section>

                            {/* Saving */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">💾 Saving & Sharing Your Story</h2>
                                
                                <div className="rounded-lg bg-blue-900/30 p-4 mb-4">
                                    <p className="text-blue-200">
                                        <strong>🔒 Your Privacy:</strong> All your story data, dialogue, choices, and AI-generated content lives <strong>exclusively on your device</strong>. We never see or store your playthroughs on our servers. Your story is yours alone.
                                    </p>
                                </div>

                                <div className="rounded-lg bg-red-900/30 p-4 mb-4">
                                    <p className="text-red-200">
                                        <strong>⚠️ Critical:</strong> Because data is local, if you clear your browser data, <strong>you will lose your save!</strong> Always export backups.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">Export Save</h3>
                                        <p className="text-white/70">
                                            From the main menu, click <strong>"Export Save"</strong> to download a JSON file with your complete game state. Store these backups somewhere safe! <strong>Your API key is never included in save files</strong> — they're safe to share.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-white mb-2">Import Save</h3>
                                        <p className="text-white/70">
                                            Click <strong>"Import Save"</strong> to restore from a backup file. This completely replaces your current game state.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-yellow-900/30 p-4">
                                        <h3 className="font-semibold text-yellow-200 mb-2">🔔 When to Export</h3>
                                        <ul className="list-disc list-inside text-yellow-100/80 space-y-1">
                                            <li><strong>Before every End of Day</strong> — The EOD pipeline is complex and can occasionally fail. Having a backup means you won't lose the day's progress.</li>
                                            <li>Before major story decisions</li>
                                            <li>Whenever you're about to do something risky</li>
                                            <li>At least once per play session</li>
                                        </ul>
                                    </div>

                                    <div className="rounded-lg bg-green-900/30 p-4">
                                        <h3 className="font-semibold text-green-200 mb-2">🎁 Share Your Story with Friends</h3>
                                        <p className="text-white/70 mb-2">
                                            Your exported save file contains your entire story! You can share it with friends who can:
                                        </p>
                                        <ul className="list-disc list-inside text-white/50 space-y-1">
                                            <li><strong>Import and continue</strong> — They can pick up exactly where you left off and play forward</li>
                                            <li><strong>Replay mode</strong> — They can rewatch your entire story from the beginning, scene by scene, like reading a visual novel</li>
                                            <li><strong>Read your chapters</strong> — The Story tab contains beautifully written novelized summaries of each day</li>
                                        </ul>
                                        <p className="text-green-200 text-sm mt-2">
                                            Share your wildest adventures, your romances, your disasters—let friends experience your unique story!
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Troubleshooting */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">🔧 Common Errors & Troubleshooting</h2>
                                
                                <p className="text-white/70 mb-4">
                                    Don't panic! AI services occasionally hiccup. Here's what common errors mean and how to handle them:
                                </p>

                                <div className="space-y-4">
                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-red-400 mb-2">503 - Model Overloaded</h3>
                                        <p className="text-white/70 mb-2">
                                            Google's servers are busy. This happens during peak usage times.
                                        </p>
                                        <p className="text-white/50 text-sm">
                                            <strong>Fix:</strong> Just click <strong>Retry</strong>. If it persists, wait a few minutes or temporarily switch to a different model (e.g., Flash instead of Pro).
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-orange-400 mb-2">429 - Rate Limit / API Key Limit Reached</h3>
                                        <p className="text-white/70 mb-2">
                                            You've hit your API usage limit. If you're on the free tier, you'll hit this after ~20 prompts — the game is essentially unplayable on free tier.
                                        </p>
                                        <p className="text-white/50 text-sm">
                                            <strong>Fix:</strong> Upgrade to Tier 1 (add a payment method in Google AI Studio). You get $300 free credits and won't be charged unless you choose to. See the Dashboard for instructions.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-yellow-400 mb-2">Invalid JSON Output</h3>
                                        <p className="text-white/70 mb-2">
                                            The AI generated a malformed response. This occasionally happens with complex scenes.
                                        </p>
                                        <p className="text-white/50 text-sm">
                                            <strong>Fix:</strong> Click <strong>Retry</strong>. The game will ask the AI to try again. Usually works on the second attempt.
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                        <h3 className="font-semibold text-purple-400 mb-2">End of Day Pipeline Errors</h3>
                                        <p className="text-white/70 mb-2">
                                            The EOD analysis involves multiple AI calls. Sometimes one fails.
                                        </p>
                                        <p className="text-white/50 text-sm">
                                            <strong>Fix:</strong> Click <strong>Retry</strong> on the failed step. If you exported a save before EOD (as recommended!), you can always import it and try again later.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-lg bg-blue-900/30 p-4 mt-4">
                                    <p className="text-blue-200 text-sm">
                                        <strong>🧘 General Advice:</strong> Most errors are temporary. Retry first, wait a bit if needed, or switch models temporarily. The AI services are generally reliable—these hiccups are rare but normal. Come back later if all else fails!
                                    </p>
                                </div>
                            </section>

                            {/* Tips */}
                            <section className="mb-10">
                                <h2 className="mb-4 text-2xl font-semibold text-primary">💡 Pro Tips</h2>
                                
                                <ul className="space-y-3 text-white/70">
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span><strong>Go off-script!</strong> The AI thrives when you surprise it. Don't feel bound by what's "supposed" to happen.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span><strong>Use the Profile tab</strong> to check character affection levels and read their psychological profiles.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span><strong>Check the Story tab</strong> after each day to read beautifully written chapter summaries of your adventure.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span><strong>Correct the AI</strong> if it makes a mistake. Just say what actually happened and it will adapt.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span><strong>Use "Wait/Not Yet"</strong> liberally! Some of the best moments happen when you extend a scene beyond its planned ending.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span><strong>Invent characters!</strong> Mention a shopkeeper, a classmate, a family member—the AI will bring them to life.</span>
                                    </li>
                                </ul>
                            </section>

                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

