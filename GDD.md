# GAME DESIGN DOCUMENT: Operation 19th Birthday Bash
### (Prototype Version — placeholder assets, generic copy)

## 1. Core Concept
A self-contained, browser-based interactive 2D mini-game. The player travels a world map, and at each location meets a pixel-art cat who is the "keeper" of a real travel memory. Beating that location's mini-challenge unlocks the cat's dialogue and a photo memory together as a single reward. After all locations are cleared, a final "boss" encounter (friendship trivia) unlocks the birthday party finale scene.

This is a PROTOTYPE build: all art is placeholder (labeled divs/boxes), all dialogue is generic Lorem-ipsum-style filler, and the goal is to validate the FEEL of the UI, flow, and transitions before real art and real inside jokes are dropped in.

## 2. Global Aesthetics & Design Rules
* **The Lens:** A permanent "Retro Digicam" UI overlay covers the screen at all times — battery indicator (top right), REC red dot + blinking (top left), corner crosshair brackets, small camera spec text in a corner. `pointer-events: none` so it never blocks clicks.
* **Color Palette:**
  * Background: Light cream / pale blush pink (`#fdf5f6`)
  * Primary Accents: Neon Blue (`#00f0ff`) and Neon Pink (`#ff007f`)
  * Dialogue box: warm tan/cream (`#f5e6c8`) with a brown pixel border (`#5c3d2e`), matching classic Gen 4-style textboxes
  * UI/Borders: Dark slate/black with white glowing text for the digicam overlay specifically
* **Typography:** 16-bit retro pixel font — Google Font `VT323` (or `Press Start 2P` for headers if VT323 feels too thin).
* **Asset Placeholders:** Every character, item, and photo must be a clearly labeled CSS box, e.g.:
  * `<div class="sprite-placeholder" id="dj-cat">[DJ CAT]</div>`
  * `<div class="photo-placeholder" id="greece-photo">[PHOTO: GREECE]</div>`
  These should have a dashed border and a contrasting fill so they're obviously "swap me later" but still look intentional, not broken.

## 3. Core UI Systems

### 3.1 Digicam Overlay
- Fixed position, full-screen, `z-index` above game content, `pointer-events: none`.
- Elements: REC dot (blinking red circle, top-left), battery icon (top-right, simple pixel battery shape), 4 corner crosshair brackets, small "spec" text bottom-left (e.g., "ISO 400 · f/2.8" — flavor text, can be anything pixel-camera-ish).
- Subtle scanline effect: thin repeating horizontal lines at low opacity over the whole screen.

### 3.2 Dialogue Engine (Pokémon-style)
- Fixed box, bottom ~25% of screen.
- Tan/cream background, thick brown pixel border, slight rounded corners (4-6px, keep it blocky not smooth).
- Speaker name tag: small rectangular tab sitting on the top-left edge of the box (like the reference image), dark brown background, white/cream pixel text.
- Portrait box: square placeholder on the left inside the dialogue box for the speaker's sprite.
- Typewriter effect: text types in one character at a time (~30-40ms per character).
- Click/tap anywhere on box: if text still typing, instantly complete it; if text complete, advance to next line or close box.
- Small blinking "▼" indicator bottom-right of box when a line is fully typed and waiting for input.

## 4. Game Flow & Scenes

### Scene 0: Boot-Up
- Screen starts solid black.
- Centered glowing neon blue button: `[ POWER ON ]`, pulsing animation.
- On click: screen flickers (quick CSS opacity flashes) then reveals the Hub Map with digicam overlay fading in.
- Immediately triggers intro dialogue from "MISSION CONTROL" (placeholder generic text, e.g., "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mission briefing incoming.")

### Scene 1: Hub Map
- CSS grid/absolute-positioned map background (placeholder: just a soft lavender/grey blob shapes on cream, labeled with country names).
- 5 location nodes, each a pulsing circular "radar blip":
  1. Greece — unlocked
  2. Ghana — unlocked
  3. Morocco — unlocked
  4. Korea — unlocked
  5. England — locked (greyed out, small lock icon placeholder) until other 4 are cleared
