---
title: Seiyo High (AI Narrative Engine)
emoji: 🎌
colorFrom: purple
colorTo: pink
sdk: docker
app_port: 7860
pinned: true
license: other
short_description: 10-agent visual novel engine — infinite memory, no RAG
tags:
  - game
  - gaming
  - visual-novel
  - interactive-fiction
  - storytelling
  - text-generation
  - gemini
  - anime
  - roleplay
  - waifu
  - narrative-engine
  - infinite-context
  - multi-agent
  - custom-architecture
  - laravel
  - react
  - byok
---

![Seiyo High](https://ainime-games.com/images/hero.jpg)

# 🎌 Seiyo High — The "Infinite Context" Narrative Engine

**Every choice is unscripted. Every memory is yours.**

Most AI games are chatbots with a background image. They forget your name after 20 turns, or require you to manually manage lorebooks and character cards.

**Seiyo High is different.** It runs on a custom multi-agent backend that solves the "goldfish memory" problem — not with RAG or vector databases, but with **lossy narrative compression** and a **10-agent pipeline** that analyzes, remembers, and plans your story across hundreds of in-game days.

[**Play the Full Version**](https://ainime-games.com) | [**Hugging Face Space**](https://huggingface.co/spaces/ainimegamesplatform/SeiyoHigh)

---

## 📸 Screenshots

| In-Game Dialogue | Story Arcs |
|:---:|:---:|
| ![In-game](https://ainime-games.com/images/characters/ingame.PNG) | ![Story Arcs](https://ainime-games.com/images/characters/storyarcs.PNG) |

| Unique Locations | Character Profiles |
|:---:|:---:|
| ![Locations](https://ainime-games.com/images/characters/uniquelocations.PNG) | ![Characters](https://ainime-games.com/images/characters/unique%20characters.PNG) |

| Auto-Generated Novel | Player Psychoanalysis |
|:---:|:---:|
| ![Novel](https://ainime-games.com/images/characters/novels.PNG) | ![Psychoanalysis](https://ainime-games.com/images/characters/psychoanalysis.PNG) |

---

## ⚙️ Under the Hood: The Multi-Agent Pipeline

This is not a wrapper around a single LLM call. Every time a day ends in-game, a **server-side relay race of 9 specialized AI agents** processes your story — analyzing relationships, compressing memories, evolving characters, and planning tomorrow. And during live gameplay, a 10th agent — the Dungeon Master — runs every scene in real time.

### 1. The Relationship Analyst

Runs **after every single scene** (not just at end-of-day) and produces three distinct outputs:

**A) In-Depth Psychological Profiles** — After every scene, the Analyst writes a flowing-prose snapshot of each present character's exact psychological state — what they're feeling, what they want, what internal conflicts they're wrestling with — constrained by a strict **Theory of Mind** system that limits the analysis to only what that character personally witnessed or was told.

**B) Character Chronicles (Pivotal Core Memories)** — The Analyst identifies the most significant moments from each scene and logs them as **pivotal memories** from each character's subjective perspective. Categories include Core Memory, Intimacy Milestone, Conflict, Social Observation, and Fact. After 28 in-game days, the Character Developer compresses these accumulated chronicles into **Character Biographies** — prose narratives of each character's personal journey, shaped by the specific memories that defined them in this unique, emergent playthrough. The raw entries are then archived, and the cycle begins again. The key insight: instead of feeding the LLM raw transcripts and hoping it interprets a character's arc correctly, the biography **tells the model exactly who this character has become and why** — a token-efficient, high-signal summary that replaces inference with certainty.

**C) Relationship Dynamics (The Full Social Graph)** — A structured relationship map tracking not just the player's bond with each NPC, but **every NPC-to-NPC relationship** as well. Each pair gets a comprehensive paragraph covering history, current emotional state, and trajectory. The system applies a strict Recency Law — the final interaction of a scene overrides all earlier emotional states.

### 2. The Cast Analyst

Perhaps the most striking feature of the engine: **the player can invent anyone they want.** Mention a sister who doesn't exist. Flirt with a shopkeeper the author never wrote. Befriend a stranger at a bus stop. The Cast Analyst will make them real — complete with a generated name, backstory, role, and a unique AI-generated visual sprite.

**A) Emergent Character Canonization** — In traditional visual novels, the cast is fixed. Here, the Dungeon Master freely improvises new NPCs during live gameplay, and the player can steer conversations toward anyone — including people they invent on the spot. After every end-of-day pipeline run, the Cast Analyst reviews the transcript, identifies these "ghost" characters, and decides which ones have earned permanence based on genuine player interest: personal disclosure, emotional investment, or expressed desire to meet again. Those who qualify get canonized into the world with a proper name, a generated backstory, and a visual sprite — either selected from the stock sprite pool or generated on-the-fly via AI image generation. On subsequent runs, the Cast Analyst continues to maintain and update these emergent characters as new details surface in dialogue — refining their names, roles, and appearances as the story reveals more about them.

**B) Intelligent Promotion System** — Not every side character deserves the full main-cast treatment, and the Cast Analyst knows the difference. It evaluates candidates against strict criteria: Has this character appeared across multiple scenes? Is the player pursuing a romance, or building a genuine confidant-level friendship? Is this a peer-level relationship, or just a parent/teacher the player respects? Only characters who pass these gates get promoted to main cast — which unlocks the full pipeline for them: psychological profiling after every scene, their own multi-beat story arcs, character development tracking, the works. The system is deliberately conservative — most days, nobody gets promoted, and that's a success. But when the player falls for someone unexpected, the engine responds.

