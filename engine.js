/* ====================================================================
   ENGINE.JS — boot, title, dialogue, hub, transitions, win/lose flow,
   pre-game intro + instruction overlay (shared by all 4 games),
   pixelated world map generator, debug.
==================================================================== */

/* ════════════════════════════════════════════════════════════════════
   📝 EDITING DIALOGUE — HOW TO FIND IT
   ════════════════════════════════════════════════════════════════════
   Every block of text you (the user) need to write is tagged with:
                          [EDIT]
   Press Ctrl+F (or Cmd+F) in your editor and search for that exact
   string. You'll jump between all editable spots in this file AND in
   games.js (Sorting Hat lines + England quiz questions are tagged
   there too).

   What's tagged (= your job):
     - Opening briefing (Rory's first lines)
     - England-unlock announcement
     - Unlock blurbs (Rory after each win)
     - Per-location: framing + boss intro + victory dialogue
     - Locked-node "denied" line
     - England quiz questions (in games.js)
     - Sorting Hat reactions (in games.js)

   What's NOT tagged (= Claude's job):
     - Tutorial bullets, taunt arrays, lose messages, round banners,
       Scene 4 cat reactions. Don't edit those — Claude will polish
       them after you finish your dialogue.
═══════════════════════════════════════════════════════════════════ */

/* ====================================================================
   GAME STATE
==================================================================== */
// Play order: morocco → ghana → korea → nyc → greece. Each win unlocks
// the next. England remains the final lock requiring ALL of these cleared.
var QUESTS = ['morocco', 'ghana', 'korea', 'nyc', 'greece'];

/* --------------------------------------------------------------------
   PLOT TEXT — all editable. Tweak wording later without touching logic.

   - framing:       1-2 lines from Mission Control before each boss intro
   - bossIntro:     2-4 alternating boss/player lines (intro tutorial)
   - victory:       lines played after the player wins the location
   - stolenItem:    short label of what the cat stole (for flavor)
-------------------------------------------------------------------- */
var QUEST_META = {
  // [EDIT] GREECE — framing line + Jinx intro/victory dialogue
  greece: {
    title: 'GREECE — WHACK-A-CAT',
    speaker: 'JINX',
    portrait: 'dj_cat_portrait',
    intro: 'dj_cat_intro',
    defeated: 'dj_cat_defeated',
    stolenItem: 'BIRTHDAY PLAYLIST',
    rewardIcon: 'reward_greece',
    framing: "Jinx fled to Greece with Ella's birthday playlist. No music means no dance floor. Bring it home.",
    bossIntro: [
      { speaker: 'JINX', portrait: 'dj_cat_portrait', text: "Heh. Look who finally landed on my island, Ella." },
      { speaker: 'ELLA',   portrait: 'player_neutral',  text: "Hand over the playlist, DJ. The party is tonight." },
      { speaker: 'JINX', portrait: 'dj_cat_portrait', text: "Earn it. Twelve holes. Fast paws. No mercy. Let's see if you keep up." },
      { speaker: 'ELLA',   portrait: 'player_neutral',  text: "Try me." }
    ],
    victory: [
      { speaker: 'JINX', portrait: 'dj_cat_defeated', text: "...alright, Ella. You earned the deck." },
      { speaker: 'ELLA',   portrait: 'player_excited',  text: "And the playlist?" },
      { speaker: 'JINX', portrait: 'dj_cat_defeated', text: "Yours. Take it. Make 'em dance tonight." }
    ]
  },

  // [EDIT] GHANA — framing line + Coco intro/victory dialogue
  ghana: {
    title: 'GHANA — SUITCASE SCRAMBLE',
    speaker: 'COCO',
    portrait: 'stylist_cat_portrait',
    intro: 'stylist_cat_intro',
    defeated: 'stylist_cat_defeated',
    stolenItem: 'BIRTHDAY OUTFIT',
    rewardIcon: 'reward_ghana',
    framing: "Coco is in Ghana with Ella's birthday outfit — dress, accessories, all of it. Recover the pieces.",
    bossIntro: [
      { speaker: 'COCO', portrait: 'stylist_cat_portrait', text: "Ella. You flew all the way to West Africa for a dress?" },
      { speaker: 'ELLA',        portrait: 'player_neutral',       text: "Hand it back, Stylist. The whole outfit." },
      { speaker: 'COCO', portrait: 'stylist_cat_portrait', text: "I'll toss the pieces down from my tower. Catch the right ones and they're yours. Mess up... well, two strikes." },
      { speaker: 'ELLA',        portrait: 'player_neutral',       text: "Throw them. I've got this." }
    ],
    victory: [
      { speaker: 'COCO', portrait: 'stylist_cat_defeated', text: "Fine. Fine. You've got an eye for it, Ella, I'll give you that." },
      { speaker: 'ELLA',        portrait: 'player_excited',       text: "And the outfit?" },
      { speaker: 'COCO', portrait: 'stylist_cat_defeated', text: "Every piece. Go on." }
    ]
  },

  // [EDIT] MOROCCO — framing line + Mocha intro/victory dialogue
  morocco: {
    title: 'MOROCCO — CAKE STACKER',
    speaker: 'MOCHA',
    portrait: 'baker_cat_portrait',
    intro: 'baker_cat_intro',
    defeated: 'baker_cat_defeated',
    stolenItem: 'BIRTHDAY CAKE',
    rewardIcon: 'reward_morocco',
    framing: "Mocha ran to Morocco with the entire birthday cake. He's been re-icing it under a fake name. Get it back.",
    bossIntro: [
      { speaker: 'MOCHA', portrait: 'baker_cat_portrait', text: "Ah! Another customer. The cake is almost done." },
      { speaker: 'ELLA',      portrait: 'player_neutral',     text: "That cake belongs to me, Baker. I'm taking it back." },
      { speaker: 'MOCHA', portrait: 'baker_cat_portrait', text: "Then stack it yourself, Ella. Steady hands. Topple it... and we both lose." },
      { speaker: 'ELLA',      portrait: 'player_neutral',     text: "Watch me." }
    ],
    victory: [
      { speaker: 'MOCHA', portrait: 'baker_cat_defeated', text: "Hmph. Steady hands after all." },
      { speaker: 'ELLA',      portrait: 'player_excited',     text: "And the cake?" },
      { speaker: 'MOCHA', portrait: 'baker_cat_defeated', text: "Take it. Don't drop it on the way home." }
    ]
  },

  // [EDIT] KOREA — framing line + Bourbon intro/victory dialogue
  korea: {
    title: 'KOREA — MEMORY MATCH',
    speaker: 'BOURBON',
    portrait: 'bartender_cat_portrait',
    intro: 'bartender_cat_intro',
    defeated: 'bartender_cat_defeated',
    stolenItem: 'PARTY DRINKS',
    rewardIcon: 'reward_korea',
    framing: "Bourbon skipped to Korea and is hoarding every celebration drink at his bar. Recover them before someone gets thirsty.",
    bossIntro: [
      { speaker: 'BOURBON', portrait: 'bartender_cat_portrait', text: "Welcome to my bar, Ella. What's your poison tonight?" },
      { speaker: 'ELLA',          portrait: 'player_neutral',         text: "All of them. Every bottle belongs to my party." },
      { speaker: 'BOURBON', portrait: 'bartender_cat_portrait', text: "Match the pairs and the bottles are yours. Mismatch and I might lose count of what I owe." },
      { speaker: 'ELLA',          portrait: 'player_neutral',         text: "Pour them. I remember everything." }
    ],
    victory: [
      { speaker: 'BOURBON', portrait: 'bartender_cat_defeated', text: "Nobody remembers all ten. How?" },
      { speaker: 'ELLA',          portrait: 'player_laugh',           text: "Cuz I'm an alchoholic" },
      { speaker: 'BOURBON', portrait: 'bartender_cat_defeated', text: "...fair enough, Ella. Drinks are yours." }
    ]
  },

  // [EDIT] NYC — framing line + Bronx intro/victory dialogue
  nyc: {
    title: 'NEW YORK — TAXI DASH',
    speaker: 'BRONX',
    portrait: 'taxicat_portrait',
    intro: 'taxicat_intro',
    defeated: 'taxicat_defeated',
    stolenItem: 'PARTY INVITES',
    rewardIcon: 'reward_nyc',
    framing: "Bronx hijacked the entire stack of birthday invites in Manhattan. He was supposed to deliver them. He floored it instead. Run him down through Midtown.",
    bossIntro: [
      { speaker: 'BRONX', portrait: 'taxicat_portrait', text: "Yeah, look who finally got off the plane. You here for the fare?" },
      { speaker: 'ELLA',     portrait: 'player_neutral',   text: "Hand back the invites, Taxi. People need to know where the party is." },
      { speaker: 'BRONX', portrait: 'taxicat_portrait', text: "Five blocks. Three lanes. If you can keep up through Midtown, they're yours. Three strikes, kid." },
      { speaker: 'ELLA',     portrait: 'player_neutral',   text: "Drive." }
    ],
    victory: [
      { speaker: 'BRONX', portrait: 'taxicat_defeated', text: "Tch. You city-driver now, Ella." },
      { speaker: 'ELLA',     portrait: 'player_excited',   text: "The invites?" },
      { speaker: 'BRONX', portrait: 'taxicat_defeated', text: "Backseat. Take 'em. Deliver 'em yourself." }
    ]
  },

  // [EDIT] ENGLAND — framing line + Ambrose intro/victory dialogue
  england: {
    title: 'ENGLAND — THE SORTING GATE',
    speaker: 'AMBROSE',
    portrait: 'wizard_cat_portrait',
    intro: 'wizard_cat_intro',
    defeated: 'wizard_cat_defeated',
    stolenItem: 'EVERYTHING',
    rewardIcon: 'reward_england',
    framing: "Every recovered piece traces back here. Ambrose is the ringleader of the Cartel — and beyond his gate is everything they took. This is the finale.",
    bossIntro: [
      { speaker: 'AMBROSE', portrait: 'wizard_cat_portrait', text: "Hmph. So you arrive at last." },
      { speaker: 'ELLA',          portrait: 'player_neutral',     text: "Hand it all over, Professor. Every piece they took." },
      { speaker: 'AMBROSE', portrait: 'wizard_cat_portrait', text: "The Sorting Hat decides who passes. Five questions. The truth only." },
      { speaker: 'ELLA',          portrait: 'player_neutral',     text: "Ask. I'm done playing." }
    ],
    victory: [
      { speaker: 'AMBROSE', portrait: 'wizard_cat_defeated', text: "...well played, Ella. It's all yours." },
      { speaker: 'ELLA',          portrait: 'player_excited',     text: "And everything the Cartel took?" },
      { speaker: 'AMBROSE', portrait: 'wizard_cat_defeated', text: "Returned. Every piece. The party happens tonight." },
      { speaker: 'ELLA',          portrait: 'player_excited',     text: "Then let's throw it." }
    ]
  }
};

