/* ====================================================================
   GAMES.JS — All five mini-game logic + per-game INSTRUCTIONS.

   Phase 6 changes:
   - Real cat sprites (cat_peek for whack pop-up).
   - Real item images for Ghana catch (3 correct + 2 decoys).
   - Real drink images for Korea cards + card_back.png back face.
   - Morocco FULLY REBUILT as Tetris-style:
       * tiers fall straight down (no drift)
       * mouse-X steers the tier continuously
       * click / Space / Arrow-Down = soft-drop
       * overlap >= 40% lands, overlap >= 85% snap-aligns
       * topple at overlap < 40% (run ends)
       * win threshold = 6 tiers; cap = 15 tiers (auto-win)
==================================================================== */

/* ====================================================================
   INSTRUCTIONS — engine.js → showInstructionScreen() reads these.
   PACK::... / SKIP::... prefixes get neon-blue / neon-pink styling.
==================================================================== */
INSTRUCTIONS.greece = {
  title: 'WHACK-A-CAT',
  bullets: [
    'Jinx hides in 12 holes — he keeps switching spots!',
    'TWO ROUNDS. Hit 6 cats per round. 30 seconds total.',
    'Round 2 is faster — and bombs occasionally drop in.',
    'SKIP::CLICK A BOMB = Round 2 resets! Aim ONLY for cats.'
  ]
};
INSTRUCTIONS.ghana = {
  title: 'SUITCASE SCRAMBLE',
  bullets: [
    'Items fall from the sky. Move the suitcase to catch them.',
    'PACK::PACK these: [HAIR DYE] [PARTY DRESS] [SUNGLASSES]',
    'SKIP::AVOID these: [WINTER COAT] [TEXTBOOK]',
    'Catch 5 to win — but the pool only has 3 essentials!',
    'PACK::BONUS: golden item = worth +2 · cat sprite = +1 catch',
    'SKIP::DANGER: red bomb = INSTANT loss. 2 wrong catches = out.'
  ]
};
INSTRUCTIONS.morocco = {
  title: 'CAKE STACKER',
  bullets: [
    'Tiers fall straight down. Move your MOUSE left/right to steer.',
    'CLICK (or SPACE / DOWN arrow) to drop faster.',
    'WATCH OUT: the cake base now drifts left and right.',
    'Stack at least 6 tiers without toppling to win.',
    'Keep going past 6 for a higher score — but if it falls, the run is over.'
  ]
};
INSTRUCTIONS.korea = {
  title: 'MEMORY MATCH',
  bullets: [
    'All 20 cards reveal for 2.5s — memorize as much as you can!',
    'Then they flip down and shuffle. Match all 10 pairs.',
    'PACK::You have 70 seconds.',
    'SKIP::3-match streak makes Rory pounce and reshuffle the rest!'
  ]
};
INSTRUCTIONS.nyc = {
  title: 'TAXI DASH',
  bullets: [
    'LEFT / RIGHT (or A / D) to switch lanes in the taxi.',
    'Dodge cars, cones, and pigeons. Grab pretzels and hot dogs!',
    'TWO ROUNDS. Collect 5 in R1 → Collect 8 in R2 (faster!).',
    'SKIP::3 hits = lost run. 55 seconds total on the clock.'
  ]
};
INSTRUCTIONS.england = {
  title: 'THE SORTING GATE',
  bullets: [
    'Ambrose guards the gate. The Sorting Hat fires 5 questions at you.',
    'Each question is themed after a Hogwarts house — pick the answer that fits.',
    'PACK::Wrong answer? No penalty — the Hat just makes you try again.'
  ]
};

/* ====================================================================
   📍 GREECE — Whack-a-Cat (12 holes, real cat_peek sprite)
==================================================================== */
Games.greece = function (stage) {
  var HITS_PER_ROUND      = 6;
  var TIME_LIMIT          = 30;       // global timer covering both rounds
  var NUM_SPOTS           = 12;
  var ROUND2_CADENCE_MULT = 0.82;     // R2 spawns ~18% faster
  var BOMB_CHANCE_R2      = 0.22;     // 22% per spawn cycle in Round 2

  var spotsHtml = '';
  for (var i = 0; i < NUM_SPOTS; i++) {
    spotsHtml += '<div class="whack-spot" data-spot="' + i + '"></div>';
  }

  stage.innerHTML =
    '<div class="game-hud">' +
      '<div class="score-chip"><span class="hud-label">ROUND</span>' +
        '<span class="hud-value" id="greece-round">1</span>/2</div>' +
      '<div class="score-chip"><span class="hud-label">HITS</span>' +
        '<span class="hud-value" id="greece-hits">0</span>/' + HITS_PER_ROUND + '</div>' +
      '<div class="score-chip"><span class="hud-label">TIME</span>' +
        '<span class="hud-value" id="greece-timer">' + TIME_LIMIT + '</span>s</div>' +
    '</div>' +
    '<div class="game-body">' +
      '<div class="whack-arena">' + spotsHtml + '</div>' +
    '</div>';

  var timerEl = stage.querySelector('#greece-timer');
  var hitsEl  = stage.querySelector('#greece-hits');
  var roundEl = stage.querySelector('#greece-round');
  var spots   = stage.querySelectorAll('.whack-spot');

  var round = 1;
  var hits = 0; // hits in the CURRENT round only (resets between rounds and on bomb)
  var timeLeft = TIME_LIMIT;
  var lastSpots = [];
  var alive = true;
  var moveTimeout = null;
  var tickInterval = null;
  var banterInterval = null;

  var TAUNTS = [
    "Too slow, Ella!",
    "Cat got your reflexes?",
    "These holes are deeper than they look.",
    "Spin back, you'll catch the next one.",
    "Tick tock, kid."
  ];
  var BANTER_PORTRAIT = 'dj_cat_portrait';
  function scheduleBanter() {
    var delay = 5000 + Math.random() * 3500;
    banterInterval = setTimeout(function () {
      if (!alive) return;
      showBossBanter(TAUNTS[Math.floor(Math.random() * TAUNTS.length)], BANTER_PORTRAIT);
      scheduleBanter();
    }, delay);
  }

  function spotSwapMs() {
    // Per-round hits drive the cadence ramp within that round.
    var base;
    if (hits >= 5)      base = 700;
    else if (hits >= 3) base = 850;
    else if (hits >= 1) base = 1000;
    else                base = 1200;
    return round === 2 ? Math.round(base * ROUND2_CADENCE_MULT) : base;
  }
  function numCatsToSpawn() {
    if (hits >= 4 && Math.random() < 0.40) return 2;
    if (hits >= 2 && Math.random() < 0.20) return 2;
    return 1;
  }

  function placeCats() {
    if (!alive) return;
    // Clear ALL previous cats and bombs
    spots.forEach(function (s) {
      var c = s.querySelector('.whack-cat, .whack-bomb');
      if (c) c.remove();
    });
    var indices = [];
    for (var i = 0; i < spots.length; i++) indices.push(i);
    shuffleInPlace(indices);

    // R2: chance to also drop a bomb in a spot ALONGSIDE the cats.
    var spawnBomb = (round === 2 && Math.random() < BOMB_CHANCE_R2);
    if (spawnBomb) {
      var bombIdx = indices.pop(); // take one spot for the bomb
      spawnBombAt(spots[bombIdx]);
    }

    var wanted = numCatsToSpawn();
    var chosen = [];
    for (var j = 0; j < indices.length && chosen.length < wanted; j++) {
      if (lastSpots.indexOf(indices[j]) === -1) chosen.push(indices[j]);
    }
    while (chosen.length < wanted) chosen.push(indices[chosen.length]);
    lastSpots = chosen.slice();

    chosen.forEach(function (idx) {
      var cat = document.createElement('div');
      cat.className = 'whack-cat';
      cat.innerHTML = imgTag('cat_peek');
      cat.addEventListener('click', function (e) {
        e.stopPropagation();
        onCatHit(cat);
      });
      spots[idx].appendChild(cat);
    });
  }

  function spawnBombAt(spot) {
    var bomb = document.createElement('div');
    bomb.className = 'whack-bomb';
    bomb.innerHTML = imgTag('bomb_icon');
    bomb.addEventListener('click', function (e) {
      e.stopPropagation();
      onBombClick();
    });
    spot.appendChild(bomb);
  }

  function onBombClick() {
    if (!alive) return;
    // Instant Round-2 reset (Round 1 progress is preserved — we're still in R2)
    showRoundBanner('💥 BOMB! ROUND 2 RESET');
    shakeElement(minigameStage, 'hard');
    hits = 0;
    hitsEl.textContent = hits;
    if (moveTimeout) clearTimeout(moveTimeout);
    // Clear current cats so player gets a clean restart on this round
    spots.forEach(function (s) {
      var c = s.querySelector('.whack-cat, .whack-bomb');
      if (c) c.remove();
    });
    setTimeout(function () {
      if (!alive) return;
      placeCats();
      scheduleNextMove();
    }, 700);
  }

  function advanceToRound2() {
    round = 2;
    hits = 0;
    roundEl.textContent = round;
    hitsEl.textContent = hits;
    showRoundBanner('ROUND 2 — FASTER. WATCH FOR BOMBS!');
    if (moveTimeout) clearTimeout(moveTimeout);
    setTimeout(function () {
      if (!alive) return;
      placeCats();
      scheduleNextMove();
    }, 1100);
  }

  function onCatHit(cat) {
    if (!alive) return;
    if (cat.dataset.hit === 'true') return;
    cat.dataset.hit = 'true';
    cat.remove();
    hits++;
    hitsEl.textContent = hits;
    pulseHud(hitsEl);
    shakeElement(minigameStage, 'light');

    if (hits >= HITS_PER_ROUND) {
      if (round === 1) {
        advanceToRound2();
      } else {
        // Round 2 complete = win
        alive = false;
        if (moveTimeout) clearTimeout(moveTimeout);
        if (tickInterval) clearInterval(tickInterval);
        if (banterInterval) clearTimeout(banterInterval);
        winLocation('greece');
      }
    }
  }

  function flashMiss(spot) {
    var x = document.createElement('div');
    x.className = 'whack-miss';
    x.textContent = '✗';
    spot.appendChild(x);
    setTimeout(function () { if (x.parentNode) x.remove(); }, 320);
  }
  spots.forEach(function (spot) {
    spot.addEventListener('click', function () {
      if (!alive) return;
      if (spot.querySelector('.whack-cat')) return;
      flashMiss(spot);
    });
  });

  function scheduleNextMove() {
    if (!alive) return;
    moveTimeout = setTimeout(function () {
      placeCats();
      scheduleNextMove();
    }, spotSwapMs());
  }

  placeCats();
  scheduleNextMove();
  scheduleBanter();

  tickInterval = setInterval(function () {
    if (!alive) return;
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 5 && timeLeft > 0) {
      timerEl.classList.add('warn');
      pulseHud(timerEl);
    }
    if (timeLeft <= 0) {
      alive = false;
      if (moveTimeout) clearTimeout(moveTimeout);
      if (banterInterval) clearTimeout(banterInterval);
      clearInterval(tickInterval);
      // Player wins ONLY if they finished Round 2.
      if (round === 2 && hits >= HITS_PER_ROUND) {
        winLocation('greece');
      } else {
        var stage = (round === 1)
          ? 'Round 1 timed out at ' + hits + '/' + HITS_PER_ROUND
          : 'Round 2 timed out at ' + hits + '/' + HITS_PER_ROUND;
        loseLocation('greece', stage + '. Jinx keeps the playlist for now. Try again, Ella.');
      }
    }
  }, 1000);

  return function cleanup() {
    alive = false;
    if (moveTimeout) clearTimeout(moveTimeout);
    if (banterInterval) clearTimeout(banterInterval);
    if (tickInterval) clearInterval(tickInterval);
  };
};