### 3. The Psychoanalyst

The Relationship Analyst profiles the NPCs. The Psychoanalyst profiles **you** — the player.

**A) The Player Backstory Bible** — A living factual record of who your character *is*: appearance, family, skills, orientation, living situation, heritage — but only what you've explicitly revealed through your own dialogue and actions. The system enforces an **anti-hallucination mandate**: every fact added to the backstory must be backed by a direct citation from the transcript. If you haven't mentioned your hair color, the system doesn't know your hair color. An incomplete profile is correct; an invented one is forbidden. And because this is collaborative storytelling, you can retcon anything — say "actually, I'm an only child" and the previously recorded sister is gone, no questions asked.

**B) The Psychological Journey** — A second-person analysis of your emerging psychology written after every in-game day. It identifies your attachment styles, defense mechanisms, coping strategies, and behavioral patterns based on your actual choices. Crucially, it's written as a *fascinated psychologist*, never a moral judge — if you created drama, tension, or messy situations, the analysis celebrates it as compelling story development and makes you curious about your own patterns. This profile is then injected into every other agent's prompt — coloring how NPCs react to you, how the story adapts to your personality, and how the world treats you. You aren't just *told* the game understands you; the NPCs actually behave differently because of who you've shown yourself to be.

### 4. The Novelist — The Compression Engine

This is the heart of the "infinite context" system. The fundamental problem with long-form LLM narratives is that transcripts grow without bound — after 50 in-game days, you'd need millions of tokens of raw dialogue to maintain continuity. The Novelist solves this through **structured lossy compression** at three tiers:

**A) Prose Chapters** — After every in-game day, the Novelist reads the full day's raw transcript and compresses it into a literary first-person novel chapter (500-800 words). This isn't a summary — it's a proper prose chapter that captures the actual story — the plot, the drama, the turning points — while weaving in the characters' psychological states and relationship subtext. The chapter becomes the canonical record of that day, replacing the raw transcript in the AI's memory. And it doubles as a player-facing feature: you can read your entire playthrough as a novel and download it.

**B) The Fading Memory System** — This is the secret sauce. Each chapter is also distilled into a **brutal summary** — just the bullet points that actually changed something. As time passes, the full prose chapters fade out of the AI's context window and are replaced by their brutal summaries. Eventually, even those fade and are compressed further into **volume summaries** — single-page synopses of entire 14-day arcs. The details become irrelevant over time, but the actual *story* — the player's journey, the turning points, the relationships that defined each era — is preserved forever. It mirrors how human memory actually works — you don't remember the exact words of a conversation from three months ago, but you remember the gist, the emotional weight, the moments that mattered. Neither does the player. And now, neither does the AI. This is how a playthrough can span hundreds of days without ever exceeding the context window: not by forgetting, but by remembering what matters.

### 5. The Canon Archivist