- A small plane/cursor sprite placeholder sits on the map, optionally "flies" (simple CSS transition) to a node when clicked, then transitions (pixel-fade: quick black square wipe) into that location's mini-game scene.
- Small progress tracker UI (e.g., 4 paw-print icons, fill in as each is completed) somewhere unobtrusive, like top-center.

### Scene 2: Mini-Games (Quests)
Generic placeholder mechanics for now — functionally complete but simple, swap in real art/copy later.

* **📍 Greece — "Whack-a-Cat"**
  - A cat placeholder div appears in 1 of 3 fixed "hiding spot" positions on a timer, swaps spots every ~1.2s.
  - Click it 3 times within 10 seconds to win.
  - Win → dialogue from `[DJ CAT]` (generic placeholder lines) + photo placeholder reveal → return to map.

* **📍 Ghana — "Suitcase Scramble"**
  - 3 draggable item placeholders (`[HAIR DYE]`, `[PARTY DRESS]`, `[SUNGLASSES]`) above an open suitcase drop-zone.
  - Drag all 3 into the suitcase to win (snap-to-zone on drop, simple HTML5 drag events).
  - Win → dialogue from `[STYLIST CAT]` + photo placeholder → return to map.

* **📍 Morocco — "Cake Stacker"**
  - A cake-tier placeholder slides left-right across the screen.
  - Click/tap to drop it; if it lands within a tolerance zone over the previous tier, it stacks; if not, retry that tier.
  - Stack 3 tiers to win.
  - Win → dialogue from `[BAKER CAT]` + photo placeholder → return to map.

* **📍 Korea — "Memory Match"**
  - 6 face-down card placeholders (3 pairs, labeled generically e.g. `[DRINK A]` x2, `[DRINK B]` x2, `[DRINK C]` x2).
  - Flip 2 at a time; match = stays face up; no match = flips back after a beat.
  - Match all 3 pairs within a time limit (e.g., 30s) to win.
  - Win → dialogue from `[BARTENDER CAT]` + photo placeholder → return to map.

### Scene 3: Final Boss — England
- Unlocks only when all 4 above are cleared (England node un-greys, pulses more intensely).
- Visual: large `[BOUNCER CAT]` placeholder blocks the screen, dialogue intro (generic, slightly comedic tone — "Lorem ipsum, no one gets in without answering correctly.")
- Mini-game: 3 hardcoded multiple-choice questions (placeholder text + 3 options each), one at a time.
- Wrong answer → short funny placeholder dialogue ("Lorem ipsum, try again!") → retry same question.
- All 3 correct → `[BOUNCER CAT]` steps aside, dialogue grants "VIP Access," transitions to Scene 4.

### Scene 4: Climax & Credits
- Map/game UI fades to black.
- Canvas-based confetti burst — Neon Pink and Neon Blue pieces, physics-lite fall/scatter.
- Large pulsing text: `HAPPY 19TH!` (centered, glowing neon pink/blue alternating or gradient).
- All 4 collected cat placeholders + Bouncer Cat appear in a row at the bottom, simple CSS bounce animation (staggered timing so it looks lively, not synced).
- Credits: a `div` slowly auto-scrolls upward from below the fold, placeholder lines like:
  - "A GAME BY [YOUR NAME]"
  - "STARRING [FRIEND'S NAME]"
  - "SPECIAL THANKS: THE CATS"
  - "HAPPY BIRTHDAY"

## 5. Build Phases (for incremental delivery)
1. **Phase 1:** Boot-up screen + Hub Map with clickable/lockable nodes + digicam overlay + dialogue engine (no mini-games yet, clicking a node just shows a placeholder "mini-game goes here" screen).
2. **Phase 2:** Implement the 4 mini-games one at a time (Greece → Ghana → Morocco → Korea), each wired to trigger dialogue + photo placeholder + return to map on win.
3. **Phase 3:** England final boss (trivia engine) + unlock condition logic.
4. **Phase 4:** Climax scene (confetti canvas, bounce animation, credits scroll) + full play-through wiring/testing.

## 6. Out of Scope for Prototype
- Real pixel art (to be generated separately, e.g., via AI image tools, and swapped into placeholder divs/img tags later)
- Real dialogue/inside jokes (to be hand-written after prototype flow is approved)
- Sound effects/music (can be stubbed with comments for where to hook them in later)
- Mobile responsiveness polish (build desktop-first, can adapt after core loop works)