/* ====================================================================
   📍 GHANA — Suitcase Catch (real items + suitcase_open.png)
   3 correct + 2 decoys. Catch all 3 correct; 2 strikes = lose.
==================================================================== */
Games.ghana = function (stage) {
  var CATCH_TO_WIN      = 5;  // base pool has 3 correct; the extra 2 must come from goldens (+2) or bonus cats (+1)
  var MAX_STRIKES       = 2;
  var MAX_TOTAL_SPAWNS  = 20; // bumped from 14 so the bonus pool has room to produce 2+ catchable specials
  var SPAWN_MS          = 1300;
  var FALL_SPEED        = 3.0;
  var ITEM_SIZE         = 92;
  var CATCHER_W         = 170;
  var CATCHER_H         = 116;
  var FIRST_SPAWN_DELAY = 700;

  // Spawn rates per slot. Bumped to ensure CATCH_TO_WIN = 5 is reachable:
  // expected catchable specials over 20 slots = 20 × (0.24 + 0.14) ≈ 7.6,
  // which plus 3 deterministic correct items in the pool gives plenty of
  // win paths even if the player misses some catches.
  var BOMB_CHANCE     = 0.10;
  var GOLDEN_CHANCE   = 0.24;  // +2 catches
  var BONUS_CAT_CHANCE = 0.14; // +1 catch

  var basePool = shuffleInPlace([
    { img: 'item_hairdye',    label: 'HAIR DYE',    decoy: false },
    { img: 'item_partydress', label: 'PARTY DRESS', decoy: false },
    { img: 'item_sunglasses', label: 'SUNGLASSES',  decoy: false },
    { img: 'item_wintercoat', label: 'WINTER COAT', decoy: true  },
    { img: 'item_textbook',   label: 'TEXTBOOK',    decoy: true  }
  ]);
  var basePoolIdx = 0;

  var TAUNTS = [
    "Wrong piece, sweetie.",
    "Not in the catalog, dear.",
    "Pickier than I thought, Ella.",
    "Drop the textbook, darling.",
    "Watch the sky — anything could fall."
  ];
  var BANTER_PORTRAIT = 'stylist_cat_portrait';
  var banterInterval = null;
  function scheduleBanter() {
    var delay = 5500 + Math.random() * 3500;
    banterInterval = setTimeout(function () {
      if (!alive) return;
      showBossBanter(TAUNTS[Math.floor(Math.random() * TAUNTS.length)], BANTER_PORTRAIT);
      scheduleBanter();
    }, delay);
  }

  stage.innerHTML =
    '<div class="game-hud">' +
      '<div class="score-chip"><span class="hud-label">CAUGHT</span>' +
        '<span class="hud-value" id="ghana-caught">0</span>/' + CATCH_TO_WIN + '</div>' +
      '<div class="score-chip"><span class="hud-label">STRIKES</span>' +
        '<span class="hud-value" id="ghana-strikes">0</span>/' + MAX_STRIKES + '</div>' +
      '<div class="score-chip score-chip--info"><span class="hud-label">WATCH</span>' +
        '<span class="hud-value">BOMB = LOSE</span></div>' +
    '</div>' +
    '<div class="game-body">' +
      '<div class="ghana-arena" id="ghana-arena">' +
        '<div class="ghana-catcher" id="ghana-catcher">' +
          imgTag('suitcase_open') +
        '</div>' +
      '</div>' +
    '</div>';

  var arena    = stage.querySelector('#ghana-arena');
  var catcher  = stage.querySelector('#ghana-catcher');
  var caughtEl = stage.querySelector('#ghana-caught');
  var strikesEl= stage.querySelector('#ghana-strikes');

  var arenaW = 0, arenaH = 0;
  var catcherX = 0;
  var caught = 0;
  var strikes = 0;
  var alive = true;
  var activeItems = [];
  var spawnTimeout = null;
  var rafId = null;
  var totalSpawned = 0;

  function measure() {
    arenaW = arena.clientWidth  || 600;
    arenaH = arena.clientHeight || 380;
    catcherX = arenaW / 2 - CATCHER_W / 2;
    updateCatcher();
  }
  function updateCatcher() { catcher.style.left = catcherX + 'px'; }

  function onMouseMove(e) {
    var rect = arena.getBoundingClientRect();
    var x = e.clientX - rect.left - CATCHER_W / 2;
    if (x < 0) x = 0;
    if (x > arenaW - CATCHER_W) x = arenaW - CATCHER_W;
    catcherX = x;
    updateCatcher();
  }
  arena.addEventListener('mousemove', onMouseMove);

  // Keep arenaW/arenaH fresh on resize so catch detection stays accurate.
  function onGhanaResize() {
    if (!alive) return;
    arenaW = arena.clientWidth  || arenaW;
    arenaH = arena.clientHeight || arenaH;
    if (catcherX > arenaW - CATCHER_W) catcherX = arenaW - CATCHER_W;
    if (catcherX < 0) catcherX = 0;
    updateCatcher();
  }
  window.addEventListener('resize', onGhanaResize);

  function spawnItem() {
    if (!alive) return;

    // Hard safety cap so the game can't run indefinitely if the player
    // dodges everything.
    if (totalSpawned >= MAX_TOTAL_SPAWNS) {
      // No more spawns — let active items fall, then checkEnd will lose if needed
      return;
    }

    // Roll: bomb / golden / cat (specials) OR base pool item. After the
    // base pool empties, non-special rolls become "no-ops" (just skip and
    // schedule next slot) — keeps specials rotating in until something
    // resolves the game. This prevents the "no more items" deadlock.
    var roll = Math.random();
    var item = null;
    if (roll < BOMB_CHANCE) {
      item = { kind: 'bomb' };
    } else if (roll < BOMB_CHANCE + GOLDEN_CHANCE) {
      item = { kind: 'golden' };
    } else if (roll < BOMB_CHANCE + GOLDEN_CHANCE + BONUS_CAT_CHANCE) {
      item = { kind: 'cat' };
    } else if (basePoolIdx < basePool.length) {
      item = basePool[basePoolIdx++];
      item.kind = item.decoy ? 'decoy' : 'correct';
    }
    // else: base pool empty + non-special roll → skip this slot, but
    //   still schedule the next one so specials keep coming.
    if (!item) {
      spawnTimeout = setTimeout(spawnItem, SPAWN_MS);
      return;
    }
    totalSpawned++;

    var el = document.createElement('div');
    el.className = 'falling-item' +
      (item.kind === 'bomb'   ? ' falling-bomb'   :
       item.kind === 'golden' ? ' falling-golden' :
       item.kind === 'cat'    ? ' falling-cat'    : '');
    if (item.kind === 'bomb') {
      // Real bomb art (bomb_icon.png)
      el.innerHTML = imgTag('bomb_icon');
    } else if (item.kind === 'golden') {
      el.innerHTML = imgTag('golden_item');
    } else if (item.kind === 'cat') {
      // Reuse the existing cat_peek sprite as a "bonus cat" drop
      el.innerHTML = imgTag('cat_peek');
    } else {
      el.innerHTML = imgTag(item.img);
    }
    var x = Math.random() * Math.max(0, (arenaW - ITEM_SIZE));
    el.style.left = x + 'px';
    el.style.top  = (-ITEM_SIZE) + 'px';
    arena.appendChild(el);
    activeItems.push({
      el: el, x: x, y: -ITEM_SIZE,
      kind: item.kind,
      decoy: item.kind === 'decoy',
      isBomb: item.kind === 'bomb',
      isGolden: item.kind === 'golden',
      isCat: item.kind === 'cat'
    });

    // Always schedule the next slot — specials keep rolling even after
    // the base pool empties (up to MAX_TOTAL_SPAWNS).
    spawnTimeout = setTimeout(spawnItem, SPAWN_MS + Math.random() * 200);
  }

  function flashCatcher(cls) {
    catcher.classList.remove('flash-good', 'flash-bad');
    void catcher.offsetWidth;
    catcher.classList.add(cls);
    setTimeout(function () { catcher.classList.remove(cls); }, 280);
  }

  function tick() {
    if (!alive) return;
    var catcherTop = arenaH - CATCHER_H + 10; // catch zone near top of catcher
    for (var i = activeItems.length - 1; i >= 0; i--) {
      var it = activeItems[i];
      it.y += FALL_SPEED;
      it.el.style.top = it.y + 'px';

      var itemCenterY = it.y + ITEM_SIZE / 2;
      if (itemCenterY >= catcherTop && it.y < catcherTop + 20) {
        var iLeft = it.x;
        var iRight = it.x + ITEM_SIZE;
        var cLeft = catcherX + 10;
        var cRight = catcherX + CATCHER_W - 10;
        if (iRight > cLeft && iLeft < cRight) {
          if (it.isBomb) {
            // Bomb caught = instant lose
            shakeElement(minigameStage, 'hard');
            flashCatcher('flash-bad');
            it.el.classList.add('caught-bad');
            activeItems.splice(i, 1);
            setTimeout((function (el) { return function () { if (el.parentNode) el.remove(); }; })(it.el), 300);
            alive = false;
            cleanup();
            loseLocation('ghana',
              'BOOM. Bomb in the suitcase, Ella. Coco picked your pocket. Try again.');
            return;
          } else if (it.isGolden) {
            // Golden caught = +2 catches
            caught += 2;
            if (caught > CATCH_TO_WIN) caught = CATCH_TO_WIN;
            caughtEl.textContent = caught;
            pulseHud(caughtEl);
            shakeElement(minigameStage, 'light');
            flashCatcher('flash-good');
            it.el.classList.add('caught-good');
          } else if (it.isCat) {
            // Bonus cat caught = +1 catch (pure positive variety)
            caught++;
            if (caught > CATCH_TO_WIN) caught = CATCH_TO_WIN;
            caughtEl.textContent = caught;
            pulseHud(caughtEl);
            shakeElement(minigameStage, 'light');
            flashCatcher('flash-good');
            it.el.classList.add('caught-good');
          } else if (it.decoy) {
            strikes++;
            strikesEl.textContent = strikes;
            pulseHud(strikesEl);
            shakeElement(minigameStage, 'hard');
            flashCatcher('flash-bad');
            it.el.classList.add('caught-bad');
          } else {
            caught++;
            caughtEl.textContent = caught;
            pulseHud(caughtEl);
            shakeElement(minigameStage, 'light');
            flashCatcher('flash-good');
            it.el.classList.add('caught-good');
          }
          activeItems.splice(i, 1);
          setTimeout((function (el) { return function () { if (el.parentNode) el.remove(); }; })(it.el), 300);
          if (checkEnd()) return;
          continue;
        }
      }

      if (it.y > arenaH + 8) {
        it.el.remove();
        activeItems.splice(i, 1);
        if (checkEnd()) return;
        continue;
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function checkEnd() {
    if (caught >= CATCH_TO_WIN) {
      alive = false;
      cleanup();
      winLocation('ghana');
      return true;
    }
    if (strikes >= MAX_STRIKES) {
      alive = false;
      cleanup();
      loseLocation('ghana',
        'Coco watches you fumble the wrong items. Try again.');
      return true;
    }
    // End-of-spawns check: only lose when the spawn cap is reached AND
    // every remaining item has fallen through.
    if (totalSpawned >= MAX_TOTAL_SPAWNS && activeItems.length === 0 && caught < CATCH_TO_WIN) {
      alive = false;
      cleanup();
      loseLocation('ghana',
        'Only caught ' + caught + ' of ' + CATCH_TO_WIN + ' essentials. Try again, Ella.');
      return true;
    }
    return false;
  }

  function cleanup() {
    alive = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (spawnTimeout) clearTimeout(spawnTimeout);
    if (banterInterval) clearTimeout(banterInterval);
    arena.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', onGhanaResize);
    activeItems.forEach(function (it) { if (it.el.parentNode) it.el.remove(); });
    activeItems = [];
  }

  requestAnimationFrame(function () {
    measure();
    spawnTimeout = setTimeout(spawnItem, FIRST_SPAWN_DELAY);
    rafId = requestAnimationFrame(tick);
    scheduleBanter();
  });

  return cleanup;
};

/* ====================================================================
   📍 MOROCCO — Cake Stacker (Tetris-style — FULL REBUILD)
   - Tiers fall STRAIGHT DOWN at a slow constant speed.
   - Mouse-X position drives the tier's horizontal location continuously.
   - Click / SPACE / ArrowDown = soft-drop (faster fall, one tier at a time).
   - ArrowLeft / ArrowRight = fine keyboard adjustment.
   - On landing, compute overlap with the tier below:
        overlap < 40% of TIER_W  → TOPPLE (run ends).
        40% – 85% overlap        → lock at player's x (visibly off-center).
        >= 85% overlap           → snap-align to the tier below (forgiving assist).
   - Tier images cycle cake_tier_1.png → 2.png → 3.png → 1.png ...
   - 6 stacked tiers = location WON (player can keep going up to 15 for high score).
   - 15 stacked tiers = auto-win.
   - Topple before 6 = LOSE. Topple at 6+ = still a WIN (with the higher tier count).
==================================================================== */
Games.morocco = function (stage) {
  var TIERS_TO_WIN     = 6;
  var TIERS_AUTO_WIN   = 9;      // sanity cap — anything higher overflows the arena
  var TIER_W           = 110;
  var TIER_H           = 42;
  var BASE_H           = 50;     // visual height of cake_base.png
  var FALL_SPEED       = 1.6;    // px/frame normal
  var SOFT_SPEED       = 7.5;    // px/frame soft-drop
  var OVERLAP_MIN_FRAC = 0.40;   // less than this = topple
  var SNAP_FRAC        = 0.85;   // more than this = snap-align to prev
  var KEY_STEP         = 18;

  stage.innerHTML =
    '<div class="game-hud">' +
      '<div class="score-chip"><span class="hud-label">STACK</span>' +
        '<span class="hud-value" id="morocco-tiers">0</span>/' + TIERS_TO_WIN + '</div>' +
      '<div class="score-chip"><span class="hud-label">CAP</span>' +
        '<span class="hud-value" id="morocco-cap">' + TIERS_AUTO_WIN + '</span></div>' +
    '</div>' +
    '<div class="game-body morocco-body">' +
      '<div class="cake-arena" id="cake-arena">' +
        '<div class="cake-arena-hint">MOUSE = STEER &nbsp;·&nbsp; CLICK / SPACE = DROP FASTER &nbsp;·&nbsp; THE BASE DRIFTS</div>' +
        // Base + stacked tiers live inside a single wrapper that drifts
        // left/right — so the landing target is a moving target.
        '<div class="cake-stack-wrap" id="cake-stack-wrap">' +
          '<img class="cake-base" src="images/cake_base.png" alt="" />' +
          '<div class="cake-stack-area" id="cake-stack-area"></div>' +
        '</div>' +
        '<img class="cake-slider" id="cake-slider" src="images/cake_tier_1.png" alt="" />' +
        '<div class="morocco-safe-badge" id="morocco-safe-badge">SAFE ✓</div>' +
        '<div class="cake-controls-hint">← →  keyboard fine-tune</div>' +
      '</div>' +
    '</div>';

  var arena      = stage.querySelector('#cake-arena');
  var slider     = stage.querySelector('#cake-slider');
  var stackWrap  = stage.querySelector('#cake-stack-wrap');
  var stackArea  = stage.querySelector('#cake-stack-area');
  var tiersEl    = stage.querySelector('#morocco-tiers');
  var safeBadge  = stage.querySelector('#morocco-safe-badge');
  var hint       = stage.querySelector('.cake-arena-hint');

  var arenaW = 0, arenaH = 0;
  var tierX = 0, tierY = 0;
  var tierType = 1;
  var softDrop = false;
  var stacked = [];           // [{centerX, type}]
  var alive = true;
  var rafId = null;
  var toppling = false;
  var ended = false;
  var greatStreak = 0;        // consecutive >=85% landings
  var banterInterval = null;
  // Moving-base drift: sine-wave horizontal drift of the whole stack.
  var stackOffset = 0;
  var stackTime   = 0;
  var stackStartTs = null;
  var BASE_DRIFT_AMP = 110;   // px each direction (set in measure())
  var BASE_DRIFT_HZ  = 0.10;  // cycles per second
  var lastTickTs = null;

  var TAUNTS = [
    "Wobbly, isn't it?",
    "Steady... steady...",
    "I've seen better hands, Ella.",
    "Don't breathe.",
    "One tier away from chaos."
  ];
  var BANTER_PORTRAIT = 'baker_cat_portrait';
  function scheduleBanter() {
    var delay = 5500 + Math.random() * 3500;
    banterInterval = setTimeout(function () {
      if (!alive) return;
      showBossBanter(TAUNTS[Math.floor(Math.random() * TAUNTS.length)], BANTER_PORTRAIT);
      scheduleBanter();
    }, delay);
  }

  function nextType() { return (stacked.length % 3) + 1; }

  function measure() {
    arenaW = arena.clientWidth  || 600;
    arenaH = arena.clientHeight || 440;
    BASE_DRIFT_AMP = Math.min(120, arenaW * 0.18);
    tierX = arenaW / 2;
    spawnTier();
    updateStackOffset(performance.now());
  }
  function updateStackOffset(ts) {
    if (stackStartTs === null) stackStartTs = ts;
    var t = (ts - stackStartTs) / 1000;
    stackOffset = Math.sin(t * Math.PI * 2 * BASE_DRIFT_HZ) * BASE_DRIFT_AMP;
    if (stackWrap) stackWrap.style.transform = 'translateX(' + stackOffset + 'px)';
  }

  function spawnTier() {
    tierType = nextType();
    slider.src = 'images/cake_tier_' + tierType + '.png';
    slider.dataset.type = String(tierType);
    tierY = 0;
    softDrop = false;
    slider.classList.remove('toppling');
    slider.style.filter = '';
    positionSlider();
  }

  function clampX(x) {
    if (x < TIER_W / 2) return TIER_W / 2;
    if (x > arenaW - TIER_W / 2) return arenaW - TIER_W / 2;
    return x;
  }
  function positionSlider() {
    tierX = clampX(tierX);
    slider.style.left = (tierX - TIER_W / 2) + 'px';
    slider.style.top  = tierY + 'px';
  }

  function landTopY() {
    // Y where the falling tier's TOP sits when it lands on top of the stack
    return arenaH - BASE_H - (stacked.length + 1) * TIER_H;
  }

  function tick(ts) {
    if (!alive) { return; }
    updateStackOffset(ts || performance.now());
    if (toppling) { rafId = requestAnimationFrame(tick); return; }
    var speed = softDrop ? SOFT_SPEED : FALL_SPEED;
    tierY += speed;
    var top = landTopY();
    if (tierY >= top) {
      tierY = top;
      positionSlider();
      landTier();
      return;
    }
    positionSlider();
    rafId = requestAnimationFrame(tick);
  }

  function landTier() {
    // Base + stacked tiers are inside a moving wrapper, so the landing
    // target's world position = stored localX + current stackOffset.
    var prevWorldCenter;
    if (stacked.length === 0) {
      prevWorldCenter = arenaW / 2 + stackOffset; // base center in world coords
    } else {
      prevWorldCenter = stacked[stacked.length - 1].centerX + stackOffset;
    }
    var overlap = TIER_W - Math.abs(tierX - prevWorldCenter);
    if (overlap < 0) overlap = 0;
    var frac = overlap / TIER_W;

    if (frac < OVERLAP_MIN_FRAC) {
      triggerTopple();
      return;
    }

    var finalWorldX = tierX;
    var isGreat = frac >= SNAP_FRAC;
    if (isGreat) finalWorldX = prevWorldCenter; // forgiving snap-align
    var localX = finalWorldX - stackOffset; // store in stack-local coords

    var stackedEl = document.createElement('img');
    stackedEl.className = 'cake-tier-stacked';
    stackedEl.src = 'images/cake_tier_' + tierType + '.png';
    stackedEl.style.left   = (localX - TIER_W / 2) + 'px';
    stackedEl.style.bottom = (BASE_H + stacked.length * TIER_H) + 'px';
    stackArea.appendChild(stackedEl);

    stacked.push({ centerX: localX, type: tierType });
    tiersEl.textContent = stacked.length;
    pulseHud(tiersEl);
    shakeElement(minigameStage, 'light');

    // Combo tracking: consecutive "great" landings (>=85% overlap)
    if (isGreat) {
      greatStreak++;
      if (greatStreak >= 2) {
        sparkleAt(finalWorldX, BASE_H + (stacked.length - 1) * TIER_H + TIER_H / 2);
        if (greatStreak >= 3) {
          showBossBanter('COMBO ×' + greatStreak + '!', BANTER_PORTRAIT);
        }
      }
    } else {
      greatStreak = 0;
    }

    // Wobble starts past tier 5 — cosmetic only, doesn't affect hit detection
    if (stacked.length >= 5) {
      var intensity = Math.min(1, (stacked.length - 4) / 5);
      stackArea.style.setProperty('--wobble-amp', (intensity * 1.5).toFixed(2) + 'deg');
      stackArea.classList.add('wobbling');
    }

    if (stacked.length === TIERS_TO_WIN) {
      safeBadge.classList.add('shown');
    }
    if (stacked.length >= TIERS_AUTO_WIN) {
      endRun('win');
      return;
    }

    spawnTier();
    rafId = requestAnimationFrame(tick);
  }

  function sparkleAt(cx, cy) {
    // cy is measured from BOTTOM of stack area (matching tier bottom: math).
    // Convert to TOP coords for absolute positioning on arena.
    var topY = arenaH - cy;
    for (var i = 0; i < 7; i++) {
      var s = document.createElement('div');
      s.className = 'morocco-sparkle';
      var angle = (Math.PI * 2 / 7) * i + Math.random() * 0.3;
      var dist = 32 + Math.random() * 18;
      s.style.left = (cx) + 'px';
      s.style.top  = (topY) + 'px';
      s.style.setProperty('--sx', (Math.cos(angle) * dist).toFixed(0) + 'px');
      s.style.setProperty('--sy', (Math.sin(angle) * dist - 6).toFixed(0) + 'px');
      arena.appendChild(s);
      (function (el) {
        setTimeout(function () { if (el.parentNode) el.remove(); }, 700);
      })(s);
    }
  }

  function triggerTopple() {
    toppling = true;
    slider.classList.add('toppling');
    shakeElement(minigameStage, 'hard');
    setTimeout(function () {
      if (stacked.length >= TIERS_TO_WIN) endRun('win');
      else                                endRun('lose');
    }, 900);
  }

  function endRun(result) {
    if (ended) return;
    ended = true;
    alive = false;
    if (rafId) cancelAnimationFrame(rafId);
    removeListeners();
    if (result === 'win') {
      // Brief cake_complete celebration before the standard win flow takes over.
      showCakeComplete();
      setTimeout(function () { winLocation('morocco'); }, 950);
    } else {
      loseLocation('morocco',
        'The cake toppled at ' + stacked.length + ' tier' + (stacked.length === 1 ? '' : 's') +
        '. Need ' + TIERS_TO_WIN + '+ to recover the cake. Try again.');
    }
  }

  function showCakeComplete() {
    // Hide the active slider so cake_complete reads as the finished cake
    slider.style.display = 'none';
    var cel = document.createElement('img');
    cel.src = 'images/cake_complete.png';
    cel.className = 'cake-complete-celebration';
    arena.appendChild(cel);
  }

  /* --- INPUT --- */
  function onMouseMove(e) {
    if (!alive || toppling) return;
    if (hint) hint.style.display = 'none';
    var rect = arena.getBoundingClientRect();
    tierX = e.clientX - rect.left;
    positionSlider();
  }
  function onArenaClick() {
    if (!alive || toppling) return;
    if (hint) hint.style.display = 'none';
    softDrop = true;
    slider.style.filter = 'drop-shadow(0 0 12px var(--neon-blue)) brightness(1.4)';
  }
  function onKey(e) {
    if (!alive || toppling) return;
    if (e.key === 'ArrowLeft') {
      tierX -= KEY_STEP;
      positionSlider();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      tierX += KEY_STEP;
      positionSlider();
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Spacebar') {
      if (hint) hint.style.display = 'none';
      softDrop = true;
      slider.style.filter = 'drop-shadow(0 0 12px var(--neon-blue)) brightness(1.4)';
      e.preventDefault();
    }
  }
  arena.addEventListener('mousemove', onMouseMove);
  arena.addEventListener('click', onArenaClick);
  document.addEventListener('keydown', onKey);

  // Re-measure on window resize so arenaW/arenaH don't go stale
  var onResize = function () {
    if (!alive) return;
    var prevW = arenaW;
    arenaW = arena.clientWidth || arenaW;
    arenaH = arena.clientHeight || arenaH;
    // Reproject tier x to keep proportional placement
    if (prevW > 0) tierX = (tierX / prevW) * arenaW;
    tierX = clampX(tierX);
    positionSlider();
  };
  window.addEventListener('resize', onResize);

  function removeListeners() {
    arena.removeEventListener('mousemove', onMouseMove);
    arena.removeEventListener('click', onArenaClick);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
  }

  /* --- START --- */
  // Wait one frame for layout, then measure + spawn + tick.
  requestAnimationFrame(function () {
    if (!alive) return;
    measure();
    rafId = requestAnimationFrame(tick);
    scheduleBanter();
  });

  return function cleanup() {
    alive = false;
    ended = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (banterInterval) clearTimeout(banterInterval);
    removeListeners();
  };
};

/* ====================================================================
   📍 KOREA — Memory Match (real drink images, card_back.png)
==================================================================== */
Games.korea = function (stage) {
  var PAIRS_TO_WIN   = 10;       // 5x4 grid = 20 cards = 10 pairs
  var TIME_LIMIT     = 70;       // bumped from 50s to fit the bigger grid
  var STREAK_TRIGGER = 3;

  // All 10 drinks now have real art.
  var DRINKS = [
    'soju','bubbletea','makgeolli','icedcoffee','cocktail',
    'juice','champagne','mocktail','teabottle','sodapop'
  ];
  var deck = shuffleInPlace(DRINKS.concat(DRINKS)); // 20 cards = 10 pairs

  function cardFrontHtml(name) {
    return imgTag('drink_' + name);
  }

  var cardHtml = '';
  for (var i = 0; i < deck.length; i++) {
    cardHtml +=
      '<div class="memory-card" data-id="' + deck[i] + '" data-idx="' + i + '">' +
        '<div class="card-inner">' +
          '<div class="card-face card-back"></div>' +
          '<div class="card-face card-front">' +
            cardFrontHtml(deck[i]) +
          '</div>' +
        '</div>' +
      '</div>';
  }

  stage.innerHTML =
    '<div class="game-hud">' +
      '<div class="score-chip"><span class="hud-label">TIME</span>' +
        '<span class="hud-value" id="korea-timer">' + TIME_LIMIT + '</span>s</div>' +
      '<div class="score-chip"><span class="hud-label">PAIRS</span>' +
        '<span class="hud-value" id="korea-pairs">0</span>/' + PAIRS_TO_WIN + '</div>' +
    '</div>' +
    '<div class="game-body korea-body">' +
      '<div class="korea-grid">' + cardHtml + '</div>' +
    '</div>';

  var cards   = stage.querySelectorAll('.memory-card');
  var timerEl = stage.querySelector('#korea-timer');
  var pairsEl = stage.querySelector('#korea-pairs');

  var flipped = [];
  var matched = 0;
  var timeLeft = TIME_LIMIT;
  var locked = false;
  var alive = true;
  var gameReady = false;  // opening sequence gates input + timer
  var pendingTimeout = null;
  var matchStreak = 0;
  var shuffleTimeout = null;
  var tickInterval = null;
  var banterInterval = null;
  var openingTimeouts = [];

  var TAUNTS = [
    "Bet you forgot that one, Ella.",
    "Pour me another.",
    "Memory failing already?",
    "Tab's getting expensive.",
    "Two of a kind. So elegant."
  ];
  var BANTER_PORTRAIT = 'bartender_cat_portrait';
  function scheduleBanter() {
    var delay = 6000 + Math.random() * 3500;
    banterInterval = setTimeout(function () {
      if (!alive) return;
      showBossBanter(TAUNTS[Math.floor(Math.random() * TAUNTS.length)], BANTER_PORTRAIT);
      scheduleBanter();
    }, delay);
  }

  function showInGameAlert(text) {
    var a = document.createElement('div');
    a.className = 'game-alert';
    a.textContent = text;
    minigameStage.appendChild(a);
    setTimeout(function () { if (a.parentNode) a.remove(); }, 1500);
  }

  function triggerRoryPounce() {
    locked = true;
    showInGameAlert('[ RORY POUNCES — cards shuffled! ]');
    shakeElement(minigameStage, 'hard');

    var unmatched = [];
    cards.forEach(function (c) {
      if (!c.classList.contains('matched')) unmatched.push(c);
    });
    unmatched.forEach(function (c) {
      c.classList.add('shuffling');
      c.classList.remove('flipped');
    });

    shuffleTimeout = setTimeout(function () {
      var ids = unmatched.map(function (c) { return c.dataset.id; });
      shuffleInPlace(ids);
      unmatched.forEach(function (c, i) {
        c.dataset.id = ids[i];
        var front = c.querySelector('.card-front');
        if (front) front.innerHTML = cardFrontHtml(ids[i]);
        c.classList.remove('shuffling');
      });
      flipped = [];
      locked = false;
      matchStreak = 0;
      shuffleTimeout = null;
    }, 700);
  }

  function onCardClick(card) {
    if (!alive || locked || !gameReady) return;
    if (card.classList.contains('matched') || card.classList.contains('flipped')) return;
    card.classList.add('flipped');
    flipped.push(card);
    if (flipped.length === 2) {
      locked = true;
      var a = flipped[0], b = flipped[1];
      if (a.dataset.id === b.dataset.id) {
        a.classList.add('matched');
        b.classList.add('matched');
        matched++;
        pairsEl.textContent = matched;
        pulseHud(pairsEl);
        shakeElement(minigameStage, 'light');
        matchStreak++;
        flipped = [];
        locked = false;

        if (matched >= PAIRS_TO_WIN) {
          alive = false;
          clearInterval(tickInterval);
          winLocation('korea');
          return;
        }
        if (matchStreak >= STREAK_TRIGGER) {
          triggerRoryPounce();
        }
      } else {
        matchStreak = 0;
        pendingTimeout = setTimeout(function () {
          a.classList.remove('flipped');
          b.classList.remove('flipped');
          flipped = [];
          locked = false;
          pendingTimeout = null;
        }, 700);
      }
    }
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function () { onCardClick(card); });
  });

  /* ---------- OPENING SEQUENCE ----------
     1) Reveal face-up for 2.5s (memorization)
     2) Flip face-down + IMMEDIATELY start the shuffle (no dead pause)
     3) Shuffle animation runs ~0.7s while data also shuffles
     4) Game live — timer + banter + clicks all start. */
  function startOpeningSequence() {
    if (!alive) return;
    // Step 1: reveal all face-up
    cards.forEach(function (c) { c.classList.add('flipped'); });
    showRoundBanner('MEMORIZE!');

    openingTimeouts.push(setTimeout(function () {
      if (!alive) return;
      // Step 2: flip face-down AND kick off the shuffle in the SAME tick
      cards.forEach(function (c) {
        c.classList.remove('flipped');
        c.classList.add('shuffling');
      });

      openingTimeouts.push(setTimeout(function () {
        if (!alive) return;
        // Step 3 done: apply the array shuffle, remove the spin class
        var ids = Array.prototype.map.call(cards, function (c) { return c.dataset.id; });
        shuffleInPlace(ids);
        cards.forEach(function (c, i) {
          c.dataset.id = ids[i];
          var front = c.querySelector('.card-front');
          if (front) front.innerHTML = cardFrontHtml(ids[i]);
          c.classList.remove('shuffling');
        });

        // Step 4: game live.
        gameReady = true;
        scheduleBanter();
        tickInterval = setInterval(timerTick, 1000);
      }, 700));
    }, 2500));
  }

  function timerTick() {
    if (!alive) return;
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 8 && timeLeft > 0) {
      timerEl.classList.add('warn');
      pulseHud(timerEl);
    }
    if (timeLeft <= 0) {
      alive = false;
      clearInterval(tickInterval);
      if (pendingTimeout) { clearTimeout(pendingTimeout); pendingTimeout = null; }
      if (shuffleTimeout) { clearTimeout(shuffleTimeout); shuffleTimeout = null; }
      if (banterInterval) { clearTimeout(banterInterval); banterInterval = null; }
      loseLocation('korea',
        'Bourbon smirks — only ' + matched + ' of ' + PAIRS_TO_WIN + ' pairs. Try again, Ella.');
    }
  }

  startOpeningSequence();

  return function cleanup() {
    alive = false;
    if (tickInterval) clearInterval(tickInterval);
    if (pendingTimeout) { clearTimeout(pendingTimeout); pendingTimeout = null; }
    if (shuffleTimeout) { clearTimeout(shuffleTimeout); shuffleTimeout = null; }
    if (banterInterval) { clearTimeout(banterInterval); banterInterval = null; }
    openingTimeouts.forEach(function (t) { clearTimeout(t); });
    openingTimeouts = [];
  };
};