/* --------------------------------------------------------------------
   Opening Mission Control briefing — first time the hub map appears.
-------------------------------------------------------------------- */
// [EDIT] OPENING BRIEFING — Rory's first lines (plays once on hub load)
var OPENING_BRIEFING = [
  { speaker: 'RORY', portrait: 'rory_neutral',
    text: "Yo Ella — wake up. We have a situation. The Mafia Cats have struck." },
  { speaker: 'RORY', portrait: 'rory_neutral',
    text: "Six of them. They call themselves 'the Cartel.' Six birthday-party-crashing alley cats." },
  { speaker: 'RORY', portrait: 'rory_neutral',
    text: "They've stolen your playlist, your outfit, the cake, the drinks, the invites — pieces of your whole 19th birthday." },
  { speaker: 'RORY', portrait: 'rory_sleepy',
    text: "Five have scattered to five locations with the loot. Their ringleader is holed up at a sixth." },
  { speaker: 'RORY', portrait: 'rory_neutral',
    text: "Start in Morocco — Mocha went off the grid with the cake. Work your way around. Save the ringleader for last." },
  { speaker: 'RORY', portrait: 'rory_happy',
    text: "Tap a blinking marker on the map to begin, Ella. I'm right here with you." }
];

/* --------------------------------------------------------------------
   England-unlock announcement (after all 5 side quests cleared).
-------------------------------------------------------------------- */
// [EDIT] ENGLAND UNLOCK — Rory's lines when the final gate opens
var ENGLAND_UNLOCK = [
  { speaker: 'RORY', portrait: 'rory_happy',
    text: "All five cats neutralized, Ella. Every piece is on its way home." },
  { speaker: 'RORY', portrait: 'rory_neutral',
    text: "But our intel says they're not the ones who planned this. There's a sixth cat — the ringleader — in England." },
  { speaker: 'RORY', portrait: 'rory_neutral',
    text: "Behind his gate is everything they took. Beat him and the party happens. Proceed when ready." }
];

var State = {
  // Morocco is the new starting location (first in QUESTS). Everything
  // else is locked until the chain unlocks them.
  unlocked:  { morocco: true, ghana: false, korea: false, nyc: false, greece: false, england: false },
  completed: { morocco: false, ghana: false, korea: false, nyc: false, greece: false, england: false },
  currentLocation: null,
  busy: false
};