The Novelist compresses *narrative*. The Canon Archivist extracts *facts* — the permanent, foundational truths about the world that must never be forgotten or distorted by compression.

**A) The Fact Sheet** — After every day, the Archivist scans the transcript for new permanent truths: a character's family history, a location's backstory, a revealed secret about the world. Strict filters prevent bloat — temporary plot points, emotional states, information already in base profiles, and trivial details are all forbidden. Only facts that will matter to the story forever get recorded. This is what prevents amnesia and contradictions — even as the hybrid memory system compresses narrative details away over time, the hard facts (a character's family name, a revealed secret, a world rule) stay preserved in the fact sheet permanently, ensuring the AI never contradicts something it established fifty days ago.

**B) The Scheduler** — The Archivist aggressively hunts the transcript for every commitment the player made: dates, promises, appointments, casual plans like "let's grab lunch tomorrow." Each one gets converted into an absolute day number and passed to the Narrative Architect, ensuring the game keeps its promises even when the player forgets. Without this, a promise made on Day 12 would vanish into the compressed memory and never be followed up on.

**C) Chronicle Compression** — Periodically, the Archivist compresses the accumulated chronicle entries (those pivotal core memories from the Relationship Analyst) into flowing biography prose for each character. Raw memories become the official story of who that character has become — a permanent, high-signal record of their personal journey through this unique playthrough.

### 6. The Arc Manager

The engine that ensures the story **never ends and never stalls**. Every main character has a multi-beat story arc — a structured sequence of dramatic scenarios (dilemmas, revelations, confrontations) that unfold over days and weeks. The Arc Manager maintains all of these simultaneously.

And thanks to the Cast Analyst's promotion system, even characters the player invented from thin air can be promoted to main cast and receive their own full-blown multi-beat story arcs — with sequels that continue forever.

**A) Arc Conclusion & Rebirth** — When a character's arc reaches its climax and resolves, the Arc Manager compresses it into a historical record and generates a sequel arc that picks up from the actual outcome. A character who overcame their trust issues in Act One doesn't just coast — Act Two explores what happens *after* healing: new vulnerabilities, deeper intimacy, challenges that only exist because they've grown. Characters never run out of story.

**B) The Global Adventure Arc** — Running alongside every character's personal arc is a shared overarching plot: a mystery, a conspiracy, a threat that involves multiple characters in interconnected roles. It constantly adapts to the story that's actually emerging and to what the player wants to tell — if the player doesn't like where an arc is going, they can veto it outright, and the AI will conclude it and write a fresh one. When an adventure arc concludes naturally, a new one is born — either a direct sequel or a completely fresh storyline in "anthology mode." There's always a collective dramatic thread weaving the cast together, but it's always *your* story.

**C) Player Derailment Protocol** — The player *will* break your carefully planned beats. They'll solve the mystery early, befriend the antagonist, or reject a character entirely. The Arc Manager has two responses: aggressively rewrite the remaining beats to match what actually happened, or conclude the arc early and spawn a sequel from the real outcome. The system doesn't railroad — it improvises.

**D) Beat Completion Detection** — A critical piece of bookkeeping that prevents the story from looping. The Narrative Architect plans beats into the daily itinerary, the Dungeon Master introduces them during gameplay, and the Arc Manager detects which ones actually happened and marks them complete. If this step fails, the game would keep trying to introduce the same scenarios over and over.

### 7. The Character Developer

This is the agent that solved long-term character development with LLMs. In most AI storytelling, characters are static — they have a personality card and they stick to it forever. Here, characters actually **change** because of what you say and do. The shy girl who starts the game terrified of eye contact? Fifty days of patient kindness later, she's confident, protective, and fiercely loyal — not because a script said so, but because *your actions shaped her*. The Character Developer makes this possible by maintaining three distinct data layers for every main character:

**A) The Evolving Persona** — A prose biography of the character's internal journey: how they've transformed from their original baseline, what wounds have healed or deepened, what new beliefs have taken root, what internal conflicts they're still navigating. This isn't a diary of events — it's a living portrait of who this person *is* right now, and who they're *becoming*. It uses its own **cascading summarization system** to scale indefinitely: as the persona grows, older developmental eras get progressively compressed into high-signal summaries while preserving every meaningful transformation. A character at Day 500 still carries the full weight of their journey from Day 1.