/* ====================================================================
   📍 NEW YORK — Taxi Dash (lane-switch dodge/collect)
   - 3 lanes, taxi slides between them on Arrow/A-D press
   - Obstacles (car, cone, pigeon) and collectibles (pretzel, hot dog)
     spawn at the top and scroll downward
   - Same-lane collision with an obstacle at taxi y = hit (3 = lose)
   - Same-lane collectible at taxi y = caught (5 = win)
   - 35-second time cap as a backstop
==================================================================== */
Games.nyc = function (stage) {
  // Round 1: collect 5. Round 2: collect 8 more (independent counter) and
  // Round 2 runs at +20% fall speed with obstacles ~20% more frequent.
  var COLLECT_R1         = 5;
  var COLLECT_R2         = 8;
  var MAX_STRIKES        = 3;      // strikes carry across both rounds
  var TIME_LIMIT         = 55;     // global timer for both rounds
  var LANES              = 3;
  var TAXI_W             = 84;
  var TAXI_H             = 120;
  var OBSTACLE_SIZE      = 76;
  var COLLECTIBLE_SIZE   = 64;
  var BASE_FALL_SPEED    = 4.2;
  var FALL_SPEED_MAX     = 8.2;    // higher cap to allow R2 boost
  var SPEED_RAMP_PER_SEC = 0.10;
  var LANE_SLIDE_MS      = 180;
  var OBSTACLE_SPAWN_MS  = 1050;
  var COLLECTIBLE_SPAWN_MS = 2300;
  var ROUND2_FALL_MULT     = 1.20;
  var ROUND2_OBSTACLE_MULT = 0.83;  // multiply spawn interval (smaller = more often)

  var OBSTACLE_IMAGES   = ['obstacle_car', 'obstacle_cone', 'obstacle_pigeon'];
  var COLLECTIBLE_IMAGES = ['collectible_pretzel', 'collectible_hotdog'];

  var TAUNTS = [
    "Watch the pigeons, Ella.",
    "Cone, ahead, left lane.",
    "Honk if you're nervous.",
    "Real New York pace.",
    "You drive like a tourist."
  ];
  var BANTER_PORTRAIT = 'taxicat_portrait';
  var banterInterval = null;
  function scheduleBanter() {
    var delay = 5500 + Math.random() * 3500;
    banterInterval = setTimeout(function () {
      if (!alive) return;
      showBossBanter(TAUNTS[Math.floor(Math.random() * TAUNTS.length)], BANTER_PORTRAIT);
      scheduleBanter();
    }, delay);
  }

  stage.innerHTML =
    '<div class="game-hud">' +
      '<div class="score-chip"><span class="hud-label">ROUND</span>' +
        '<span class="hud-value" id="nyc-round">1</span>/2</div>' +
      '<div class="score-chip"><span class="hud-label">CAUGHT</span>' +
        '<span class="hud-value" id="nyc-score">0</span>/<span id="nyc-target">' + COLLECT_R1 + '</span></div>' +
      '<div class="score-chip"><span class="hud-label">STRIKES</span>' +
        '<span class="hud-value" id="nyc-strikes">0</span>/' + MAX_STRIKES + '</div>' +
      '<div class="score-chip"><span class="hud-label">TIME</span>' +
        '<span class="hud-value" id="nyc-timer">' + TIME_LIMIT + '</span>s</div>' +
    '</div>' +
    '<div class="game-body">' +
      '<div class="nyc-arena" id="nyc-arena">' +
        '<div class="nyc-skyline"></div>' +
        '<div class="nyc-road"></div>' +
        '<img class="nyc-taxi" id="nyc-taxi" src="images/taxi_player.png" alt="" />' +
      '</div>' +
    '</div>';

  var arena    = stage.querySelector('#nyc-arena');
  var taxi     = stage.querySelector('#nyc-taxi');
  var timerEl  = stage.querySelector('#nyc-timer');
  var scoreEl  = stage.querySelector('#nyc-score');
  var targetEl = stage.querySelector('#nyc-target');
  var strikesEl= stage.querySelector('#nyc-strikes');
  var roundEl  = stage.querySelector('#nyc-round');

  var arenaW = 0, arenaH = 0;
  var laneXs = [0, 0, 0]; // pixel centers of each lane
  var taxiLane = 1;       // 0 = left, 1 = center, 2 = right
  var taxiX = 0;          // current x (may be mid-slide)
  var taxiSlideStart = 0;
  var taxiSlideFrom = 0;
  var taxiSlideTo = 0;
  var taxiSliding = false;
  var TAXI_Y_FROM_BOTTOM = 24; // taxi sits 24px from arena bottom

  var fallSpeed = BASE_FALL_SPEED;
  var round = 1;
  var roundTarget = COLLECT_R1;     // collectibles needed in current round
  var fallMult = 1;                 // ROUND2_FALL_MULT once R2 starts
  var obstacleMult = 1;             // ROUND2_OBSTACLE_MULT once R2 starts
  var score = 0;                    // resets between rounds
  var strikes = 0;                  // carries across both rounds
  var timeLeft = TIME_LIMIT;
  var alive = true;
  var ended = false;
  var activeFalls = []; // { el, x, y, lane, kind: 'obstacle'|'collectible' }
  var rafId = null;
  var obstacleTimeout = null;
  var collectibleTimeout = null;
  var tickInterval = null;
  var startedAt = 0;
  var lastFrameTs = 0;

  function measure() {
    arenaW = arena.clientWidth  || 600;
    arenaH = arena.clientHeight || 480;
    // Lane centers — divide arena width into 3 equal strips
    laneXs[0] = arenaW * 0.5 / 3 * 1;       // = arenaW * 1/6
    laneXs[1] = arenaW * 0.5;
    laneXs[2] = arenaW - arenaW * 0.5 / 3;
    // Snap taxi position to current lane
    taxiX = laneXs[taxiLane];
    positionTaxi();
  }
  function positionTaxi() {
    taxi.style.left = (taxiX - TAXI_W / 2) + 'px';
    taxi.style.bottom = TAXI_Y_FROM_BOTTOM + 'px';
  }

  function switchLane(dir) {
    if (!alive || ended) return;
    var next = taxiLane + dir;
    if (next < 0 || next >= LANES) return;
    taxiLane = next;
    taxiSlideFrom = taxiX;
    taxiSlideTo = laneXs[taxiLane];
    taxiSlideStart = performance.now();
    taxiSliding = true;
  }

  function onKey(e) {
    if (!alive || ended) return;
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
      switchLane(-1); e.preventDefault();
    } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
      switchLane(+1); e.preventDefault();
    }
  }
  document.addEventListener('keydown', onKey);

  function nearestLaneForX(px) {
    // Used by collision: snap falling-thing x to nearest lane index.
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < LANES; i++) {
      var d = Math.abs(px - laneXs[i]);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  function spawnObstacle() {
    if (!alive) return;
    var lane = Math.floor(Math.random() * LANES);
    var kind = OBSTACLE_IMAGES[Math.floor(Math.random() * OBSTACLE_IMAGES.length)];
    var el = document.createElement('img');
    el.className = 'nyc-obstacle';
    el.src = 'images/' + kind + '.png';
    el.style.width = OBSTACLE_SIZE + 'px';
    el.style.height = OBSTACLE_SIZE + 'px';
    el.style.left = (laneXs[lane] - OBSTACLE_SIZE / 2) + 'px';
    el.style.top  = (-OBSTACLE_SIZE) + 'px';
    arena.appendChild(el);
    activeFalls.push({ el: el, x: laneXs[lane], y: -OBSTACLE_SIZE, lane: lane, kind: 'obstacle' });
    obstacleTimeout = setTimeout(spawnObstacle, OBSTACLE_SPAWN_MS * obstacleMult + Math.random() * 250);
  }
  function spawnCollectible() {
    if (!alive) return;
    var lane = Math.floor(Math.random() * LANES);
    var kind = COLLECTIBLE_IMAGES[Math.floor(Math.random() * COLLECTIBLE_IMAGES.length)];
    var el = document.createElement('img');
    el.className = 'nyc-collectible';
    el.src = 'images/' + kind + '.png';
    el.style.width = COLLECTIBLE_SIZE + 'px';
    el.style.height = COLLECTIBLE_SIZE + 'px';
    el.style.left = (laneXs[lane] - COLLECTIBLE_SIZE / 2) + 'px';
    el.style.top  = (-COLLECTIBLE_SIZE) + 'px';
    arena.appendChild(el);
    activeFalls.push({ el: el, x: laneXs[lane], y: -COLLECTIBLE_SIZE, lane: lane, kind: 'collectible' });
    collectibleTimeout = setTimeout(spawnCollectible, COLLECTIBLE_SPAWN_MS + Math.random() * 600);
  }

  function advanceToRound2() {
    round = 2;
    roundTarget = COLLECT_R2;
    score = 0;
    fallMult = ROUND2_FALL_MULT;
    obstacleMult = ROUND2_OBSTACLE_MULT;
    roundEl.textContent = round;
    scoreEl.textContent = score;
    targetEl.textContent = roundTarget;
    showRoundBanner('ROUND 2 — TRAFFIC GETS WORSE');
  }

  function tick(ts) {
    if (!alive) return;
    if (!lastFrameTs) lastFrameTs = ts || performance.now();
    var now = ts || performance.now();
    var dt = (now - lastFrameTs) / 1000;
    lastFrameTs = now;

    // Speed ramps over time, then Round 2 multiplies the ramped value.
    var elapsed = (now - startedAt) / 1000;
    var ramped = Math.min(FALL_SPEED_MAX, BASE_FALL_SPEED + SPEED_RAMP_PER_SEC * elapsed);
    fallSpeed = Math.min(FALL_SPEED_MAX, ramped * fallMult);

    // Taxi lane-slide tween
    if (taxiSliding) {
      var p = (now - taxiSlideStart) / LANE_SLIDE_MS;
      if (p >= 1) { taxiX = taxiSlideTo; taxiSliding = false; }
      else { taxiX = taxiSlideFrom + (taxiSlideTo - taxiSlideFrom) * p; }
      positionTaxi();
    }

    // Move falling things.
    // The taxi sprite has transparent margins at the top/sides, so the
    // collision hitbox is tighter than the full TAXI_H. We require
    // ACTUAL visual overlap (AABB-Y) between obstacle and taxi body.
    var taxiTop = arenaH - TAXI_Y_FROM_BOTTOM - TAXI_H;
    var taxiHitTop    = taxiTop + 36;          // skip transparent sprite top
    var taxiHitBottom = arenaH - TAXI_Y_FROM_BOTTOM - 10;
    for (var i = activeFalls.length - 1; i >= 0; i--) {
      var f = activeFalls[i];
      f.y += fallSpeed;
      f.el.style.top = f.y + 'px';

      var size = (f.kind === 'obstacle') ? OBSTACLE_SIZE : COLLECTIBLE_SIZE;
      var inset = (f.kind === 'obstacle') ? 8 : 6; // inset for obstacle/collectible art margins
      var fTop    = f.y + inset;
      var fBottom = f.y + size - inset;

      // Real AABB-Y overlap: obstacle's body actually overlaps taxi's body
      if (f.lane === taxiLane && fBottom > taxiHitTop && fTop < taxiHitBottom) {
        if (f.kind === 'obstacle') {
          strikes++;
          strikesEl.textContent = strikes;
          pulseHud(strikesEl);
          shakeElement(minigameStage, 'hard');
          taxi.classList.add('hit');
          setTimeout(function () { taxi.classList.remove('hit'); }, 280);
        } else {
          score++;
          scoreEl.textContent = score;
          pulseHud(scoreEl);
          shakeElement(minigameStage, 'light');
        }
        f.el.classList.add('nyc-fade');
        activeFalls.splice(i, 1);
        setTimeout((function (el) { return function () { if (el.parentNode) el.remove(); }; })(f.el), 220);
        if (checkEnd()) return;
        continue;
      }

      // Fell past
      if (f.y > arenaH + 4) {
        f.el.remove();
        activeFalls.splice(i, 1);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function checkEnd() {
    if (ended) return true;
    if (score >= roundTarget) {
      if (round === 1) {
        advanceToRound2();
        return false; // continue playing
      }
      ended = true; alive = false;
      cleanup();
      winLocation('nyc');
      return true;
    }
    if (strikes >= MAX_STRIKES) {
      ended = true; alive = false;
      cleanup();
      loseLocation('nyc',
        'Three hits in Midtown — Bronx lost you in traffic. Try again.');
      return true;
    }
    return false;
  }

  function cleanup() {
    alive = false;
    ended = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (obstacleTimeout) clearTimeout(obstacleTimeout);
    if (collectibleTimeout) clearTimeout(collectibleTimeout);
    if (tickInterval) clearInterval(tickInterval);
    if (banterInterval) clearTimeout(banterInterval);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    activeFalls.forEach(function (f) { if (f.el.parentNode) f.el.remove(); });
    activeFalls = [];
  }

  function onResize() {
    if (!alive) return;
    measure();
    // Reproject any in-flight obstacles/collectibles to the recalculated
    // lane positions so they stay correctly lane-aligned across resize.
    activeFalls.forEach(function (f) {
      var size = (f.kind === 'obstacle') ? OBSTACLE_SIZE : COLLECTIBLE_SIZE;
      f.x = laneXs[f.lane];
      f.el.style.left = (f.x - size / 2) + 'px';
    });
  }
  window.addEventListener('resize', onResize);

  // Layout + start
  requestAnimationFrame(function () {
    if (!alive) return;
    measure();
    startedAt = performance.now();
    lastFrameTs = startedAt;
    obstacleTimeout   = setTimeout(spawnObstacle, 600);
    collectibleTimeout = setTimeout(spawnCollectible, 1400);
    rafId = requestAnimationFrame(tick);
    scheduleBanter();

    tickInterval = setInterval(function () {
      if (!alive) return;
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 6 && timeLeft > 0) {
        timerEl.classList.add('warn');
        pulseHud(timerEl);
      }
      if (timeLeft <= 0) {
        clearInterval(tickInterval);
        // Only count as a win if Round 2 was reached AND its target met.
        if (round === 2 && score >= COLLECT_R2) {
          ended = true; alive = false; cleanup(); winLocation('nyc');
        } else {
          ended = true; alive = false; cleanup();
          var stage = (round === 1)
            ? 'Time up in Round 1 — only ' + score + ' of ' + COLLECT_R1 + '.'
            : 'Time up in Round 2 — only ' + score + ' of ' + COLLECT_R2 + '.';
          loseLocation('nyc', stage + ' Try again, Ella.');
        }
      }
    }, 1000);
  });

  return cleanup;
};

/* ====================================================================
   📍 ENGLAND — The Sorting Gate (Hogwarts trivia)
==================================================================== */
Games.england = function (stage) {

  // [EDIT] ENGLAND QUIZ — 5 trivia questions
  // Each entry: house (gryffindor/slytherin/ravenclaw/hufflepuff),
  //             text (the question),
  //             options (array of 3-4 strings),
  //             correct (index of right answer: 0=A, 1=B, 2=C, 3=D)
  var QUESTIONS = [
    {
      house: 'gryffindor',
      text: 'What is the greeting of He who shall not be named?',
      options: [
        'Hola senorita',
        'Yo wys',
        'Bonjour'
      ],
      correct: 0
    },
    {
      house: 'slytherin',
      text: "Who was Ella's favourite?",
      options: [
        'Taysir',
        'Josh',
        'Tobi'
      ],
      correct: 1
    },
    {
      house: 'ravenclaw',
      text: 'Is Arnav funnier than Ella?',
      options: [
        'Yh', 
        'Yeah',
        'Yes'
      ],
      correct: 2
    },
    {
      house: 'hufflepuff',
      text: 'What is Ella to us?',
      options: [
        'True Eve',
        'True Chud', //correct
        'A great friend'
      ],
      correct: 1
    },
    {
      house: 'gryffindor',
      text: 'How old is Ella?',
      options: [
        'Unc', //correct
        '19',
        'Nobody cares'
      ],
      correct: 0
    }
  ];
  // =================================================

  stage.innerHTML =
    '<div class="england-stage">' +
      '<div class="hogwarts-characters">' +
        imgTag('wizard_cat_intro', 'professor-cat') +
        '<img class="sorting-hat" id="sorting-hat" src="images/wizard_hat_icon.png" alt="" />' +
      '</div>' +
      '<div class="trivia-panel" id="trivia-panel">' +
        '<div class="trivia-q-number" id="trivia-q-number">— AWAITING —</div>' +
        '<div class="trivia-question" id="trivia-question"></div>' +
        '<div class="trivia-options" id="trivia-options"></div>' +
      '</div>' +
    '</div>';

  var panel     = stage.querySelector('#trivia-panel');
  var qNumberEl = stage.querySelector('#trivia-q-number');
  var qEl       = stage.querySelector('#trivia-question');
  var optsEl    = stage.querySelector('#trivia-options');

  var qIdx = 0;
  var alive = true;
  var locked = false;
  var pendingTimeout = null;
  var banterInterval = null;

  var TAUNTS = [
    "Curious mind, Ella.",
    "Thinking too hard?",
    "Hmm.",
    "Most peculiar.",
    "I've seen this answer before..."
  ];
  var BANTER_PORTRAIT = 'wizard_cat_portrait';
  function scheduleBanter() {
    var delay = 7000 + Math.random() * 4000;
    banterInterval = setTimeout(function () {
      if (!alive) return;
      showBossBanter(TAUNTS[Math.floor(Math.random() * TAUNTS.length)], BANTER_PORTRAIT);
      scheduleBanter();
    }, delay);
  }
  scheduleBanter();

  showQuestion();

  function showQuestion() {
    if (!alive) return;
    if (qIdx >= QUESTIONS.length) { winEngland(); return; }
    var q = QUESTIONS[qIdx];
    panel.classList.remove('house-gryffindor', 'house-slytherin', 'house-ravenclaw', 'house-hufflepuff');
    panel.classList.add('house-' + q.house);
    qNumberEl.textContent = 'QUESTION ' + (qIdx + 1) + ' / ' + QUESTIONS.length +
                            ' · ' + q.house.toUpperCase();
    qEl.textContent = q.text;
    optsEl.innerHTML = '';
    q.options.forEach(function (opt, i) {
      var btn = document.createElement('button');
      btn.className = 'btn trivia-option';
      btn.textContent = String.fromCharCode(65 + i) + '. ' + opt;
      btn.addEventListener('click', function () { onAnswer(i, btn); });
      optsEl.appendChild(btn);
    });
    locked = false;
  }

  function onAnswer(idx, btn) {
    if (!alive || locked) return;
    locked = true;
    var q = QUESTIONS[qIdx];
    if (idx === q.correct) {
      btn.classList.add('correct');
      shakeElement(minigameStage, 'light');
      pendingTimeout = setTimeout(function () {
        qIdx++;
        if (qIdx >= QUESTIONS.length) {
          alive = false;
          winEngland();
        } else {
          startDialogue([
            // [EDIT] SORTING HAT — line shown after a CORRECT answer
            { speaker: 'THE HAT', portrait: 'sorting_hat_portrait',
              text: 'Well answered. The next question awaits.' }
          ], showQuestion);
        }
      }, 600);
    } else {
      btn.classList.add('wrong');
      shakeElement(minigameStage, 'hard');
      pendingTimeout = setTimeout(function () {
        startDialogue([
          // [EDIT] SORTING HAT — line shown after an INCORRECT answer
          { speaker: 'THE HAT', portrait: 'sorting_hat_portrait',
            text: 'Incorrect! Try again, young one.' }
        ], function () { showQuestion(); });
      }, 500);
    }
  }

  function winEngland() {
    alive = false;
    locked = true;
    if (banterInterval) { clearTimeout(banterInterval); banterInterval = null; }
    if (pendingTimeout) { clearTimeout(pendingTimeout); pendingTimeout = null; }
    State.completed.england = true;
    updateNodeStates();
    addPolaroidPin('england'); // adds England's polaroid to the hub corkboard

    var flash = document.createElement('div');
    flash.className = 'hogwarts-flash';
    document.getElementById('game').appendChild(flash);
    setTimeout(function () { if (flash.parentNode) flash.remove(); }, 950);

    setTimeout(function () {
      minigameStage.innerHTML =
        '<div class="hogwarts-gate">' +
          imgTag('banner_unlocked') +
          '<div>[ HOGWARTS GATE OPENS ]</div>' +
        '</div>';
    }, 320);

    setTimeout(function () {
      // Per-location victory dialogue + then transition to scene 4
      var meta = QUEST_META.england;
      startDialogue((meta.victory || []).slice(), function () {
        State.busy = true;
        doWipe(function () {
          minigameScreen.classList.remove('active');
          minigameStage.innerHTML = '';
          showScene4();
          State.busy = false;
        });
      });
    }, 1100);
  }

  return function cleanup() {
    alive = false;
    locked = true;
    if (pendingTimeout) clearTimeout(pendingTimeout);
    if (banterInterval) clearTimeout(banterInterval);
  };
};