// Human-readable names + brief blurbs used by the locked-node dialogue
// and the "unlocked" lines after each win.
var LOCATION_NAMES = {
  greece:  'Greece',
  ghana:   'Ghana',
  korea:   'Korea',
  nyc:     'New York',
  morocco: 'Morocco',
  england: 'England'
};
// [EDIT] UNLOCK BLURBS — Rory's one-liner shown right after each win
var UNLOCK_BLURBS = {
  // morocco starts unlocked, so no blurb for it.
  ghana:   "Ghana is open — Coco has your outfit.",
  korea:   "Korea is open — Bourbon is sitting on your drinks.",
  nyc:     "New York is open — Bronx has the invites.",
  greece:  "Greece is open — Jinx has the playlist.",
  england: "England is open. The ringleader is waiting."
};

var Games = {};         // populated by games.js
var INSTRUCTIONS = {};  // populated by games.js (per-game briefing text)
var activeCleanup = null;

/* ====================================================================
   DOM REFS
==================================================================== */
var dialogueBox      = document.getElementById('dialogue-box');
var speakerTag       = document.getElementById('speaker-tag');
var portraitEl       = document.getElementById('portrait');
var dialogueText     = document.getElementById('dialogue-text');
var dialogueNext     = document.getElementById('dialogue-next');
var titleScreen      = document.getElementById('title-screen');
var startButton      = document.getElementById('start-button');
var hubMap           = document.getElementById('hub-map');
var digicam          = document.getElementById('digicam');
var plane            = document.getElementById('plane');
var minigameScreen   = document.getElementById('minigame-screen');
var minigameTitle    = document.getElementById('minigame-title');
var minigameSubtitle = document.getElementById('minigame-subtitle');
var minigameStage    = document.getElementById('minigame-stage');
var backButton       = document.getElementById('back-button');
var wipe             = document.getElementById('wipe');
var scene4Screen     = document.getElementById('scene4-screen');
var scene4Back       = document.getElementById('scene4-back');
var debugReset       = document.getElementById('debug-reset');
var nodes            = document.querySelectorAll('.node');

/* ====================================================================
   ASSET HELPERS — portraits/sprites can be either an image filename
   (we'll render <img>) or a "[BRACKETED]" text placeholder.
==================================================================== */
function imgTag(name, cls) {
  return '<img src="images/' + name + '.png" alt="" class="' + (cls || '') + '" />';
}

/* --------------------------------------------------------------------
   CHARACTER NAME REGISTRY
   When writing dialogue lines, address characters by these names so
   the on-screen name caption matches what they say. Format under the
   portrait is "NAME — ROLE".

   - ELLA           the player / birthday agent
   - RORY           the companion cat / handler back at HQ
   - JINX     — DJ          (Greece — playlist)
   - COCO     — STYLIST     (Ghana  — outfit)
   - MOCHA    — BAKER       (Morocco — cake)
   - BOURBON  — BARTENDER   (Korea — drinks)
   - BRONX    — CABBIE      (NYC   — invites)
   - AMBROSE  — PROFESSOR   (England — ringleader)
   - THE HAT  — JUDGE       (Sorting Hat in England's trivia)
-------------------------------------------------------------------- */
var PORTRAIT_CAPTIONS = {
  'dj_cat_portrait':        { name: 'JINX',    role: 'DJ' },
  'dj_cat_defeated':        { name: 'JINX',    role: 'DJ' },
  'dj_cat_intro':           { name: 'JINX',    role: 'DJ' },
  'stylist_cat_portrait':   { name: 'COCO',    role: 'STYLIST' },
  'stylist_cat_defeated':   { name: 'COCO',    role: 'STYLIST' },
  'stylist_cat_intro':      { name: 'COCO',    role: 'STYLIST' },
  'baker_cat_portrait':     { name: 'MOCHA',   role: 'BAKER' },
  'baker_cat_defeated':     { name: 'MOCHA',   role: 'BAKER' },
  'baker_cat_intro':        { name: 'MOCHA',   role: 'BAKER' },
  'bartender_cat_portrait': { name: 'BOURBON', role: 'BARTENDER' },
  'bartender_cat_defeated': { name: 'BOURBON', role: 'BARTENDER' },
  'bartender_cat_intro':    { name: 'BOURBON', role: 'BARTENDER' },
  'taxicat_portrait':       { name: 'BRONX',   role: 'CABBIE' },
  'taxicat_defeated':       { name: 'BRONX',   role: 'CABBIE' },
  'taxicat_intro':          { name: 'BRONX',   role: 'CABBIE' },
  'wizard_cat_portrait':    { name: 'AMBROSE', role: 'PROFESSOR' },
  'wizard_cat_defeated':    { name: 'AMBROSE', role: 'PROFESSOR' },
  'wizard_cat_intro':       { name: 'AMBROSE', role: 'PROFESSOR' },
  'sorting_hat_portrait':   { name: 'THE HAT', role: 'JUDGE' },
  'rory_neutral':           { name: 'RORY',    role: 'HANDLER' },
  'rory_happy':             { name: 'RORY',    role: 'HANDLER' },
  'rory_sleepy':            { name: 'RORY',    role: 'HANDLER' },
  'player_neutral':         { name: 'ELLA',    role: 'AGENT' },
  'player_excited':         { name: 'ELLA',    role: 'AGENT' },
  'player_laugh':           { name: 'ELLA',    role: 'AGENT' }
};

function setPortrait(el, value) {
  if (!el) return;
  if (!value) { el.innerHTML = ''; el.textContent = '[CHAR]'; el.classList.add('has-text'); return; }
  if (value.charAt(0) === '[') {
    el.innerHTML = '';
    el.textContent = value;
    el.classList.add('has-text');
  } else {
    el.classList.remove('has-text');
    var caption = PORTRAIT_CAPTIONS[value];
    var capHtml = '';
    if (caption) {
      capHtml =
        '<div class="portrait-caption">' +
          '<span class="caption-name">' + caption.name + '</span>' +
          (caption.role
            ? '<span class="caption-role">' + caption.role + '</span>'
            : '') +
        '</div>';
    }
    el.innerHTML = imgTag(value) + capHtml;
  }
}

/* ====================================================================
   POLISH HELPERS — shake + pulse
==================================================================== */
function shakeElement(el, intensity) {
  if (!el) return;
  var cls = intensity === 'hard' ? 'shake-hard' : 'shake-light';
  el.classList.remove('shake-light', 'shake-hard');
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(function () { el.classList.remove(cls); }, intensity === 'hard' ? 240 : 200);
}
function pulseHud(el) {
  if (!el) return;
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
  setTimeout(function () { el.classList.remove('pulse'); }, 340);
}