**B) Traits** — Crystallized personality facets with tracked origins: trauma responses, coping mechanisms, physical realities, sources of joy, love languages. These aren't stat blocks — each trait is a richly described behavioral reality with a known origin ("healed by player's loyalty on Day 15," "developed after the betrayal on Day 42"). Traits evolve over time as the character grows.

**C) Motivations (Likes & Dislikes)** — A behavioral map of what *actions* please or upset this character right now, informed by their current traits and story arc. These are concrete and player-actionable ("demonstrations of competence and reliability," "being pitied or treated as fragile") — not abstract feelings. The Dungeon Master uses this map to make NPCs react authentically to whatever the player does.

### 8. The Narrative Architect

This is the gameplay loop. All the previous agents analyze, remember, and evolve. The Narrative Architect takes every output — relationship dynamics, psychological profiles, story arc states, the calendar of promises, the player's psychoanalysis — and synthesizes them into the next day's itinerary. But crucially, it doesn't plan *outcomes*. It plans **scenarios and dilemmas**: situations the player must navigate with complete agency. An NPC shows up in distress. Two characters demand the player's attention at the same time. A secret is about to surface in public. What happens next is entirely up to the player — there is no predetermined path and no railroading. The story can turn out *any possible way*, and the entire pipeline will adapt to whatever the player actually does.

**A) Affection-Gated Story Progression** — Story arc beats don't just fire automatically. Each beat has an affection threshold the player must earn through genuine relationship building. The system enforces a strict sequential law — you can't skip to the climax even if your affection score qualifies, because the story has to be told in order. And if the player has been neglecting a character whose arc gate is wide open, the system flags it and prioritizes them.

**B) The Master Scheduler** — The Canon Archivist logs every promise and plan the player makes. The Narrative Architect cross-references this calendar against story arc beats and resolves conflicts creatively — if a scheduled date and a festival fall on the same day, it plans the date *at* the festival instead of canceling either. Overdue promises become the highest priority. The player's commitments are kept.

**C) A Living World** — NPCs have romantic lives independent of the player. The Architect creates, develops, and complicates NPC-to-NPC relationships autonomously — affairs, jealousy, unrequited love, breakups — giving the player a living world to navigate rather than a cast that orbits them sycophantically. And if the player tries to matchmake two NPCs? The system detects it and plans visible progress.

**D) Ensemble Coverage** — No main character is allowed to simply vanish. If someone hasn't appeared in the last three days of transcript, the Architect ensures they show up — because a character who disappears is dead content.

### 9. The Transition Director

The bridge between planning and execution — and one of the most ingenious pieces of the pipeline. The Narrative Architect plans *what* should happen; the Transition Director figures out *how it begins* given everything that just happened.

**A) The Creative Finisher** — The Architect's itinerary is a first draft. The Transition Director takes it and enhances it based on the immediate reality of the preceding scene. If the Architect planned a calm classroom meeting, but the player just had a devastating argument with Banri, the Director rewrites the opening to reflect that tension — because the world doesn't reset between scenes. It weaves in consequences, emotional carry-over, and secrets from the last few minutes of play. If the emergent story makes the planned scene nonsensical (the player ran off in a completely different direction), the Director can throw the plan out entirely and write a new scene around what actually happened.

**B) Structured Scene Design** — Every scenario follows a proprietary dramatic structure that ensures scenes have shape and momentum. Crucially, the system never prescribes outcomes — the Dungeon Master responds to what's actually happening in the moment, realistically.

**C) The Overture Principle** — The Director writes only the opening beat of each scene: the setting, the atmosphere, the characters' starting positions, and one player choice. Then the Dungeon Master takes over and runs the scene live.

**D) The Scene Mental Model** — The Transition Director creates a spatial model tracking where every character physically is and what key objects are present. This model is then passed to the Dungeon Master as a baton that gets **updated after every single interaction** — characters move, objects change hands, people arrive and leave. This prevents the surreal teleportation and disappearing props that plague most AI storytelling, because the system always knows the physical state of the scene.

### 10. The Dungeon Master (Live Gameplay)