/* --------------------------------------------------------------------
   BOSS BANTER — boss portrait + small speech bubble during gameplay.
   Non-blocking, fades after ~2.6s. Each game schedules its own pick.
   Second arg `portraitName` is the cat's portrait image (e.g.
   'dj_cat_portrait'); the boss's face appears next to the bubble.
-------------------------------------------------------------------- */
function showBossBanter(text, portraitName) {
  if (!minigameStage) return;
  // Avoid stacking — remove any existing bubble first
  var existing = minigameStage.querySelector('.boss-banter');
  if (existing) existing.remove();
  var container = document.createElement('div');
  container.className = 'boss-banter';
  var html = '';
  if (portraitName) {
    html += '<img class="boss-banter-portrait" src="images/' + portraitName + '.png" alt="" />';
  }
  html += '<div class="boss-banter-bubble">' + text + '</div>';
  container.innerHTML = html;
  minigameStage.appendChild(container);
  setTimeout(function () { if (container.parentNode) container.remove(); }, 2700);
}

/* --------------------------------------------------------------------
   POLAROID PIN — drop a "collected memory" polaroid onto the corkboard
   hub background when a location is won. Idempotent: re-clicking a won
   game won't add duplicate polaroids.
-------------------------------------------------------------------- */
function addPolaroidPin(id) {
  var board = document.getElementById('polaroid-board');
  if (!board) return;
  if (board.querySelector('[data-pin="' + id + '"]')) return;
  var meta = QUEST_META[id];
  if (!meta) return;

  var pin = document.createElement('div');
  pin.className = 'polaroid-pin polaroid-' + id;
  pin.dataset.pin = id;

  // Inner art: real travel photo from /photos folder.
  // Filename map: lowercase id + .png, EXCEPT NYC which is uppercase.
  var photoFile = (id === 'nyc') ? 'NYC' : id;
  pin.innerHTML =
    '<img src="photos/' + photoFile + '.png" alt="" />' +
    '<div class="polaroid-label">' + (LOCATION_NAMES[id] || id) + '</div>';
  board.appendChild(pin);
}

/* Big mid-screen banner for round transitions / bomb resets / etc. */
function showRoundBanner(text) {
  if (!minigameStage) return;
  var existing = minigameStage.querySelector('.round-banner');
  if (existing) existing.remove();
  var b = document.createElement('div');
  b.className = 'round-banner';
  b.textContent = text;
  minigameStage.appendChild(b);
  setTimeout(function () { if (b.parentNode) b.remove(); }, 1700);
}

/* ====================================================================
   DIALOGUE ENGINE
==================================================================== */
var TYPE_SPEED_MS = 32;
var typingTimer = null;
var dialogueQueue = [];
var onDialogueDone = null;
var currentFullLine = '';
var isTyping = false;
var lineComplete = false;

function startDialogue(lines, onComplete) {
  dialogueQueue = lines.slice();
  onDialogueDone = onComplete || null;
  State.busy = true;
  dialogueBox.classList.remove('active');
  void dialogueBox.offsetWidth;
  dialogueBox.classList.add('active');
  advanceDialogue();
}
function advanceDialogue() {
  if (dialogueQueue.length === 0) { closeDialogue(); return; }
  var line = dialogueQueue.shift();
  speakerTag.textContent = line.speaker || 'SPEAKER';
  setPortrait(portraitEl, line.portrait);
  typeLine(line.text || '');
}
function typeLine(fullText) {
  currentFullLine = fullText;
  dialogueText.textContent = '';
  dialogueNext.classList.remove('show');
  isTyping = true; lineComplete = false;
  var i = 0;
  if (typingTimer) clearInterval(typingTimer);
  typingTimer = setInterval(function () {
    if (i < fullText.length) {
      dialogueText.textContent += fullText[i++];
    } else {
      clearInterval(typingTimer); typingTimer = null;
      isTyping = false; lineComplete = true;
      dialogueNext.classList.add('show');
    }
  }, TYPE_SPEED_MS);
}
function closeDialogue() {
  dialogueBox.classList.remove('active');
  if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
  isTyping = false; lineComplete = false;
  State.busy = false;
  var cb = onDialogueDone;
  onDialogueDone = null;
  if (cb) cb();
}
dialogueBox.addEventListener('click', function () {
  if (isTyping) {
    clearInterval(typingTimer); typingTimer = null;
    dialogueText.textContent = currentFullLine;
    isTyping = false; lineComplete = true;
    dialogueNext.classList.add('show');
  } else if (lineComplete) {
    advanceDialogue();
  }
});

/* ====================================================================
   SCENE 0 — TITLE SCREEN
==================================================================== */
startButton.addEventListener('click', function () {
  // SOUND HOOK: play("title_start");
  titleScreen.classList.add('fading-out');
  setTimeout(function () {
    titleScreen.style.display = 'none';
    enterHubMap(true);
  }, 420);
});

function enterHubMap(firstBoot) {
  hubMap.classList.add('active');
  requestAnimationFrame(function () {
    hubMap.classList.add('fade-in');
    digicam.classList.add('active');
  });
  positionPlaneAtHome();

  if (firstBoot) {
    setTimeout(function () {
      startDialogue(OPENING_BRIEFING);
    }, 900);
  }
}

/* ====================================================================
   SCENE 1 — HUB MAP INTERACTIONS
==================================================================== */
function positionPlaneAtHome() {
  plane.src = 'images/plane_idle.png';
  // Use the same clamp() expression CSS uses so the home position
  // tracks the plane's actual rendered width across viewport sizes.
  plane.style.left = 'calc(95% - clamp(80px, 11vmin, 150px))';
  plane.style.top  = '4%';
}

nodes.forEach(function (node) {
  node.addEventListener('click', function () {
    if (State.busy) return;
    var id = node.dataset.id;
    if (!State.unlocked[id]) {
      var required = nextRequiredFor(id);
      var msg;
      // [EDIT] DENIED LINE — Rory's reply when player taps a locked node
      if (required) {
        msg = "Locked, Ella. Beat " + (LOCATION_NAMES[required] || required) + " first.";
      } else {
        msg = "Locked, Ella. Finish the rest of the run first.";
      }
      startDialogue([
        { speaker: 'RORY', portrait: 'rory_sleepy', text: msg }
      ]);
      return;
    }
    State.busy = true;
    flyPlaneToNode(node, function () {
      doWipe(function () {
        showMinigame(id);
        State.busy = false;
      });
    });
  });
});

function flyPlaneToNode(node, done) {
  plane.src = 'images/plane_flying.png';
  var nRect = node.getBoundingClientRect();
  var mRect = hubMap.getBoundingClientRect();
  var left = (nRect.left - mRect.left) + nRect.width  / 2 - plane.offsetWidth  / 2;
  var top  = (nRect.top  - mRect.top)  + nRect.height / 2 - plane.offsetHeight / 2;
  plane.style.left = left + 'px';
  plane.style.top  = top  + 'px';
  setTimeout(done, 1150);
}

/* ====================================================================
   TRANSITION WIPE
==================================================================== */
function doWipe(midwayCallback) {
  wipe.classList.add('active');
  setTimeout(function () {
    if (midwayCallback) midwayCallback();
    setTimeout(function () { wipe.classList.remove('active'); }, 100);
  }, 370);
}

/* ====================================================================
   SCENE 2 — MINI-GAME HOST
   Sequence: pre-game intro → instruction overlay → gameplay
==================================================================== */
function showMinigame(id) {
  State.currentLocation = id;
  hubMap.classList.remove('active');
  hubMap.classList.remove('fade-in');
  minigameScreen.classList.add('active');

  var meta = QUEST_META[id];
  minigameTitle.textContent = meta.title;
  minigameSubtitle.textContent = '';

  // Tear down any prior game state before starting a fresh chain
  if (activeCleanup) { try { activeCleanup(); } catch (e) {} activeCleanup = null; }
  minigameStage.innerHTML = '';

  // Track aborts: if the player hits BACK during intro/instructions,
  // we need the queued callbacks to no-op.
  var aborted = { value: false };
  activeCleanup = function abortIntroChain() { aborted.value = true; };

  showPreGameIntro(id, aborted, function () {
    if (aborted.value) return;
    runFramingThenBossIntro(meta, aborted, function () {
      if (aborted.value) return;
      showInstructionScreen(id, aborted, function () {
        // Replace the abort-only cleanup with the real game's cleanup.
        activeCleanup = null;
        if (Games[id]) {
          activeCleanup = Games[id](minigameStage);
        }
      });
    });
  });
}

function runFramingThenBossIntro(meta, aborted, onDone) {
  var lines = [];
  if (meta.framing) {
    lines.push({ speaker: 'RORY', portrait: 'rory_neutral', text: meta.framing });
  }
  if (meta.bossIntro && meta.bossIntro.length) {
    lines = lines.concat(meta.bossIntro);
  }
  if (lines.length === 0) { onDone(); return; }
  startDialogue(lines, function () { if (!aborted.value) onDone(); });
}

function showPreGameIntro(id, aborted, onDone) {
  var meta = QUEST_META[id];
  var overlay = document.createElement('div');
  overlay.className = 'pre-game-intro';
  overlay.innerHTML =
    imgTag('plane_flying',         'intro-plane') +
    imgTag('banner_unlocked',      'intro-banner') +
    imgTag(meta.intro,             'intro-cat') +
    '<div class="intro-skip-hint">[ CLICK TO SKIP ]</div>';
  minigameStage.appendChild(overlay);

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    if (overlay.parentNode) overlay.remove();
    if (aborted.value) return;
    onDone();
  }
  overlay.addEventListener('click', finish);
  setTimeout(finish, 2200);
}

function showInstructionScreen(id, aborted, onStart) {
  var meta = QUEST_META[id];
  var inst = INSTRUCTIONS[id] || { title: meta.title, bullets: ['Click START to play.'] };

  var bullets = inst.bullets.map(function (b) {
    // Allow simple class hints: 'PACK::...' / 'SKIP::...'
    if (b.indexOf('PACK::') === 0) return '<li><span class="pack-list">' + b.slice(6) + '</span></li>';
    if (b.indexOf('SKIP::') === 0) return '<li><span class="skip-list">' + b.slice(6) + '</span></li>';
    return '<li>' + b + '</li>';
  }).join('');

  var overlay = document.createElement('div');
  overlay.className = 'instruction-overlay';
  overlay.innerHTML =
    '<div class="instruction-content">' +
      imgTag(meta.intro, 'instruction-cat') +
      '<div class="instruction-eyebrow">MISSION BRIEFING</div>' +
      '<div class="instruction-title">' + inst.title + '</div>' +
      '<ul class="instruction-bullets">' + bullets + '</ul>' +
      '<button class="btn btn-pink instruction-start" id="instruction-start">[ START ]</button>' +
    '</div>';
  minigameStage.appendChild(overlay);

  overlay.querySelector('#instruction-start').addEventListener('click', function () {
    if (overlay.parentNode) overlay.remove();
    if (aborted.value) return;
    onStart();
  });
}

backButton.addEventListener('click', function () {
  if (State.busy) return;
  State.busy = true;
  if (activeCleanup) { try { activeCleanup(); } catch (e) {} activeCleanup = null; }
  doWipe(function () {
    minigameScreen.classList.remove('active');
    minigameStage.innerHTML = '';
    hubMap.classList.add('active');
    requestAnimationFrame(function () { hubMap.classList.add('fade-in'); });
    positionPlaneAtHome();
    State.busy = false;
  });
});

/* ====================================================================
   SHARED WIN / LOSE FLOW
==================================================================== */
function winLocation(id) {
  State.completed[id] = true;
  updateProgressTracker();
  updateNodeStates();
  // Polaroid is added AFTER the wipe finishes (see doWipe midway below)
  // so the player sees the fade-in animation when they land on the hub.

  if (activeCleanup) { try { activeCleanup(); } catch (e) {} activeCleanup = null; }

  var meta = QUEST_META[id];

  // Swap stage: victory banner + defeated cat pose + reward-icon slot
  // (reward icon = real art when supplied via meta.rewardIcon; placeholder otherwise)
  var stolenLabel = meta.stolenItem || id.toUpperCase();
  var rewardSlot;
  if (meta.rewardIcon) {
    rewardSlot =
      '<div class="reward-icon-slot reward-icon-slot--filled" id="' + id + '-reward" data-location="' + id + '">' +
        imgTag(meta.rewardIcon, 'reward-icon-img') +
        '<div class="reward-icon-caption">' + stolenLabel + '</div>' +
      '</div>';
  } else {
    rewardSlot =
      '<div class="reward-icon-slot reward-icon-slot--placeholder" id="' + id + '-reward" data-location="' + id + '">' +
        '<div class="reward-icon-placeholder">[REWARD ICON]</div>' +
        '<div class="reward-icon-caption">' + stolenLabel + '</div>' +
      '</div>';
  }
  minigameStage.innerHTML =
    '<div class="win-view">' +
      imgTag('banner_victory', 'win-banner') +
      imgTag(meta.defeated,    'win-cat') +
      rewardSlot +
    '</div>';

  shakeElement(minigameStage, 'light');

  // Build the victory dialogue: per-location lines, then a Rory unlock beat
  var victoryLines = (meta.victory && meta.victory.length)
    ? meta.victory.slice()
    : [
        { speaker: meta.speaker, portrait: meta.portrait,
          text: "Lorem ipsum dolor sit amet — placeholder victory line." }
      ];

  // Unlock the next location in QUESTS order (if any) and append a brief
  // Mission Control line so Ella knows what just opened.
  var newlyUnlocked = unlockNextQuest(id);
  if (newlyUnlocked) {
    victoryLines.push({
      speaker: 'RORY',
      portrait: 'rory_happy',
      text: UNLOCK_BLURBS[newlyUnlocked] || (LOCATION_NAMES[newlyUnlocked] + ' is open.')
    });
  }

  State.busy = true;
  startDialogue(victoryLines, function () {
    State.busy = true;
    doWipe(function () {
      minigameScreen.classList.remove('active');
      minigameStage.innerHTML = '';
      hubMap.classList.add('active');
      requestAnimationFrame(function () { hubMap.classList.add('fade-in'); });
      positionPlaneAtHome();
      State.busy = false;
      // Drop the polaroid for the location we just won (with fade-in)
      addPolaroidPin(id);
      // Play deferred lock-unlock animations once the map is back in view
      playPendingUnlockAnims();
      maybeUnlockEngland();
    });
  });
}