The heart of the game. While the other nine agents run during the end-of-day pipeline, the Dungeon Master runs **live** — it's the AI the player is actually talking to, in real time, every single interaction. And it's engineered to make even cheap, fast models like Gemini Flash punch *far* above their weight class, producing pro-level narrative output at a fraction of the cost.

The secret is the prompt architecture itself. The DM doesn't rely on the model being smart enough to figure out good storytelling — it **tells the model exactly how to be a good storyteller** through an exhaustive system of rules, protocols, and mandatory self-audit checklists that the AI must run against its own draft before submitting. The result is a structured creative process that catches and corrects the most common LLM failure modes before the player ever sees them:

- **Player Sovereignty** — The absolute #1 rule. The DM is forbidden from speaking for the player, narrating their thoughts or feelings, or steering them toward the planned itinerary. The player's actions are sacred and always canon. If the player contradicts something, the world immediately accepts their version.
- **NPC Autonomy** — Characters aren't passive quest-givers waiting for the player to act. They have desires, initiate conversations, interact with each other, and pursue their own goals. But they're "persuadable obstacles," not immovable walls — player effort is always rewarded with progress.
- **Anti-Loop & Anti-Repetition** — The DM tracks what's already been said and offered in the current scene. If an NPC's offer was ignored by the player, that offer is dead forever — no "second attempts" in different words. No topic gets hammered twice. No dialogue gets recycled.
- **Theory of Mind Enforcement** — Every time an NPC references something that happened elsewhere, the DM must verify with a citation that the character was actually present or was explicitly told. No psychic knowledge, no invented rumors, no vocabulary bleeding between characters who never spoke.
- **Scene Mental Model** — The spatial baton from the Transition Director is updated every single interaction — characters move, objects change hands, people arrive and leave. The DM always knows the physical state of the world.
- **Mandatory Self-Audit** — Before every response, the DM runs its draft through over 80 individual quality checks spanning player agency, continuity, world logic, narrative quality, temporal accuracy, dialogue craft, and schema compliance. Failures are corrected before the player sees anything.

The itinerary from the Narrative Architect isn't a script — it's fuel. The DM offers story beats subtly, once, and lets the player engage or ignore them. Not finishing the planned itinerary is never a failure; respecting player agency is the only measure of success.

### The Memory Architecture at a Glance

```
DISTANT PAST ◄─────────────────────────────────────────────► PRESENT

┌──────────┐  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
│ VOLUME   │  │   BRUTAL     │  │  NOVEL         │  │  RAW TRANSCRIPTS │
│ SUMMARIES│  │  SUMMARIES   │  │  CHAPTERS      │  │                  │
│          │  │              │  │                │  │  Last 2 Days +   │
│ 14-day   │  │  Bullet      │  │  Full prose     │  │  Current Day     │
│ synopses │  │  points      │  │  per day        │  │                  │
└──────────┘  └──────────────┘  └────────────────┘  └──────────────────┘

MOST COMPRESSED ◄───────────────────────────────────► FULL FIDELITY
```

Layered on top: the **Canon Archivist's Fact Sheet** (permanent truths that never compress), **Character Biographies** (who each character has become), **Relationship Dynamics** (the full social graph), and the **Player Backstory Bible** (everything about *you*). Together, these systems ensure that a promise made on Day 3 resurfaces on Day 40 — even though the raw dialogue is long gone.

**No vector database. No RAG. No embeddings.** Just structured lossy compression that preserves narrative causality.

---

## 🆚 For SillyTavern / Roleplay Users

If you spend hours managing **World Info**, **Lorebooks**, and **Character Cards** to keep your RP coherent, this engine automates that entire process:

| What You Do Manually | What This Engine Does Automatically |
|---------------------|--------------------------------------|
| Write/update World Info entries | Canon Archivist extracts and preserves permanent facts |
| Manage character personality cards | Character Developer evolves personas, traits, and motivations every day |
| Track relationship states in your head | Relationship Analyst maintains a structured social graph for *every* character pair |
| Lose context after long sessions | Hybrid Memory fades gracefully — details drop, the story stays |
| Notice the AI "forgot" a plot thread | Arc Manager tracks multi-beat story arcs with automatic sequel generation |
| Manually plan story direction | Narrative Architect generates daily itineraries with affection-gated progression |
| Hope the AI remembers your promises | Scheduler captures every commitment and enforces follow-up |
| Characters feel flat after 20 messages | Psychoanalyst profiles *you*; Character Developer makes NPCs grow based on your actions |
| Invent a character and the AI forgets them | Cast Analyst canonizes emergent characters with names, backstories, and sprites |