function loseLocation(id, message) {
  if (activeCleanup) { try { activeCleanup(); } catch (e) {} activeCleanup = null; }
  shakeElement(minigameStage, 'hard');
  var meta = QUEST_META[id];

  // Replace stage with lose view (banner + cat intro pose looking smug)
  minigameStage.innerHTML =
    '<div class="lose-view">' +
      imgTag('banner_defeat', 'lose-banner') +
      imgTag(meta.intro,      'lose-cat') +
    '</div>';

  startDialogue([
    { speaker: meta.speaker, portrait: meta.portrait,
      text: message || 'Lorem ipsum: try again, agent.' }
  ], function () {
    // Restart this game from the intro chain
    showMinigame(id);
  });
}

/* ====================================================================
   PROGRESS / UNLOCK
==================================================================== */
function updateProgressTracker() {
  QUESTS.forEach(function (q) {
    var paw = document.querySelector('.paw[data-paw="' + q + '"]');
    if (!paw) return;
    if (State.completed[q]) {
      paw.classList.remove('filled');
      void paw.offsetWidth;
      paw.classList.add('filled');
      paw.textContent = '[*]';
    } else {
      paw.classList.remove('filled');
      paw.textContent = '[ ]';
    }
  });
}

function updateNodeStates() {
  nodes.forEach(function (node) {
    var id = node.dataset.id;
    node.classList.toggle('completed', !!State.completed[id]);
    node.classList.toggle('locked', !State.unlocked[id]);
    var cm = node.querySelector('.check-mark');
    if (cm) cm.textContent = State.completed[id] ? '✓' : '';
    if (id === 'england') {
      node.classList.toggle('boss-ready', State.unlocked.england && !State.completed.england);
      var label = node.querySelector('.node-label');
      if (label) label.textContent = State.unlocked.england ? 'ENGLAND' : 'ENGLAND ?';
    }
  });
}

function maybeUnlockEngland() {
  var allDone = QUESTS.every(function (q) { return State.completed[q]; });
  if (allDone && !State.unlocked.england) {
    State.unlocked.england = true;
    updateNodeStates();
    triggerLockUnlockAnim();
    startDialogue(ENGLAND_UNLOCK);
  }
}

function triggerLockUnlockAnim(id) {
  var node = document.querySelector('.node[data-id="' + id + '"]');
  if (!node) return;
  var lockImg = node.querySelector('.lock-icon');
  if (!lockImg) return;
  // Swap to "unlocked" image briefly with a pop, then remove
  lockImg.src = 'images/lock_unlocked_icon.png';
  lockImg.classList.add('unlocking');
  setTimeout(function () {
    if (lockImg.parentNode) lockImg.remove();
  }, 1400);
}

/* --------------------------------------------------------------------
   Progression unlock: each win opens the NEXT entry in QUESTS.
   Returns the id of the newly-unlocked location, or null if none.
-------------------------------------------------------------------- */
var pendingUnlockAnims = [];

function unlockNextQuest(completedId) {
  var idx = QUESTS.indexOf(completedId);
  if (idx < 0 || idx >= QUESTS.length - 1) return null;
  var nextId = QUESTS[idx + 1];
  if (State.unlocked[nextId]) return null;
  State.unlocked[nextId] = true;
  updateNodeStates();
  // Defer the lock-pop animation until the player is actually looking
  // at the map (i.e., after the wipe back from the minigame screen).
  pendingUnlockAnims.push(nextId);
  return nextId;
}
function playPendingUnlockAnims() {
  pendingUnlockAnims.forEach(function (id) { triggerLockUnlockAnim(id); });
  pendingUnlockAnims = [];
}

/* For the locked-node click: the EARLIEST uncompleted location in the
   QUESTS chain — that's the actual next thing to do regardless of
   which downstream-locked node the player clicked. */
function nextRequiredFor(_targetId) {
  for (var i = 0; i < QUESTS.length; i++) {
    if (!State.completed[QUESTS[i]]) return QUESTS[i];
  }
  return null;
}

/* ====================================================================
   SCENE 4 — CLIMAX (confetti canvas + bouncing cats + auto-scroll credits)
==================================================================== */
var confettiRafId = null;
var confettiBurstInterval = null;
var confettiParticlesRef = null; // module-level reference so cat-clicks can inject bursts

function showScene4() {
  scene4Screen.classList.add('active');
  startSceneFourConfetti();
  wireSceneFourInteractions();
  // Force a fresh start of the credit rolls every time Scene 4 opens
  // (otherwise re-entering via /loop, replay, or back-to-map+win sequence
  // could leave the animation in a finished state).
  restartCreditsScroll();
}

/* --------------------------------------------------------------------
   CREDITS SCROLL — JS-driven via Web Animations API.
   Measures real content height at runtime so the full content (no
   matter how tall) always scrolls through the viewport. The animation
   translates the roll from "fully below the column" to "fully above
   the column".

   Tweak overall pacing here:
     - TEXT_MS:  total ms for the left text column (ease-out so the
                 birthday-message tail lingers)
     - PHOTOS_MS: total ms for the right photo column (linear, so each
                  photo gets equal time on screen)
-------------------------------------------------------------------- */
var CREDITS_TEXT_MS   = 145000;  // 145s — slow birthday-message tail (ease-out)
var CREDITS_PHOTOS_MS =  95000;  //  95s — both photo columns. Photos finish ~50s
                                 //         before text so the finale message
                                 //         lingers alone in the middle.

function restartCreditsScroll() {
  startOneCreditRoll('credits-roll-text',         CREDITS_TEXT_MS,
                     'cubic-bezier(0.22, 0.55, 0.32, 1)');
  startOneCreditRoll('credits-roll-photos-left',  CREDITS_PHOTOS_MS, 'linear');
  startOneCreditRoll('credits-roll-photos-right', CREDITS_PHOTOS_MS, 'linear');
}