All of this runs automatically, every day, without the player lifting a finger.

---

## ✨ Game Features

- **🎭 Total Freedom** — Type anything. Go anywhere. Be anyone. No invisible walls, no "you can't do that." The AI adapts to whatever you do.
- **🧠 Characters That Change** — NPCs aren't static personality cards. They develop, heal, harden, and transform based on *your* actions across hundreds of days.
- **📖 Never-Ending Story Arcs** — Multi-beat narratives that conclude and spawn sequels. Characters never run out of story, and neither does the overarching plot.
- **👥 Invent Anyone** — Mention a character who doesn't exist and they'll be canonized with a name, backstory, and AI-generated sprite. Push them far enough and they'll be promoted to main cast with their own story arcs.
- **🔍 The Game Knows You** — A dedicated Psychoanalyst profiles your play style and personality. NPCs react differently because the engine understands who *you* are.
- **🌸 Seasons & Time** — Play through years of life with changing seasons, weather, holidays, and events.
- **📚 Your Story as a Novel** — Every day becomes a prose chapter. Read your entire playthrough as a novel — and download it.
- **🔒 Your Promises Are Kept** — Make a casual plan with an NPC and the engine schedules it, even if you forget. Nothing falls through the cracks.

## 🎮 How It Works

This is a **text-based visual novel** where you type what your character says and does:

```
Hey Rin, want to grab lunch together?
```
```
*I nervously scratch the back of my head* Look, I need to tell you something...
```

The AI responds as all the characters and narrates the world around you.

## 🔑 Getting Started (Demo)

**You need a Google Gemini API key** — [Get one free at Google AI Studio](https://aistudio.google.com/app/apikey)

> ⚠️ **Important:** You need **Tier 1 access** (add a payment method for $300 free credits). The free tier rate limits are too restrictive for the multi-agent pipeline.

## 💰 Token Usage & Cost

Each interaction sends between **150,000 and 300,000 input tokens** to the model — that's the full weight of the multi-agent context (memory tiers, relationship graphs, character data, story arcs, the scene mental model, and the DM's rules). This is a token-heavy architecture by design, but aggressive caching keeps it viable:

- **80–98% of input tokens are cached** via Google's Gemini context caching, which reduces the cost of cached tokens by **90%**. Most of the context is stable between interactions, so the cache hit rate is extremely high.
- **Output tokens** are typically **2,500–5,000** per interaction, depending on scene complexity.

> **Playing on a free tier key?** It's possible — just keep image generation disabled (off by default in this demo). For the best experience, grab a **Tier 1 free trial** account with **$300 in free credits** — that's enough for hundreds of hours of play on the very capable **Gemini 3.0 Flash** model.

> **Pro tip:** Don't switch between models mid-session. The context cache is model-specific — every time you change models, the entire cache has to be rebuilt from scratch, temporarily losing the cost savings until it warms up again.

## 🎯 Demo Limitations

This demo:
- Starts from a pre-generated Day 1 scenario (the full version generates unique starting points every time)
- Is capped at **Day 3** — continue your story on [ainime-games.com](https://ainime-games.com)
- Does **not save progress** if you refresh — use **Export Save** to keep your story!
- Is **English only** — full version supports all languages

## 🔒 Privacy

Your story stays **100% private**:
- BYOK (Bring Your Own Key) — we never store your API key
- All game state lives on your device (IndexedDB)
- We never see your dialogues or choices
- Save files never contain your API key — safe to share

## 🌐 Full Version

For the complete experience with:
- ✅ Unique story generation every playthrough
- ✅ Unlimited days
- ✅ Persistent saves
- ✅ Multi-language support
- ✅ Character sprite generation
- ✅ Background image generation

Visit **[ainime-games.com](https://ainime-games.com)**

---

*A love letter to high school animes and classic visual novels. Japan, spring of 2000. Step through the gates of Seiyo High.*

*10 AI agents. Infinite memory. One rule: your story, your way.*