function startOneCreditRoll(id, durationMs, easing) {
  var el = document.getElementById(id);
  if (!el) return;
  var parent = el.parentElement;
  if (!parent) return;

  // Cancel any in-flight animation so replay is clean.
  if (el._creditAnim) {
    try { el._creditAnim.cancel(); } catch (e) {}
    el._creditAnim = null;
  }

  // Wait for any <img>s inside this roll to finish loading — otherwise
  // scrollHeight is computed before the photos have intrinsic dimensions
  // and the animation would scroll past empty space.
  whenImagesReady(el, function () {
    var contentH = el.scrollHeight;
    var parentH  = parent.clientHeight;
    var startY   = parentH;          // bottom of viewport — content fully below

    // STOP-AT-END: don't let the last lines scroll off the top. Park the
    // content so the bottom of the roll sits at the bottom of the column —
    // i.e. the last few lines (= birthday-message finale on the text
    // column, or the last photo on a photo column) stay visible after the
    // scroll finishes. If the content is shorter than the viewport, just
    // anchor at top.
    var endY;
    if (contentH > parentH) {
      endY = -(contentH - parentH);  // bottom of content at bottom of column
    } else {
      endY = 0;
    }

    el._creditAnim = el.animate(
      [
        { transform: 'translateY(' + startY + 'px)', opacity: 0, offset: 0 },
        { transform: 'translateY(' + (startY - 60) + 'px)', opacity: 1, offset: 0.03 },
        { transform: 'translateY(' + endY + 'px)', opacity: 1, offset: 1 }
      ],
      { duration: durationMs, easing: easing, fill: 'forwards' }
    );
  });
}

function whenImagesReady(rootEl, cb) {
  var imgs = rootEl.querySelectorAll('img');
  var pending = 0;
  imgs.forEach(function (img) {
    if (!(img.complete && img.naturalWidth > 0)) {
      pending++;
      var done = function () {
        pending--;
        if (pending === 0) requestAnimationFrame(cb);
      };
      img.addEventListener('load',  done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });
  if (pending === 0) requestAnimationFrame(cb);
}

/* Cat-click reactions + replay-credits button. Wires once per session. */
var scene4WiredOnce = false;
function wireSceneFourInteractions() {
  if (scene4WiredOnce) return;
  scene4WiredOnce = true;

  var bubble = document.getElementById('scene4-react-bubble');
  var cats = scene4Screen.querySelectorAll('.scene4-cat');
  cats.forEach(function (cat) {
    cat.addEventListener('click', function (e) {
      // Wiggle the cat
      cat.classList.remove('reacting');
      void cat.offsetWidth;
      cat.classList.add('reacting');

      // Position bubble near the clicked cat
      if (bubble) {
        var rect = cat.getBoundingClientRect();
        var parentRect = scene4Screen.getBoundingClientRect();
        var bubbleLeft = rect.left - parentRect.left + rect.width / 2;
        var bubbleTop  = rect.top  - parentRect.top  - 50;
        // Keep bubble within screen
        bubbleLeft = Math.max(140, Math.min(parentRect.width - 140, bubbleLeft));
        bubble.style.left = bubbleLeft + 'px';
        bubble.style.top  = bubbleTop  + 'px';
        bubble.style.transform = 'translateX(-50%)';
        bubble.textContent = cat.dataset.react || "Mrow!";
        bubble.classList.remove('show');
        void bubble.offsetWidth;
        bubble.classList.add('show');
      }

      // Small confetti puff from the click position
      sceneFourBurstAt(e.clientX, e.clientY);
    });
  });

  var replayBtn = document.getElementById('scene4-replay');
  if (replayBtn) {
    replayBtn.addEventListener('click', restartCreditsScroll);
  }
}

// Triggered by cat-click reactions — small confetti burst at the click point.
function sceneFourBurstAt(clientX, clientY) {
  if (!confettiParticlesRef) return;
  var canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  var rect = canvas.getBoundingClientRect();
  var x = clientX - rect.left;
  var y = clientY - rect.top;
  var COLORS = ['#ff007f', '#00f0ff', '#ffd84d', '#ff7ac0', '#ffffff'];
  for (var i = 0; i < 28; i++) {
    confettiParticlesRef.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 2,
      size: Math.random() * 6 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.05 + 0.02
    });
  }
}

function startSceneFourConfetti() {
  // Make sure no previous run is still firing (e.g., second visit to Scene 4)
  stopSceneFourConfetti();

  var canvas = document.getElementById('confetti-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // Size to viewport
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();

  var particles = [];
  confettiParticlesRef = particles; // expose for cat-click bursts
  var COLORS = ['#ff007f', '#00f0ff', '#ffd84d', '#ff7ac0', '#9c80c4', '#ffffff'];

  function burst(count) {
    var w = canvas.width;
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 2.5 + 1.2,
        size: Math.random() * 7 + 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.05 + 0.02
      });
    }
  }

  burst(120);
  confettiBurstInterval = setInterval(function () { burst(60); }, 1400);

  function tick() {
    if (!scene4Screen.classList.contains('active')) {
      stopSceneFourConfetti();
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.vy += 0.05; // gravity
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.6;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      if (p.y > canvas.height + 30) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    confettiRafId = requestAnimationFrame(tick);
  }
  confettiRafId = requestAnimationFrame(tick);
}

function stopSceneFourConfetti() {
  if (confettiRafId) cancelAnimationFrame(confettiRafId);
  confettiRafId = null;
  if (confettiBurstInterval) clearInterval(confettiBurstInterval);
  confettiBurstInterval = null;
  confettiParticlesRef = null;
  var canvas = document.getElementById('confetti-canvas');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

scene4Back.addEventListener('click', function () {
  if (State.busy) return;
  State.busy = true;
  stopSceneFourConfetti();
  doWipe(function () {
    scene4Screen.classList.remove('active');
    hubMap.classList.add('active');
    requestAnimationFrame(function () { hubMap.classList.add('fade-in'); });
    positionPlaneAtHome();
    State.busy = false;
  });
});

/* ====================================================================
   DEBUG RESET
==================================================================== */
debugReset.addEventListener('click', function () {
  QUESTS.forEach(function (q) { State.completed[q] = false; });
  State.completed.england = false;
  State.unlocked.england = false;
  updateProgressTracker();
  updateNodeStates();
});

/* ====================================================================
   UTIL — shared by games.js
==================================================================== */
function shuffleInPlace(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

/* ====================================================================
   PIXELATED WORLD MAP (literal SVG <rect> grid, RLE per row so the
   outer outline stays jagged without internal gridlines)
==================================================================== */
// 50 cols × 25 rows. '#' = land, '.' = water. Each cell = 20×20 in
// viewBox units. Hand-drawn to be RECOGNIZABLE: NA top-left tapering
// to Mexico/CA, SA hanging below, Greenland small + top, Eurasia as
// one big landmass connecting to Africa via the Middle East (real
// world geography), India peninsula, Japan island, Australia bottom-
// right. Node positions are guaranteed to land on '#' cells.
var WORLD_BITMAP = [
  /* 0  */ "..................................................",
  /* 1  */ ".......................###........................",
  /* 2  */ ".....######............#####......................",
  /* 3  */ "...########..........#####...################.....",
  /* 4  */ "..##########........#####..######################.",
  /* 5  */ "############.......#####..#######################.",
  /* 6  */ "############......######..########################",
  /* 7  */ "############.......######.########################",
  /* 8  */ "############.........######.######################",
  /* 9  */ ".##########.........########.####################.",
  /* 10 */ "..#########.........#########..###############.##.",
  /* 11 */ "...########..........########....############.##..",
  /* 12 */ "....######...........########.....##########......",
  /* 13 */ ".....#####...........########......########.......",
  /* 14 */ "......######..........#######........######.......",
  /* 15 */ ".......######.........######..........####........",
  /* 16 */ ".......######.........######........######........",
  /* 17 */ ".......######.........#####........#########......",
  /* 18 */ ".......######.........####........###########.....",
  /* 19 */ ".........####.........####.........##########.....",
  /* 20 */ "..........###..........###..........#######.......",
  /* 21 */ "..........##............##.............##........",
  /* 22 */ "...........#.............#........................",
  /* 23 */ "..................................................",
  /* 24 */ ".................................................."
];

function buildPixelWorldMap() {
  var svg = document.querySelector('.world-map');
  if (!svg) return;
  var continents = svg.querySelector('.continents');
  if (!continents) return;
  var cellSize = 20;
  var html = '';
  // One <rect> per land cell so each cell shows as a distinct chunky
  // square (CSS adds stroke + fill). This is the "grid of pixels" look.
  for (var row = 0; row < WORLD_BITMAP.length; row++) {
    var line = WORLD_BITMAP[row];
    for (var col = 0; col < line.length; col++) {
      if (line.charAt(col) === '#') {
        html +=
          '<rect x="' + (col * cellSize) +
          '" y="' + (row * cellSize) +
          '" width="' + cellSize +
          '" height="' + cellSize + '"/>';
      }
    }
  }
  continents.innerHTML = html;
}

/* --------------------------------------------------------------------
   Dynamic map aspect-ratio: once the real map_art image reports its
   natural dimensions, set .map-area's aspect-ratio so it matches the
   art exactly. Without this the image is stretched/letterboxed and
   node % positions don't line up with the painted continents.
-------------------------------------------------------------------- */
function setMapAspectFromArt() {
  var img = document.getElementById('map-art');
  var mapArea = document.querySelector('.map-area');
  if (!img || !mapArea) return;
  function apply() {
    if (!img.naturalWidth || !img.naturalHeight) return;
    var ratio = img.naturalWidth / img.naturalHeight;
    // Apply the exact image aspect-ratio. With no CSS max-height fighting
    // it, the container is now guaranteed to match the art.
    mapArea.style.aspectRatio = ratio.toString();
    // Cap width so the derived height (= width / ratio) stays under ~82vh
    // on any viewport, while still maxing out at 90vw on widescreens.
    // Math: height = width / ratio ≤ 82vh → width ≤ ratio * 82vh.
    var maxWidthVh = (ratio * 82).toFixed(2);
    mapArea.style.width = 'min(90vw, ' + maxWidthVh + 'vh)';
  }
  if (img.complete && img.naturalWidth) apply();
  else img.addEventListener('load', apply);
}

/* ====================================================================
   INITIAL RENDER
==================================================================== */
setMapAspectFromArt();
buildPixelWorldMap();
updateProgressTracker();
updateNodeStates();

/* ════════════════════════════════════════════════════════════════════
   🛠 DEV SCENE JUMPER — skip directly to a scene/game via URL params
   ════════════════════════════════════════════════════════════════════
   Append one of these to the URL when opening the page:

       ?scene=credits     → jump straight to the end credits scene
       ?scene=hub         → skip the title, go to the hub (no briefing)
       ?game=morocco      → start Morocco (1st game)
       ?game=ghana        → start Ghana, with Morocco pre-completed
       ?game=korea        → start Korea, with Morocco+Ghana pre-completed
       ?game=nyc          → start NYC,   with prereqs pre-completed
       ?game=greece       → start Greece (last side game), all prereqs done
       ?game=england      → start the England boss, all 5 sides pre-completed

   Examples (local file):
       file:///.../index.html?scene=credits
       file:///.../index.html?game=korea

   Examples (live server):
       http://localhost:8000/?scene=credits
       http://localhost:8000/?game=england

   Plain http://localhost:8000/  (no params) = normal play from title.
═══════════════════════════════════════════════════════════════════ */
function applyDevSceneFromUrl() {
  var params = new URLSearchParams(window.location.search);
  var scene  = params.get('scene');
  var game   = params.get('game');
  if (!scene && !game) return;

  // Hide title screen no matter what dev-shortcut we took.
  titleScreen.style.display = 'none';

  function completeAll() {
    QUESTS.forEach(function (q) {
      State.unlocked[q]  = true;
      State.completed[q] = true;
    });
    State.unlocked.england  = true;
    State.completed.england = true;
  }

  function completeBefore(target) {
    var idx = QUESTS.indexOf(target);
    if (idx < 0) return;
    for (var i = 0; i < idx; i++) {
      State.unlocked[QUESTS[i]]  = true;
      State.completed[QUESTS[i]] = true;
    }
    State.unlocked[target] = true;
  }

  // --- ?scene=credits → jump straight to the climax/credits
  if (scene === 'credits') {
    completeAll();
    updateProgressTracker();
    updateNodeStates();
    // Also drop all polaroids on the (hidden) corkboard so if user
    // hits "back to map" from credits, the board reflects the run.
    ['morocco','ghana','korea','nyc','greece','england'].forEach(addPolaroidPin);
    showScene4();
    return;
  }

  // --- ?scene=hub → skip title + opening briefing, land on hub
  if (scene === 'hub') {
    enterHubMap(false);
    return;
  }

  // --- ?game=ID → jump into a specific minigame
  if (game) {
    if (game === 'england') {
      completeAll();
      State.completed.england = false;     // we still want to PLAY england
    } else {
      completeBefore(game);
    }
    updateProgressTracker();
    updateNodeStates();
    // Reflect pinned wins on the corkboard for already-cleared games.
    QUESTS.forEach(function (q) {
      if (State.completed[q]) addPolaroidPin(q);
    });
    // Hub stays active in the background so the back-to-map flow works.
    hubMap.classList.add('active');
    hubMap.classList.add('fade-in');
    digicam.classList.add('active');
    positionPlaneAtHome();
    showMinigame(game);
  }
}
applyDevSceneFromUrl();
