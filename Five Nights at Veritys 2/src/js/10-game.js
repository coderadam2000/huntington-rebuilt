(function() {
  'use strict';

  /** @const {string} Where the save lives in the browser. */
  const SAVE_KEY = 'taco.fnav2Save';

  /** @const {string} The tester code that unlocks everything. */
  const ADMIN_CODE = 'claude';

  /**
   * The actions a player can change the key for, in the order shown.
   * @const {!Array<{id: string, name: string, key: string}>}
   */
  const KEY_ACTIONS = [
    {id: 'mask', name: 'Mask', key: 'Space'},
    {id: 'cameras', name: 'Cameras', key: 'KeyS'},
    {id: 'flashlight', name: 'Flashlight (mouse also works)', key: 'KeyF'},
    {id: 'turnLeft', name: 'Turn left', key: 'KeyA'},
    {id: 'turnRight', name: 'Turn right', key: 'KeyD'},
    {id: 'wind', name: 'Wind music box', key: 'KeyW'},
  ];

  /** @const {!Object<string, string>} What each scare level does. */
  const SPOOK_NOTES = {
    baby: 'Baby: no jump scares at all.',
    toddler: 'Toddler: no scary picture, but the scream still plays.',
    kid: 'Kid: normal jump scares.',
    manly: 'Manly: 10x scarier. Faster monsters, broken faces, ' +
        'red flashes and a little blood.',
  };

  /** @const {!Array<string>} Every monster, for the index. */
  const MONSTERS = [
    'brokenVerity', 'brokenFalsity', 'brokenLovity', 'brokenObesity',
    'toyVerity', 'toyFalsity', 'toyLovity', 'toyObesity',
    'angrity', 'curiosity', 'velocity', 'fragility',
    'insanity', 'calamity', 'vanity', 'goldenVerity',
  ];

  /**
   * Makes a brand new save.
   * @return {!Object} A fresh save.
   */
  function makeNewSave() {
    const keys = {};
    KEY_ACTIONS.forEach((action) => {
      keys[action.id] = action.key;
    });
    return {
      night: 1,
      beaten: [],
      stars: {night5: false, night6: false, custom: false, golden: false},
      index: {},
      settings: {
        spookiness: 'kid',
        epileptic: false,
        volume: 70,
        keys: keys,
      },
    };
  }

  /**
   * Loads the save, or makes a new one if there isn't one yet.
   * @return {!Object} The save.
   */
  function loadSave() {
    const fresh = makeNewSave();
    try {
      const text = window.localStorage.getItem(SAVE_KEY);
      if (!text) {
        return fresh;
      }
      const loaded = JSON.parse(text);
      // Fill in anything missing from older saves.
      loaded.stars = Object.assign(fresh.stars, loaded.stars);
      loaded.settings = Object.assign(fresh.settings, loaded.settings);
      loaded.settings.keys =
          Object.assign(fresh.settings.keys, loaded.settings.keys);
      loaded.index = loaded.index || {};
      loaded.beaten = loaded.beaten || [];
      loaded.night = loaded.night || 1;
      return loaded;
    } catch (error) {
      return fresh;
    }
  }

  /** Saves the game to the browser. */
  function writeSave() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (error) {
      // Saving is not allowed here. The game still works without it.
    }
  }

  /** @type {!Object} The player's progress and settings. */
  let save = loadSave();

  // ---------------------------------------------------------------------
  // Sound
  // ---------------------------------------------------------------------

  /** @type {?AudioContext} */
  let audio = null;
  /** @type {?GainNode} The volume knob for every sound. */
  let masterGain = null;
  /** @type {number} The timer for the menu music box tune. */
  let tuneTimer = 0;

  /** Starts sound. Browsers only allow this after a click. */
  function startAudio() {
    if (audio) {
      return;
    }
    const AudioType = window.AudioContext || window.webkitAudioContext;
    if (!AudioType) {
      return;
    }
    audio = new AudioType();
    masterGain = audio.createGain();
    masterGain.connect(audio.destination);
    applyVolume();
  }

  /** Sets the sound volume from the save. */
  function applyVolume() {
    if (masterGain) {
      masterGain.gain.value = save.settings.volume / 100;
    }
  }

  /**
   * Plays one note.
   * @param {number} freq How high the note is.
   * @param {number} length How long it lasts, in seconds.
   * @param {string} type The shape of the sound wave.
   * @param {number} loud How loud, from 0 to 1.
   */
  function playNote(freq, length, type, loud) {
    if (!audio) {
      return;
    }
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(loud, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + length);
  }

  /** Plays a small click for buttons. */
  function playClick() {
    playNote(220, 0.08, 'square', 0.04);
  }

  /** @const {!Array<number>} The slow, creepy music box tune. */
  const TUNE = [659, 587, 523, 494, 523, 587, 494, 392,
    440, 494, 523, 440, 392, 0, 330, 0];

  /** Starts the quiet music box tune on the home screen. */
  function startTune() {
    stopTune();
    let step = 0;
    tuneTimer = window.setInterval(() => {
      const freq = TUNE[step % TUNE.length];
      if (freq) {
        // A slightly out of tune note sounds creepier.
        playNote(freq * 0.995, 1.2, 'triangle', 0.05);
        playNote(freq * 2, 0.6, 'sine', 0.015);
      }
      step++;
    }, 520);
  }

  /** Stops the menu tune. */
  function stopTune() {
    window.clearInterval(tuneTimer);
  }

  // ---------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------

  const game = document.getElementById('game');

  /**
   * Shows one screen and hides the others.
   * @param {string} id The screen to show.
   */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.toggle('show', screen.id === id);
    });
  }

  /**
   * Shows a small panel over the screen.
   * @param {string} html What goes inside the panel.
   */
  function showPopup(html) {
    document.getElementById('popupPanel').innerHTML = html;
    document.getElementById('popup').classList.add('show');
  }

  /** Hides the small panel. */
  function hidePopup() {
    document.getElementById('popup').classList.remove('show');
  }

  /** Turns the "no flashing" look on or off. */
  function applyEpileptic() {
    game.classList.toggle('noFlash', save.settings.epileptic);
  }

  // Warning screens: click to move on.
  document.getElementById('epilepsyScreen').addEventListener('click', () => {
    startAudio();
    playClick();
    showScreen('volumeScreen');
  });
  document.getElementById('volumeScreen').addEventListener('click', () => {
    playClick();
    showScreen('scareWarnScreen');
  });
  document.getElementById('scareWarnScreen').addEventListener('click',
      () => {
        playClick();
        goHome();
      });

  // ---------------------------------------------------------------------
  // Home screen art
  // ---------------------------------------------------------------------

  /**
   * Draws the prize counter room and Toy Verity.
   * @return {string} SVG markup.
   */
  function drawHomeArt() {
    let toys = '';
    const shelfY = [70, 140, 210];
    for (let row = 0; row < 3; row++) {
      for (let x = 290; x < 680; x += 44) {
        const y = shelfY[row] - 16;
        if ((x + row) % 3 === 0) {
          toys += '<rect x="' + (x - 12) + '" y="' + (y - 12) +
              '" width="24" height="28" fill="#222220"/>';
        } else {
          toys += '<circle cx="' + x + '" cy="' + y + '" r="' +
              (12 + (x % 5)) + '" fill="#222220"/>';
        }
      }
    }
    return '' +
      '<defs>' +
      '<radialGradient id="toyShade" cx="35%" cy="30%" r="75%">' +
      '<stop offset="0" stop-color="#f8e7a8"/>' +
      '<stop offset="0.55" stop-color="#e0bc45"/>' +
      '<stop offset="1" stop-color="#6a5414"/></radialGradient>' +
      '<radialGradient id="brokenShade" cx="35%" cy="30%" r="75%">' +
      '<stop offset="0" stop-color="#a8924a"/>' +
      '<stop offset="0.6" stop-color="#7d6a2e"/>' +
      '<stop offset="1" stop-color="#2a220c"/></radialGradient>' +
      '</defs>' +
      '<rect width="680" height="420" fill="#0b0b0b"/>' +
      '<rect width="680" height="290" fill="#141414"/>' +
      '<rect y="70" width="680" height="8" fill="#2c2c2a"/>' +
      '<rect y="140" width="680" height="8" fill="#2c2c2a"/>' +
      '<rect y="210" width="680" height="8" fill="#2c2c2a"/>' +
      toys +
      '<g id="glowEyes" opacity="0">' +
      '<circle cx="512" cy="191" r="2.5" fill="#d3d1c7"/>' +
      '<circle cx="520" cy="191" r="2.5" fill="#d3d1c7"/></g>' +
      '<rect y="250" width="680" height="60" fill="#1a1a1a"/>' +
      '<rect y="250" width="680" height="6" fill="#2c2c2a"/>' +
      '<rect y="310" width="680" height="110" fill="#0f0f0f"/>' +
      '<rect x="580" y="300" width="60" height="44" fill="#1f1a14" ' +
      'stroke="#412402"/>' +
      '<rect x="607" y="300" width="6" height="44" fill="#412402"/>' +
      '<circle cx="610" cy="296" r="3" fill="#ba7517" opacity="0.6"/>' +
      '<polygon class="flicker" points="380,0 520,0 600,300 300,300" ' +
      'fill="#fac775" opacity="0.05"/>' +
      // Toy Verity, big and cut off by the left edge.
      '<g id="toyFace">' +
      '<circle cx="70" cy="215" r="175" fill="url(#toyShade)"/>' +
      '<ellipse cx="20" cy="110" rx="60" ry="26" fill="#ffffff" ' +
      'opacity="0.3" transform="rotate(-25 20 110)"/>' +
      '<circle cx="-10" cy="265" r="26" fill="#ed93b1" opacity="0.5"/>' +
      '<circle cx="190" cy="265" r="26" fill="#ed93b1" opacity="0.5"/>' +
      '<ellipse cx="20" cy="185" rx="28" ry="38" fill="#2c2c2a"/>' +
      '<ellipse cx="135" cy="185" rx="28" ry="38" fill="#2c2c2a"/>' +
      '<circle cx="30" cy="170" r="9" fill="#ffffff"/>' +
      '<circle cx="145" cy="170" r="9" fill="#ffffff"/>' +
      '<path d="M0 285 Q80 345 175 285" stroke="#2c2c2a" ' +
      'stroke-width="18" fill="none" stroke-linecap="round"/></g>' +
      // Broken Verity, shown for a moment when the screen glitches.
      '<g id="brokenFace" opacity="0">' +
      '<circle cx="70" cy="215" r="175" fill="url(#brokenShade)"/>' +
      '<path d="M30 45 L60 120 L20 160 L50 210" stroke="#140f05" ' +
      'stroke-width="5" fill="none"/>' +
      '<path d="M170 290 L200 250 L230 270" stroke="#140f05" ' +
      'stroke-width="4" fill="none"/>' +
      '<ellipse cx="20" cy="185" rx="28" ry="38" fill="#050505"/>' +
      '<ellipse cx="135" cy="185" rx="28" ry="38" fill="#050505"/>' +
      '<circle cx="135" cy="190" r="9" fill="#e24b4a"/>' +
      '<path d="M0 285 Q80 345 175 285" stroke="#140f05" ' +
      'stroke-width="18" fill="none" stroke-linecap="round"/></g>';
  }

  document.getElementById('homeArt').innerHTML = drawHomeArt();

  /** @type {number} Timer for the creepy home screen effects. */
  let effectTimer = 0;

  /** Every few seconds, something creepy happens on the home screen. */
  function homeEffect() {
    const toyFace = document.getElementById('toyFace');
    const brokenFace = document.getElementById('brokenFace');
    const eyes = document.getElementById('glowEyes');
    const roll = Math.random();
    if (roll < 0.5) {
      // Glitch to broken Verity. Without flashing it fades slowly.
      const quick = !save.settings.epileptic;
      const fade = quick ? 'none' : 'opacity 1.2s';
      toyFace.style.transition = fade;
      brokenFace.style.transition = fade;
      toyFace.setAttribute('opacity', '0');
      brokenFace.setAttribute('opacity', '1');
      if (quick) {
        playNote(90, 0.25, 'sawtooth', 0.05);
      }
      window.setTimeout(() => {
        toyFace.setAttribute('opacity', '1');
        brokenFace.setAttribute('opacity', '0');
      }, quick ? 180 : 2200);
    } else {
      // A toy on the shelf opens its eyes, then closes them.
      eyes.style.transition = 'opacity 1s';
      eyes.setAttribute('opacity', '0.9');
      window.setTimeout(() => {
        eyes.setAttribute('opacity', '0');
      }, 2000);
    }
    effectTimer = window.setTimeout(homeEffect, 4000 + Math.random() * 5000);
  }

  /** @type {number} Animation frame for the static. */
  let staticFrame = 0;

  /** Draws the TV static over the home screen. */
  function drawStatic() {
    const canvas = document.getElementById('staticCanvas');
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const shade = Math.random() * 255;
      image.data[i] = shade;
      image.data[i + 1] = shade;
      image.data[i + 2] = shade;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    // Without flashing, the static stays still.
    if (!save.settings.epileptic) {
      staticFrame = window.setTimeout(() => {
        window.requestAnimationFrame(drawStatic);
      }, 60);
    }
  }

  /** Shows the stars you have earned. */
  function drawStars() {
    const order = ['night5', 'night6', 'custom', 'golden'];
    document.getElementById('stars').textContent = order.map((name) => {
      return save.stars[name] ? '★' : '☆';
    }).join(' ');
  }

  /** @return {boolean} True once all 5 nights are beaten. */
  function allFiveBeaten() {
    return [1, 2, 3, 4, 5].every((night) => save.beaten.includes(night));
  }

  /** Updates the menu words to match the save. */
  function updateMenu() {
    // Sandbox only shows up after the admin code.
    document.getElementById('sandboxItem').style.display =
        save.sandbox ? 'block' : 'none';
    const next = Math.min(save.night, 6);
    document.getElementById('continueItem').textContent =
        'Continue (night ' + next + ')';
    const unlocked = allFiveBeaten();
    const select = document.getElementById('nightSelectItem');
    const custom = document.getElementById('customNightItem');
    select.classList.toggle('locked', !unlocked);
    custom.classList.toggle('locked', !unlocked);
    select.textContent = 'Night select' + (unlocked ? '' : ' (locked)');
    custom.textContent = 'Custom night' + (unlocked ? '' : ' (locked)');
    drawStars();
  }

  /** Goes to the home screen. */
  function goHome() {
    hidePopup();
    showScreen('homeScreen');
    applyEpileptic();
    updateMenu();
    window.clearTimeout(effectTimer);
    window.clearTimeout(staticFrame);
    effectTimer = window.setTimeout(homeEffect, 3000);
    drawStatic();
    startTune();
  }

  // ---------------------------------------------------------------------
  // Menu buttons
  // ---------------------------------------------------------------------

  /** @const {!Object<string, function()>} What each menu item does. */
  const MENU_ACTIONS = {
    newGame: () => {
      showPopup(
          '<div class="panelTitle">NEW GAME</div>' +
          '<div class="infoText" style="text-align:center">' +
          'This starts over at Night 1. Your stars and index stay.</div>' +
          '<div class="bottomRow">' +
          '<button class="btn" id="noNew">Never mind</button>' +
          '<button class="btn" id="yesNew">Start over</button></div>');
      document.getElementById('noNew').onclick = () => {
        playClick();
        hidePopup();
      };
      document.getElementById('yesNew').onclick = () => {
        playClick();
        save.night = 1;
        save.beaten = [];
        writeSave();
        startNight(1);
      };
    },
    continue: () => {
      startNight(Math.min(save.night, 6));
    },
    nightSelect: () => {
      if (!allFiveBeaten()) {
        showLocked('Beat all 5 nights to unlock Night select.');
        return;
      }
      openNightSelect();
    },
    customNight: () => {
      if (!allFiveBeaten()) {
        showLocked('Beat all 5 nights to unlock Custom night.');
        return;
      }
      openCustomNight();
    },
    extras: () => openExtras('monsters'),
    index: openIndex,
    howToPlay: showHowToPlay,
    options: openOptions,
    sandbox: startSandbox,
  };

  document.querySelectorAll('.menuItem').forEach((item) => {
    item.addEventListener('mouseenter', () => {
      playNote(330, 0.05, 'sine', 0.02);
    });
    item.addEventListener('click', () => {
      playClick();
      MENU_ACTIONS[item.dataset.action]();
    });
  });

  /**
   * Shows a "this is locked" message.
   * @param {string} text Why it is locked.
   */
  function showLocked(text) {
    showPopup(
        '<div class="panelTitle">LOCKED</div>' +
        '<div class="infoText" style="text-align:center">' + text +
        '</div><div class="bottomRow"><span></span>' +
        '<button class="btn" id="closePopup">OK</button></div>');
    document.getElementById('closePopup').onclick = () => {
      playClick();
      hidePopup();
    };
  }

  /**
   * What each night is like, for night select. monster and spot pick who
   * shows up in the background, and where.
   * @const {!Object<number, {text: string, fresh: string, monster: string,
   *     spot: string, tip: string}>}
   */
  const NIGHT_INFO = {
    1: {text: 'The toys wake up.', fresh: 'Toy Verity, Toy Falsity',
      monster: 'toyVerity', spot: 'hall',
      tip: 'Toy Verity comes down the hall.'},
    2: {text: 'Something broken stirs.', fresh: 'Toy Lovity, Broken Verity',
      monster: 'brokenVerity', spot: 'hall',
      tip: 'Broken Verity drifts down the hall.'},
    3: {text: 'Something heavy is coming.',
      fresh: 'Toy Obesity, Broken Falsity', monster: 'brokenFalsity',
      spot: 'ventL', tip: 'Broken Falsity crawls through the left vent.'},
    4: {text: 'Someone is angry.', fresh: 'Angrity, Broken Lovity',
      monster: 'angrity', spot: 'hall',
      tip: 'Flash Angrity 3 times. Now 2 can fit in each spot!'},
    5: {text: 'Everyone from the stage is here.', fresh: 'Broken Obesity',
      monster: 'brokenObesity', spot: 'hall',
      tip: 'Now 3 can fit in each spot!'},
    6: {text: 'Faster than ever.', fresh: 'Vanity',
      monster: 'brokenLovity', spot: 'ventR',
      tip: 'Vanity hides in the cameras. Don\'t stare.'},
  };

  /** @const {!Object<string, string>} How each monster attacks. */
  const ATTACKS = {
    toyVerity: 'Comes down the main hall. Put the mask on when she gets in.',
    toyFalsity: 'Crawls through the right vent. The mask fools him.',
    toyLovity: 'Crawls through the left vent. The mask fools her.',
    toyObesity: 'Stomps down the main hall. Listen for heavy steps.',
    curiosity: 'Only moves when you are not watching it on camera.',
    brokenVerity: 'Drifts from parts and service down the main hall.',
    brokenFalsity: 'Comes through the left vent, wires and all.',
    velocity: 'Very fast. It moves twice as often as the others.',
    fragility: 'A cracked doll that crawls through the left vent.',
    brokenLovity: 'Comes from the kids\' cove through the right vent.',
    brokenObesity: 'Worn and heavy. Stomps down the main hall.',
    calamity: 'Knocks things over. The crash makes everyone else move.',
    vanity: 'Only shows up on cameras. Don\'t stare into the mirror.',
    angrity: 'Waits in the hall. The mask won\'t work: flash him 3 times.',
    insanity: 'Keep the music box wound on Cam 11, or it gets out.',
    goldenVerity: 'Very rare. "hey its me its verity"...',
  };

  /** @const {!Array<string>} The 15 monsters on custom night. */
  const CUSTOM_MONSTERS = MONSTERS.filter((name) => name !== 'goldenVerity');

  /**
   * Draws a small picture of a monster.
   * @param {string} name Which monster.
   * @param {number} size How big, in pixels.
   * @return {string} SVG markup.
   */
  function thumbnail(name, size) {
    const body = MONSTER_INFO[name].body;
    return '<svg viewBox="0 0 80 80" width="' + size + '" height="' + size +
        '">' + monsterDefs() +
        drawMonster(name, 40, body ? 42 : 40, body ? 76 : 66) + '</svg>';
  }

  /**
   * Shows a full-screen menu page.
   * @param {string} html What goes on the page.
   * @param {string=} art The background picture.
   */
  function showPage(html, art) {
    showScreen('pageScreen');
    document.getElementById('pageArt').innerHTML = art ||
        '<rect width="680" height="420" fill="#0b0b0b"/>';
    document.getElementById('pageArt').setAttribute('viewBox',
        '0 0 680 420');
    document.getElementById('pageContent').innerHTML = html;
    const back = document.getElementById('pageBack');
    if (back) {
      back.onclick = () => {
        playClick();
        goHome();
      };
    }
  }

  // ----- Night select -----

  /** Opens night select. */
  function openNightSelect() {
    let list = '';
    for (let number = 1; number <= 6; number++) {
      list += '<div class="nightButton' + (number === 6 ? ' sixth' : '') +
          '" data-night="' + number + '">Night ' + number +
          (save.beaten.includes(number) ? '  ★' : '') + '</div>';
    }
    showPage('<div id="nightList"><div class="pageTitle">NIGHT SELECT</div>' +
        list + '<button class="btn" id="pageBack">Back</button></div>' +
        '<div id="nightDesc"></div>' +
        '<div class="pageHint">Hover a night: the new monster shows up ' +
        'where it attacks from</div>');
    document.querySelectorAll('.nightButton').forEach((button) => {
      const number = Number(button.dataset.night);
      button.addEventListener('mouseenter', () => {
        playNote(330, 0.05, 'sine', 0.02);
        previewNight(number);
      });
      button.addEventListener('click', () => {
        playClick();
        startNight(number);
      });
    });
    previewNight(1);
  }

  /**
   * Shows a night's description, with its monster in the background.
   * @param {number} number Which night.
   */
  function previewNight(number) {
    const info = NIGHT_INFO[number];
    const spot = SPOTS[info.spot];
    const body = MONSTER_INFO[info.monster].body;
    const size = body ? spot.size * 1.9 : spot.size;
    const y = body ? spot.y + spot.size * 0.35 : spot.y;
    const light = '<circle cx="' + spot.x + '" cy="' + spot.y + '" r="' +
        (spot.size * 1.3) + '" fill="#fac775" opacity="0.08"/>';
    const art = drawOffice()
        .replace('<g id="spot_' + info.spot + '"></g>',
            '<g>' + light + drawMonster(info.monster, spot.x, y, size) +
            '</g>')
        .replace(/ id="spot_\w+"/g, '') +
        '<rect width="1600" height="420" fill="#000" opacity="0.35"/>';
    const svg = document.getElementById('pageArt');
    svg.innerHTML = art;
    const viewX = info.spot === 'ventL' ? 0 :
        (info.spot === 'ventR' ? WORLD_WIDTH - 680 : (WORLD_WIDTH - 680) / 2);
    svg.setAttribute('viewBox', viewX + ' 0 680 420');
    document.querySelectorAll('.nightButton').forEach((button) => {
      button.classList.toggle('picked', Number(button.dataset.night) ===
          number);
    });
    document.getElementById('nightDesc').innerHTML =
        '<div class="descTitle">Night ' + number + '</div>' +
        '<div>' + info.text + '</div>' +
        '<div class="descNew">New: ' + info.fresh + '</div>' +
        '<div class="descTip">' + info.tip + '</div>' +
        '<div class="descStar">' + (save.beaten.includes(number) ?
            '★ Beaten' : 'Not beaten yet') + '</div>';
  }

  // ----- Custom night -----

  /**
   * The custom night levels, saved between visits.
   * @return {{levels: !Object<string, number>, golden: number}}
   */
  function customSetup() {
    if (!save.custom) {
      const levels = {};
      CUSTOM_MONSTERS.forEach((name) => {
        levels[name] = 0;
      });
      save.custom = {levels: levels, golden: 1};
    }
    if (!save.custom.limit) {
      save.custom.limit = 1;
    }
    return save.custom;
  }

  /** Opens custom night. */
  function openCustomNight() {
    const setup = customSetup();
    let rows = '';
    CUSTOM_MONSTERS.forEach((name) => {
      rows += '<div class="customRow">' + thumbnail(name, 34) +
          '<span class="customName' + (name === 'angrity' ? ' angry' : '') +
          '">' + MONSTER_INFO[name].name + '</span>' +
          '<button class="arrow" data-name="' + name + '" data-step="-1">' +
          '&lt;</button><span class="customLevel">' + setup.levels[name] +
          '</span><button class="arrow" data-name="' + name +
          '" data-step="1">&gt;</button></div>';
    });
    rows += '<div class="customRow golden">' + thumbnail('goldenVerity', 34) +
        '<span class="customName">Golden Verity</span>' +
        '<button class="arrow" data-name="golden" data-step="-1">&lt;' +
        '</button><span class="customLevel">' + setup.golden + '</span>' +
        '<button class="arrow" data-name="golden" data-step="1">&gt;' +
        '</button></div>';
    rows += '<div class="customRow"><span></span>' +
        '<span class="customName">Max monsters per spot</span>' +
        '<button class="arrow" data-name="limit" data-step="-1">&lt;' +
        '</button><span class="customLevel">' + setup.limit + '</span>' +
        '<button class="arrow" data-name="limit" data-step="1">&gt;' +
        '</button></div>';
    let note = 'Beat it with all 15 monsters at 20 for the star.';
    if (setup.golden > 1) {
      note = 'Golden Verity raised: counts for stars, NOT the index.';
    } else if (setup.golden < 1) {
      note = 'Golden Verity lowered: counts for the index, NOT stars.';
    }
    showPage('<div class="panel wide"><div class="panelTitle">CUSTOM NIGHT' +
        '</div><div id="customList">' + rows + '</div>' +
        '<div class="spookNote" style="text-align:center">' + note +
        '</div><div class="bottomRow">' +
        '<button class="btn" id="pageBack">Back</button>' +
        '<button class="btn" id="allZero">All 0</button>' +
        '<button class="btn" id="allMax">All 20</button>' +
        '<button class="btn picked" id="startCustom">Start</button>' +
        '</div></div>');
    document.querySelectorAll('.arrow').forEach((arrow) => {
      arrow.addEventListener('click', () => {
        playClick();
        const step = Number(arrow.dataset.step);
        if (arrow.dataset.name === 'golden') {
          changeGolden(step);
          return;
        }
        if (arrow.dataset.name === 'limit') {
          const now = customSetup();
          now.limit = Math.max(1, Math.min(3, now.limit + step));
          writeSave();
          openCustomNight();
          return;
        }
        const levels = customSetup().levels;
        const name = arrow.dataset.name;
        levels[name] = Math.max(0, Math.min(20, levels[name] + step));
        writeSave();
        openCustomNight();
      });
    });
    const setAll = (value) => {
      CUSTOM_MONSTERS.forEach((name) => {
        customSetup().levels[name] = value;
      });
      writeSave();
      openCustomNight();
    };
    document.getElementById('allZero').onclick = () => {
      playClick();
      setAll(0);
    };
    document.getElementById('allMax').onclick = () => {
      playNote(70, 0.6, 'sawtooth', 0.08);
      setAll(20);
    };
    document.getElementById('startCustom').onclick = () => {
      playClick();
      const now = customSetup();
      startNight(CUSTOM_NIGHT, {
        levels: Object.assign({}, now.levels),
        golden: now.golden,
        limit: now.limit,
      });
    };
    const list = document.getElementById('customList');
    list.scrollTop = customScroll;
    list.addEventListener('scroll', () => {
      customScroll = list.scrollTop;
    });
  }

  /** @type {number} Keeps the custom night list where you scrolled it. */
  let customScroll = 0;

  /**
   * Changes Golden Verity's level. Moving him away from normal shows a
   * warning first.
   * @param {number} step +1 or -1.
   */
  function changeGolden(step) {
    const setup = customSetup();
    const next = Math.max(0, Math.min(20, setup.golden + step));
    const apply = () => {
      setup.golden = next;
      writeSave();
      openCustomNight();
    };
    if (setup.golden !== 1 || next === 1) {
      apply();
      return;
    }
    const raising = next > 1;
    showPopup(
        '<div class="panelTitle" style="color:' +
        (raising ? '#ef9f27' : '#b4b2a9') + '">' +
        (raising ? 'RAISING' : 'LOWERING') + ' GOLDEN VERITY</div>' +
        '<div class="infoText" style="text-align:center">' +
        (raising ? 'This night still counts for stars,<br>but NOT for ' +
            'the index.' : 'This night still counts for the index,<br>' +
            'but NOT for stars.') + '</div>' +
        '<div class="spookNote" style="text-align:center">' +
        (raising ? 'Level 20 = 1 in 100 chance' :
            'Level 0 = he never shows up') + '</div>' +
        '<div class="bottomRow">' +
        '<button class="btn" id="goldenNo">Never mind</button>' +
        '<button class="btn" id="goldenYes">' +
        (raising ? 'Raise it' : 'Lower it') + '</button></div>');
    document.getElementById('goldenNo').onclick = () => {
      playClick();
      hidePopup();
    };
    document.getElementById('goldenYes').onclick = () => {
      playClick();
      hidePopup();
      apply();
    };
  }

  // ----- Index -----

  /** Opens the index of every monster you have met. */
  function openIndex() {
    let seen = 0;
    let scared = 0;
    let rows = '';
    MONSTERS.forEach((name) => {
      const entry = save.index[name] || {};
      if (entry.seen) {
        seen++;
      }
      if (entry.scared) {
        scared++;
      }
      const gold = name === 'goldenVerity' ? ' gold' : '';
      rows += '<div class="indexRow' + (entry.seen ? ' known' : '') +
          '" data-name="' + name + '">' +
          (entry.seen ? thumbnail(name, 40) :
              '<span class="unknown' + gold + '">?</span>') +
          '<span class="indexName' + gold + '">' +
          (entry.seen ? MONSTER_INFO[name].name : '???') + '</span>' +
          '<span class="tick seenTick">' + (entry.seen ? '✓' : '-') +
          '</span><span class="tick scareTick">' +
          (entry.scared ? '✓' : '-') + '</span>' +
          '<span class="tick">' + (entry.times || 0) + '</span></div>';
    });
    showPage('<div class="panel wide"><div class="panelTitle">INDEX</div>' +
        '<div class="indexTotals">Seen ' + seen + ' / 16  |  Jumpscared by ' +
        scared + ' / 16</div><div class="indexHead"><span></span>' +
        '<span>Monster</span><span class="tick">Seen</span>' +
        '<span class="tick">Jumpscared</span>' +
        '<span class="tick">Times caught</span></div>' +
        '<div id="indexList">' + rows + '</div>' +
        '<div class="spookNote" style="text-align:center">Click a monster ' +
        'to see how it attacks.</div><div class="bottomRow">' +
        '<button class="btn" id="pageBack">Back</button><span></span>' +
        '</div></div>');
    document.querySelectorAll('.indexRow.known').forEach((row) => {
      row.addEventListener('click', () => {
        playClick();
        showMonsterCard(row.dataset.name);
      });
    });
  }

  /**
   * Shows one monster's picture and how it attacks.
   * @param {string} name Which monster.
   */
  function showMonsterCard(name) {
    const entry = save.index[name] || {};
    showPopup('<div class="panelTitle">' +
        MONSTER_INFO[name].name.toUpperCase() + '</div>' +
        '<div style="text-align:center">' + thumbnail(name, 180) + '</div>' +
        '<div class="infoText" style="text-align:center">' + ATTACKS[name] +
        '</div>' + dodgePanels(name) +
        '<div class="spookNote" style="text-align:center">' +
        'First night: ' + (name === 'goldenVerity' ? 'any night' :
            (MONSTER_INFO[name].intro > 6 ? 'custom night only' :
                MONSTER_INFO[name].intro)) + '  |  Times caught: ' +
        (entry.times || 0) + '</div><div class="bottomRow"><span></span>' +
        '<button class="btn" id="closePopup">Back</button></div>');
    document.getElementById('closePopup').onclick = () => {
      playClick();
      hidePopup();
    };
  }

  /**
   * Two pictures of dodging a monster with the mask: during (it's in
   * your office, seen through the mask) and after (it's gone back).
   * Monsters that never come into the office get none.
   * @param {string} name Which monster.
   * @return {string} HTML markup.
   */
  function dodgePanels(name) {
    const path = MONSTER_INFO[name].path;
    if (!path || path[path.length - 1] !== 'office') {
      return '';
    }
    const start = getCam(path[0]);
    return '<div class="label" style="text-align:center">Dodging it ' +
        'with the mask</div><div class="dodgeRow">' +
        '<div class="dodgePanel">' + drawDodgeScene(name, true) +
        '<div>During: it\'s in your office, but the mask fools it</div>' +
        '</div><div class="dodgePanel">' + drawDodgeScene(name, false) +
        '<div>After: it goes back to CAM ' + start.id + ' (' + start.name +
        ')</div></div></div>';
  }

  /**
   * Draws the middle of the office, with or without the monster in it.
   * @param {string} name Which monster.
   * @param {boolean} during True to show it in the office, seen through
   *     the mask.
   * @return {string} SVG markup.
   */
  function drawDodgeScene(name, during) {
    // Draw the office first, so the monster uses the office's shading.
    const office = drawOffice();
    let inside = '';
    if (during) {
      const spot = SPOTS.office;
      const body = MONSTER_INFO[name].body;
      inside = drawMonster(name, spot.x, body ? spot.y + spot.size * 0.35 :
          spot.y, body ? spot.size * 1.9 : spot.size);
    }
    let art = '<svg viewBox="460 0 680 420" preserveAspectRatio="xMidYMid ' +
        'slice">' + office
        .replace('<g id="spot_office"></g>', '<g>' + inside + '</g>')
        .replace(/ id="spot_\w+"/g, '') +
        '<rect x="460" width="680" height="420" fill="#000" opacity="0.4"/>';
    if (during) {
      art += '<rect class="dodgeFlicker" x="460" width="680" height="420" ' +
          'fill="#000"/><g transform="translate(460 0)"><path ' +
          'fill="#141210" opacity="0.8" fill-rule="evenodd" ' +
          'd="M0 0 H680 V420 H0 Z ' +
          'M280 175 a55 40 0 1 0 0.1 0 Z M400 175 a55 40 0 1 0 0.1 0 Z"/>' +
          '</g>';
    }
    return art + '</svg>';
  }

  // ----- Extras -----

  /**
   * Opens extras.
   * @param {string} tab 'monsters' or 'scares'.
   */
  function openExtras(tab) {
    let body = '';
    if (tab === 'monsters') {
      MONSTERS.forEach((name) => {
        const known = (save.index[name] || {}).seen;
        const gold = name === 'goldenVerity' ? ' gold' : '';
        body += '<div class="galleryCard' + gold + (known ? ' known' : '') +
            '" data-name="' + name + '">' +
            (known ? thumbnail(name, 70) :
                '<span class="unknown big' + gold + '">?</span>') +
            '<div>' + (known ? MONSTER_INFO[name].name : 'Locked') +
            '</div></div>';
      });
    } else {
      const caught = MONSTERS.filter((name) => {
        return (save.index[name] || {}).scared;
      });
      if (!caught.length) {
        body = '<div class="infoText" style="grid-column:1/-1;' +
            'text-align:center">Get caught by a monster to unlock its ' +
            'jump scare here.</div>';
      }
      caught.forEach((name) => {
        body += '<div class="galleryCard known scare" data-name="' + name +
            '">' + thumbnail(name, 70) + '<div>' + MONSTER_INFO[name].name +
            '</div><div class="spookNote">Click to replay</div></div>';
      });
    }
    showPage('<div class="panel wide"><div class="panelTitle">EXTRAS</div>' +
        '<div class="row" style="justify-content:center;margin-bottom:14px">' +
        '<button class="btn' + (tab === 'monsters' ? ' picked' : '') +
        '" id="tabMonsters">Monsters</button>' +
        '<button class="btn' + (tab === 'scares' ? ' picked' : '') +
        '" id="tabScares">Jumpscares</button>' +
        '<button class="btn" id="tabHow">How to play</button></div>' +
        '<div id="gallery">' + body + '</div><div class="bottomRow">' +
        '<button class="btn" id="pageBack">Back</button><span></span>' +
        '</div></div>');
    document.getElementById('tabMonsters').onclick = () => {
      playClick();
      openExtras('monsters');
    };
    document.getElementById('tabScares').onclick = () => {
      playClick();
      openExtras('scares');
    };
    document.getElementById('tabHow').onclick = () => {
      playClick();
      showHowToPlay();
    };
    document.querySelectorAll('.galleryCard.known').forEach((card) => {
      card.addEventListener('click', () => {
        playClick();
        if (card.classList.contains('scare')) {
          replayScare(card.dataset.name);
        } else {
          showMonsterCard(card.dataset.name);
        }
      });
    });
  }

  /**
   * Replays a jump scare in extras, following the spookiness level.
   * @param {string} name Which monster.
   */
  function replayScare(name) {
    const level = save.settings.spookiness;
    const layer = document.getElementById('previewLayer');
    if (level === 'baby') {
      showLocked('Baby mode has no jump scares. Pick another spookiness ' +
          'level in Options to watch them.');
      return;
    }
    layer.innerHTML = level === 'toddler' ? '' :
        scareHtml(name, level === 'manly' ? 'manly' : 'kid');
    layer.classList.toggle('shake', !save.settings.epileptic);
    layer.style.display = 'block';
    playScream();
    window.setTimeout(() => {
      layer.style.display = 'none';
      layer.innerHTML = '';
    }, scareLength(name, level));
  }

  // =====================================================================
  // THE NIGHT (Parts 2 and 3)
  // =====================================================================

  /** @const {number} How wide the office is. The screen shows 680. */
  const WORLD_WIDTH = 1600;

  /** @const {number} How many real seconds one game hour lasts. */
  const HOUR_SECONDS = 60;

  /** @const {number} How long a move chance takes, in milliseconds. */
  const MOVE_CHANCE_MS = 5000;

  /** @const {number} Seconds of mask needed to fool a monster. */
  const MASK_FOOL_SECONDS = 2.5;

  /** @const {number} How big the flashlight circle is, in pixels. */
  const LIGHT_RADIUS = 110;

  /** @const {number} Golden Verity's normal chance: 1 in 2,000. */
  const GOLDEN_CHANCE = 1 / 2000;

  /**
   * Seconds you have to put the mask on once a monster gets in, per night.
   * @const {!Object<number, number>}
   */
  const MASK_GRACE = {1: 6, 2: 5, 3: 4.5, 4: 4, 5: 3.5, 6: 3, 7: 3.5,
    8: 4.5};

  /**
   * How many monsters fit in each spot (the hallway, each vent and your
   * office), per night. Custom night and the sandbox let you choose.
   * @const {!Object<number, number>}
   */
  const SPOT_LIMIT = {1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3};

  /** @const {!Array<string>} Monsters that only come on custom night. */
  const CUSTOM_ONLY = ['curiosity', 'velocity', 'fragility', 'calamity',
    'insanity'];

  /** @const {number} Custom night uses this night number. */
  const CUSTOM_NIGHT = 7;

  /**
   * The name of a night, for the screen.
   * @param {number} number Which night.
   * @return {string}
   */
  function nightName(number) {
    if (number === 8) {
      return 'Sandbox';
    }
    return number === CUSTOM_NIGHT ? 'Custom night' : 'Night ' + number;
  }

  /**
   * Golden Verity's chance to show up, from his custom night level.
   * 0 means never, 1 is normal (1 in 2,000) and 20 is 1 in 100.
   * @param {number} level From 0 to 20.
   * @return {number} A chance from 0 to 1.
   */
  function goldenChance(level) {
    if (level <= 0) {
      return 0;
    }
    return GOLDEN_CHANCE * Math.pow(20, (level - 1) / 19);
  }

  /** @const {!Array<string>} What Manly mode says after a jump scare. */
  const INSULTS = [
    'YOU NEVER STOOD A CHANCE',
    'TOO SLOW',
    'WAS THAT YOUR BEST?',
    'THE TOYS WIN AGAIN',
    'SHOULD HAVE WORN THE MASK',
    'GO BACK TO BABY MODE',
    'NOBODY IS COMING TO SAVE YOU',
    'YOU BLINKED',
  ];

  /**
   * One camera. x, y, w and h place its button on the map, in percent,
   * matching the floor plan.
   * @typedef {{id: string, name: string, kind: string, x: number,
   *     y: number, w: number, h: number}}
   */
  let CameraInfo;

  /** @const {!Array<!CameraInfo>} Every camera in the pizzeria. */
  const CAMERAS = [
    {id: '1', name: 'Show stage', kind: 'stage', x: 35, y: 14, w: 29, h: 14},
    {id: '12', name: 'Back stage', kind: 'back', x: 39, y: 2, w: 22, h: 10},
    {id: '7', name: 'Parts and service', kind: 'parts',
      x: 3, y: 4, w: 19, h: 18},
    {id: '10', name: 'Kids\' cove', kind: 'kids', x: 78, y: 4, w: 19, h: 18},
    {id: '2', name: 'Party room 1', kind: 'party', x: 3, y: 30, w: 22, h: 20},
    {id: '3', name: 'Party room 2', kind: 'party',
      x: 75, y: 30, w: 22, h: 20},
    {id: '8', name: 'Main hall', kind: 'hall', x: 44, y: 31, w: 12, h: 46},
    {id: '4', name: 'Party room 3', kind: 'party', x: 3, y: 57, w: 22, h: 18},
    {id: '9', name: 'Game area', kind: 'game', x: 75, y: 57, w: 22, h: 18},
    {id: '11', name: 'Prize corner', kind: 'prize',
      x: 59, y: 60, w: 14, h: 13},
    {id: '5', name: 'Left vent', kind: 'vent', x: 9, y: 82, w: 28, h: 7},
    {id: '6', name: 'Right vent', kind: 'vent', x: 63, y: 82, w: 28, h: 7},
  ];

  /**
   * Every monster. Walkers follow their path one room at a time. 'hall',
   * 'ventL' and 'ventR' are the spots right by your office.
   *   intro: the night they first show up. 99 means custom night only.
   *   scare: which jump scare they do.
   *   body: drawn with a full body instead of a floating head.
   *   shy: won't move while you watch it.
   *   fast: gets two move chances instead of one.
   *   noisy: knocks things over, which makes the others move sooner.
   *   special: has its own rules instead of walking to your office.
   * @const {!Object<string, !Object>}
   */
  const MONSTER_INFO = {
    toyVerity: {name: 'Toy Verity', intro: 1, scare: 'popUp',
      path: ['1', '8', 'hall', 'office']},
    toyFalsity: {name: 'Toy Falsity', intro: 1, scare: 'popUp',
      path: ['1', '3', '9', '6', 'ventR', 'office']},
    toyLovity: {name: 'Toy Lovity', intro: 2, scare: 'popUp',
      path: ['1', '2', '4', '5', 'ventL', 'office']},
    toyObesity: {name: 'Toy Obesity', intro: 3, scare: 'leap', body: true,
      path: ['1', '2', '8', 'hall', 'office']},
    curiosity: {name: 'Curiosity', intro: 99, scare: 'peek', shy: true,
      path: ['9', '11', '8', 'hall', 'office']},
    brokenVerity: {name: 'Broken Verity', intro: 2, scare: 'swoop',
      path: ['7', '2', '8', 'hall', 'office']},
    brokenFalsity: {name: 'Broken Falsity', intro: 3, scare: 'swoop',
      path: ['7', '2', '4', '5', 'ventL', 'office']},
    velocity: {name: 'Velocity', intro: 99, scare: 'leap', fast: true,
      path: ['10', '3', '8', 'hall', 'office']},
    fragility: {name: 'Fragility', intro: 99, scare: 'crawl',
      path: ['7', '4', '5', 'ventL', 'office']},
    brokenLovity: {name: 'Broken Lovity', intro: 4, scare: 'swoop',
      path: ['10', '3', '9', '6', 'ventR', 'office']},
    brokenObesity: {name: 'Broken Obesity', intro: 5, scare: 'leap',
      body: true, path: ['7', '2', '8', 'hall', 'office']},
    calamity: {name: 'Calamity', intro: 99, scare: 'fall', noisy: true,
      path: ['10', '3', '9', '11', '8', 'hall', 'office']},
    vanity: {name: 'Vanity', intro: 6, scare: 'mirror', special: 'vanity'},
    angrity: {name: 'Angrity', intro: 4, scare: 'leap', special: 'angrity',
      path: ['12', '1', '8', 'hall']},
    insanity: {name: 'Insanity', intro: 99, scare: 'burst',
      special: 'insanity'},
    goldenVerity: {name: 'Golden Verity', intro: 1, scare: 'golden',
      special: 'golden'},
  };

  /**
   * How each monster looks. shades are light, middle and dark. The other
   * settings add their special features.
   * @const {!Object<string, !Object>}
   */
  const LOOKS = {
    toyVerity: {shades: ['#f8e7a8', '#e0bc45', '#8a6e1c'], eye: '#2c2c2a',
      mouth: 'smile', cheeks: '#ed93b1', shine: true, sparkle: true},
    toyFalsity: {shades: ['#a9cdf5', '#3f78cc', '#173c78'], eye: '#0c1a2e',
      mouth: 'frown', shine: true, sparkle: true},
    toyLovity: {shades: ['#f7c3db', '#e07aa8', '#8a2f58'], eye: '#4a1b2c',
      mouth: 'smile', hearts: true, brows: true, shine: true, sparkle: true},
    toyObesity: {shades: ['#f8e7a8', '#d9b440', '#7a6018'], eye: '#2c2c2a',
      shine: true, sparkle: true},
    brokenVerity: {shades: ['#a8924a', '#7d6a2e', '#3a2f12'],
      eye: '#0b0b0b', mouth: 'smile', cracks: true, redEye: true},
    brokenFalsity: {shades: ['#4f6a90', '#2a4166', '#101c30'],
      eye: '#0c1a2e', mouth: 'frown', missing: true},
    brokenLovity: {shades: ['#a87a8e', '#7a4560', '#341626'],
      eye: '#1a0a12', mouth: 'smile', brows: true, peel: true},
    brokenObesity: {shades: ['#9c8a55', '#6e5d2c', '#2e2610'],
      eye: '#0b0b0b', worn: true},
    angrity: {shades: ['#f08a7a', '#b8261f', '#4a0b08'], eye: '#2a0605',
      mouth: 'frown', angry: true, redPupils: true, shine: true},
    curiosity: {shades: ['#b3aee0', '#5e589e', '#211d45'], eye: '#0d0b1e',
      mouth: 'small', sparkle: true, shine: true},
    velocity: {shades: ['#8fe0c0', '#1d9e75', '#04342c'], eye: '#02201a',
      mouth: 'smirk', narrow: true, shine: true},
    fragility: {shades: ['#ffffff', '#d8d3c6', '#7a766c'], eye: '#0b0b0b',
      mouth: 'tiny', cracks: true, cheeks: '#f4c0d1'},
    insanity: {shades: ['#f4f1ea', '#bdb8ad', '#55524b'], eye: '#0b0b0b',
      mouth: 'smile', tears: true, sparkle: true},
    calamity: {shades: ['#e3a070', '#a0582a', '#3e1e0a'], eye: '#160a02',
      mouth: 'zigzag', crooked: true, dents: true},
    vanity: {shades: ['#d8dade', '#8a8d94', '#2e3036'], eye: '#3a5068',
      mirror: true},
    goldenVerity: {shades: ['#fff2b8', '#e6b422', '#6b4a05'],
      eye: '#000000', mouth: 'smile', shine: true},
  };

  /** @const {!Object<string, string>} Mouth shapes, in a 80 by 80 box. */
  const MOUTHS = {
    smile: 'M24 52 Q40 66 56 52',
    frown: 'M24 54 Q40 46 56 54',
    small: 'M32 54 Q40 58 48 54',
    smirk: 'M26 54 Q40 60 54 51',
    tiny: 'M36 54 Q40 57 44 54',
    zigzag: 'M22 54 L30 50 L38 56 L46 50 L54 56 L60 52',
  };

  /** @type {number} How many pictures have their own shading so far. */
  let defsCount = 0;
  /** @type {string} The name of the shading the next drawing uses. */
  let defsId = '';
  /** @type {string} The office's shading name. */
  let officeDefsId = '';

  /** @type {?Object} Everything about the night being played. */
  let night = null;

  /** @type {number} Where the mouse is, in screen pixels. */
  let mouseX = 0;
  /** @type {number} */
  let mouseY = 0;
  /** @type {boolean} True while the mouse button is held. */
  let mouseDown = false;
  /** @type {!Object<string, boolean>} Keys being held. */
  const keysDown = {};
  /** @type {boolean} The tester code "golden" makes him show up next. */
  let forceGolden = false;

  // ---------------------------------------------------------------------
  // Drawing the monsters
  // ---------------------------------------------------------------------

  /**
   * The shading for every monster, used inside each SVG.
   * @return {string} SVG defs.
   */
  function monsterDefs() {
    // Every picture gets its own copy of the shading, with its own name.
    // If pictures shared one copy, hiding the picture that holds it would
    // make all the others go invisible.
    defsCount++;
    defsId = 'm' + defsCount + '_';
    let defs = '<defs>';
    Object.keys(LOOKS).forEach((name) => {
      const shades = LOOKS[name].shades;
      defs += '<radialGradient id="' + defsId + name + '" cx="35%" cy="30%" ' +
          'r="75%"><stop offset="0" stop-color="' + shades[0] + '"/>' +
          '<stop offset="0.55" stop-color="' + shades[1] + '"/>' +
          '<stop offset="1" stop-color="' + shades[2] + '"/>' +
          '</radialGradient>';
    });
    defs += '<radialGradient id="' + defsId + 'mirror" cx="40%" ' +
        'cy="35%" r="70%">' +
        '<stop offset="0" stop-color="#e6f1fb"/>' +
        '<stop offset="0.6" stop-color="#8fb0cc"/>' +
        '<stop offset="1" stop-color="#3a5068"/></radialGradient>';
    return defs + '</defs>';
  }

  /**
   * Draws a monster's round head, in an 80 by 80 box.
   * @param {string} name Which monster.
   * @param {boolean|string} open True to draw the jaw wide open (jump
   *     scares), or 'scary' for Manly mode's scary face.
   * @return {string} SVG markup.
   */
  function drawFace(name, open) {
    const look = LOOKS[name];
    const eye = look.eye;
    let art = '<circle cx="40" cy="40" r="34" fill="url(#' + defsId + name +
        ')"/>';
    if (look.mirror) {
      return art + '<ellipse cx="40" cy="42" rx="22" ry="27" ' +
          'fill="#2c2c2a"/><ellipse cx="40" cy="42" rx="19" ry="24" ' +
          'fill="url(#' + defsId + 'mirror)"/><path d="M28 26 L36 40" ' +
          'stroke="#ffffff" stroke-width="2" opacity="0.6"/>' +
          '<ellipse cx="34" cy="38" rx="3" ry="4" fill="' + eye +
          '" opacity="0.6"/><ellipse cx="46" cy="38" rx="3" ry="4" fill="' +
          eye + '" opacity="0.6"/><path d="M48 30 L52 42 L46 50" ' +
          'stroke="#1a1a1a" stroke-width="0.8" fill="none"/>';
    }
    if (look.shine) {
      art += '<ellipse cx="26" cy="18" rx="10" ry="5" fill="#ffffff" ' +
          'opacity="0.35" transform="rotate(-25 26 18)"/>';
    }
    if (look.cheeks) {
      art += '<circle cx="18" cy="48" r="5" fill="' + look.cheeks +
          '" opacity="0.55"/><circle cx="62" cy="48" r="5" fill="' +
          look.cheeks + '" opacity="0.55"/>';
    }
    if (look.hearts) {
      const heart = (x) => '<path d="M' + x + ' 46 c0-3 4-3 4 0 c0-3 4-3 ' +
          '4 0 c0 3-4 5-4 7 c0-2-4-4-4-7 Z" fill="#fbeaf0" opacity="0.9"/>';
      art += heart(14) + heart(58);
    }
    if (look.peel) {
      art += '<g fill="#d9c7bb" opacity="0.45"><ellipse cx="22" cy="18" ' +
          'rx="6" ry="4"/><ellipse cx="60" cy="58" rx="5" ry="6"/>' +
          '<ellipse cx="14" cy="46" rx="3" ry="5"/></g>';
    }
    if (look.dents) {
      art += '<g fill="#3e1e0a" opacity="0.5"><ellipse cx="16" cy="24" ' +
          'rx="6" ry="4"/><ellipse cx="64" cy="50" rx="5" ry="6"/></g>';
    }
    // Eyes.
    const scary = open === 'scary';
    if (scary) {
      art += scaryEyes(28, 52, 33, 8, look);
    } else if (look.narrow) {
      art += '<ellipse cx="28" cy="35" rx="6" ry="3.5" fill="' + eye +
          '"/><ellipse cx="52" cy="35" rx="6" ry="3.5" fill="' + eye + '"/>';
    } else if (look.crooked) {
      art += '<ellipse cx="27" cy="36" rx="6" ry="5" fill="' + eye +
          '" transform="rotate(20 27 36)"/><ellipse cx="53" cy="32" ' +
          'rx="5" ry="7" fill="' + eye + '"/>';
    } else if (look.angry) {
      art += '<path d="M18 22 L34 30 M62 22 L46 30" stroke="' + eye +
          '" stroke-width="4" stroke-linecap="round"/>' +
          '<circle cx="28" cy="36" r="5" fill="' + eye + '"/>' +
          '<circle cx="52" cy="36" r="5" fill="' + eye + '"/>';
    } else {
      art += '<ellipse cx="28" cy="34" rx="6" ry="8" fill="' + eye + '"/>' +
          '<ellipse cx="52" cy="34" rx="6" ry="8" fill="' + eye + '"/>';
    }
    if (look.brows && !scary) {
      art += '<path d="M22 28 L32 24 M58 28 L48 24" stroke="' + eye +
          '" stroke-width="3" stroke-linecap="round"/>';
    }
    if (look.sparkle && !scary) {
      art += '<circle cx="30" cy="31" r="2" fill="#ffffff"/>' +
          '<circle cx="54" cy="31" r="2" fill="#ffffff"/>';
    }
    if (look.redEye && !scary) {
      art += '<circle cx="52" cy="35" r="2" fill="#ff3b30"/>';
    }
    if (look.redPupils && !scary) {
      art += '<circle cx="28" cy="36" r="2" fill="#ff5a4a"/>' +
          '<circle cx="52" cy="36" r="2" fill="#ff5a4a"/>';
    }
    if (look.tears) {
      art += '<path d="M28 42 L27 56 M52 42 L53 56" stroke="#55524b" ' +
          'stroke-width="1.5"/>';
    }
    // Mouth.
    if (scary) {
      art += scaryTeeth(20, 60, 50, 66) + scaryBlood(28, 52, 42, 20, 60, 56);
    } else if (open) {
      let teeth = '';
      for (let i = 0; i < 7; i++) {
        const x = 26 + i * 4.2;
        teeth += '<polygon points="' + x + ',50 ' + (x + 3.6) + ',50 ' +
            (x + 1.8) + ',56" fill="#ece6d6"/>';
      }
      art += '<ellipse cx="40" cy="58" rx="16" ry="11" fill="#0b0405"/>' +
          '<g class="jaw">' + teeth + '</g>';
    } else if (look.mouth) {
      art += '<path d="' + MOUTHS[look.mouth] + '" stroke="' + eye +
          '" stroke-width="' + (look.mouth === 'zigzag' ? 3 : 4) +
          '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    if (look.cracks) {
      art += '<g stroke="#1a1408" stroke-width="1.1" fill="none">' +
          '<path d="M30 7 L36 22 L28 30"/><path d="M58 60 L64 52 L70 56"/>' +
          '<path d="M14 52 L24 56 L22 66"/></g>';
    }
    if (look.missing) {
      art += '<path d="M6 40 A34 34 0 0 1 24 10 L30 26 L20 40 L28 54 ' +
          'L18 66 A34 34 0 0 1 6 40 Z" fill="#050505"/>' +
          '<g stroke-width="1" fill="none"><path d="M14 30 Q20 36 16 44" ' +
          'stroke="#ba7517"/><path d="M18 46 Q24 52 20 60" ' +
          'stroke="#e24b4a"/><path d="M12 38 Q18 40 22 36" ' +
          'stroke="#378add"/></g>';
    }
    return art;
  }

  /**
   * Draws Obesity's blob body (toy or broken), in a 120 by 160 box.
   * @param {string} name 'toyObesity' or 'brokenObesity'.
   * @param {boolean|string} open True to draw his mouth wide open, or
   *     'scary' for Manly mode's scary face.
   * @return {string} SVG markup.
   */
  function drawBody(name, open) {
    const look = LOOKS[name];
    const fold = look.worn ? '#2e2610' : '#7a6220';
    let art = '<ellipse cx="42" cy="153" rx="13" ry="5" fill="' + fold +
        '"/><ellipse cx="78" cy="153" rx="13" ry="5" fill="' + fold + '"/>' +
        '<ellipse cx="14" cy="104" rx="8" ry="34" fill="url(#' + defsId +
        name + ')" transform="rotate(10 14 104)"/>' +
        '<ellipse cx="106" cy="104" rx="8" ry="34" fill="url(#' + defsId +
        name + ')" transform="rotate(-10 106 104)"/>' +
        '<path d="M60 26 C34 26 26 46 27 62 C8 80 4 122 17 140 C30 157 90 ' +
        '157 103 140 C116 122 112 80 93 62 C94 46 86 26 60 26 Z" ' +
        'fill="url(#' + defsId + name + ')"/>' +
        '<g fill="none" stroke="' + fold + '" stroke-linecap="round" ' +
        'opacity="0.5"><path d="M27 74 Q60 84 93 74" stroke-width="2.5"/>' +
        '<path d="M30 88 Q44 98 57 90" stroke-width="3"/>' +
        '<path d="M63 90 Q76 98 90 88" stroke-width="3"/>' +
        '<path d="M22 113 Q60 129 98 113" stroke-width="3.5"/>' +
        '<path d="M24 134 Q60 150 96 134" stroke-width="3"/></g>' +
        '<ellipse cx="60" cy="128" rx="2.2" ry="1.4" fill="#1a1408"/>';
    if (look.shine) {
      art += '<ellipse cx="46" cy="36" rx="14" ry="6" fill="#ffffff" ' +
          'opacity="0.4"/>';
    }
    if (look.worn) {
      art += '<ellipse cx="38" cy="120" rx="9" ry="6" fill="#2e2610" ' +
          'opacity="0.5"/><path d="M70 30 L66 42 L72 50" stroke="#1a1408" ' +
          'stroke-width="1.2" fill="none"/>';
    }
    if (open === 'scary') {
      return art + scaryEyes(48, 73, 45, 7, look) +
          scaryTeeth(44, 76, 58, 70) + scaryBlood(48, 73, 53, 44, 76, 62);
    }
    art += '<ellipse cx="48" cy="46" rx="5" ry="6.5" fill="' + look.eye +
        '"/><ellipse cx="73" cy="46" rx="5" ry="6.5" fill="' + look.eye +
        '"/>';
    if (look.sparkle) {
      art += '<circle cx="49.8" cy="43.4" r="1.6" fill="#ffffff"/>' +
          '<circle cx="74.8" cy="43.4" r="1.6" fill="#ffffff"/>';
    }
    if (open) {
      art += '<ellipse cx="60" cy="64" rx="15" ry="9" fill="#0b0405"/>' +
          '<path class="jaw" d="M47 60 L50 66 L53 60 L56 66 L59 60 L62 66 ' +
          'L65 60 L68 66 L71 60 Z" fill="#ece6d6"/>';
    } else {
      art += '<path d="M52 60 Q60 66 68 60" stroke="' + look.eye +
          '" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    }
    return art;
  }

  /**
   * Manly mode's eyes: big, hollow, slanted holes with a tiny glint.
   * @param {number} leftX Middle of the left eye.
   * @param {number} rightX Middle of the right eye.
   * @param {number} y Middle of the eyes.
   * @param {number} size How big the eyes are.
   * @param {!Object} look The monster's look, for red eyes.
   * @return {string} SVG markup.
   */
  function scaryEyes(leftX, rightX, y, size, look) {
    const glint = (x, red) => '<circle cx="' + x + '" cy="' + (y + 2) +
        '" r="' + (size * 0.16) + '" fill="' + (red ? '#ff3b30' : '#ffffff') +
        '" opacity="0.7"/>';
    return '<ellipse cx="' + leftX + '" cy="' + y + '" rx="' + size +
        '" ry="' + (size * 1.25) + '" fill="#020203" transform="rotate(-14 ' +
        leftX + ' ' + y + ')"/><ellipse cx="' + rightX + '" cy="' + y +
        '" rx="' + size + '" ry="' + (size * 1.25) + '" fill="#020203" ' +
        'transform="rotate(14 ' + rightX + ' ' + y + ')"/>' +
        glint(leftX + 1, look.redPupils) +
        glint(rightX - 1, look.redEye || look.redPupils);
  }

  /**
   * Manly mode's grin: two rows of sharp teeth, with no mouth hole.
   * @param {number} left Left end of the grin.
   * @param {number} right Right end of the grin.
   * @param {number} top Where the top teeth start.
   * @param {number} bottom Where the bottom teeth start.
   * @return {string} SVG markup.
   */
  function scaryTeeth(left, right, top, bottom) {
    const count = 9;
    const width = (right - left) / count;
    const gap = bottom - top;
    let teeth = '<g class="jaw">';
    for (let i = 0; i < count; i++) {
      const x = left + i * width;
      // The middle teeth hang lower, so the grin curves.
      const sag = (1 - Math.abs(i - (count - 1) / 2) / count) * gap * 0.3;
      teeth += '<polygon points="' + x + ',' + (top + sag) + ' ' +
          (x + width) + ',' + (top + sag) + ' ' + (x + width / 2) + ',' +
          (top + sag + gap * 0.55) + '" fill="#ece6d6" stroke="#b0a588" ' +
          'stroke-width="0.3"/><polygon points="' + x + ',' + (bottom + sag) +
          ' ' + (x + width) + ',' + (bottom + sag) + ' ' + (x + width / 2) +
          ',' + (bottom + sag - gap * 0.45) + '" fill="#e0d9c6" ' +
          'stroke="#b0a588" stroke-width="0.3"/>';
    }
    return teeth + '</g>';
  }

  /**
   * A little blood from the eyes and the corners of the grin.
   * @param {number} leftEye Left eye's middle.
   * @param {number} rightEye Right eye's middle.
   * @param {number} eyeBottom Bottom of the eyes.
   * @param {number} mouthLeft Left corner of the grin.
   * @param {number} mouthRight Right corner of the grin.
   * @param {number} mouthY Height of the grin's corners.
   * @return {string} SVG markup.
   */
  function scaryBlood(leftEye, rightEye, eyeBottom, mouthLeft, mouthRight,
      mouthY) {
    const drip = (x, y, length) => '<path d="M' + x + ' ' + y + ' q-0.5 ' +
        (length / 2) + ' 0 ' + length + '" stroke="#7a0b0b" ' +
        'stroke-width="1.6" stroke-linecap="round" fill="none"/>';
    return drip(leftEye, eyeBottom, 8) + drip(rightEye, eyeBottom, 6) +
        drip(mouthLeft, mouthY, 6) + drip(mouthRight, mouthY, 5);
  }

  /**
   * Draws any monster centered on a spot.
   * @param {string} name Which monster.
   * @param {number} x Middle.
   * @param {number} y Middle.
   * @param {number} size How tall it is.
   * @param {string=} extra Extra attributes for the group.
   * @return {string} SVG markup.
   */
  function drawMonster(name, x, y, size, extra) {
    const info = MONSTER_INFO[name];
    if (info.body) {
      const scale = size / 160;
      return '<g ' + (extra || '') + ' transform="translate(' +
          (x - 60 * scale) + ' ' + (y - 80 * scale) + ') scale(' + scale +
          ')">' + drawBody(name, false) + '</g>';
    }
    const scale = size / 68;
    let art = '<g ' + (extra || '') + ' transform="translate(' +
        (x - 40 * scale) + ' ' + (y - 40 * scale) + ') scale(' + scale +
        ')">';
    if (name === 'angrity') {
      art += '<path d="M14 70 Q40 62 66 70 L72 92 L8 92 Z" fill="#6e120d"/>';
    }
    if (name === 'velocity') {
      art += '<g stroke="#1d9e75" stroke-width="2" opacity="0.6">' +
          '<line x1="-8" y1="26" x2="6" y2="26"/>' +
          '<line x1="-12" y1="40" x2="6" y2="40"/>' +
          '<line x1="-6" y1="54" x2="6" y2="54"/></g>';
    }
    return art + drawFace(name, false) + '</g>';
  }

  /**
   * A monster's own jump scare picture. Manly mode uses the same one,
   * with the scary face.
   * @param {string} name Which monster.
   * @param {boolean=} scary True for Manly mode's scary face.
   * @return {string} SVG markup.
   */
  function drawKidScare(name, scary) {
    const mouth = scary ? 'scary' : true;
    const open = '<svg viewBox="0 0 80 80" preserveAspectRatio="xMidYMid ' +
        'meet">' + monsterDefs();
    if (MONSTER_INFO[name].body) {
      return '<svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid ' +
          'meet">' + monsterDefs() + '<g transform="translate(0 -10)">' +
          drawBody(name, mouth) + '</g></svg>';
    }
    if (name === 'insanity') {
      return open + '<rect x="6" y="56" width="68" height="26" ' +
          'fill="#2a1f12" stroke="#5a3d10"/><rect x="36" y="56" width="8" ' +
          'height="26" fill="#854f0b"/><g transform="translate(4 -6) ' +
          'scale(0.9)">' + drawFace(name, mouth) + '</g></svg>';
    }
    if (name === 'vanity') {
      // It shows you yourself first, then it cracks.
      return open + drawFace(name, false) +
          '<g class="reflection"><ellipse cx="40" cy="38" rx="7" ry="9" ' +
          'fill="#1a1a1a"/><path d="M28 64 Q40 50 52 64 Z" ' +
          'fill="#1a1a1a"/></g><g class="crack" stroke="#0b0b0b" ' +
          'stroke-width="1.2" fill="none"><path d="M40 18 L36 34 L44 42 ' +
          'L38 56 L42 68"/><path d="M36 34 L24 36 M44 42 L56 40 M38 56 ' +
          'L28 60"/></g>' + (scary ? '<g class="crack">' +
          scaryBlood(34, 46, 42, 36, 44, 62) + '</g>' : '') + '</svg>';
    }
    if (name === 'goldenVerity') {
      return drawGoldenScare();
    }
    let art = open;
    if (name === 'angrity') {
      art += '<path d="M6 76 Q40 64 74 76 L80 80 L0 80 Z" fill="#6e120d"/>';
    }
    return art + drawFace(name, mouth) + '</svg>';
  }

  /**
   * Golden Verity's leap: a stretched gold face and a body with arms out.
   * @return {string} SVG markup.
   */
  function drawGoldenScare() {
    let teeth = '';
    for (let i = 0; i < 10; i++) {
      const x = 50 + i * 24;
      teeth += '<polygon points="' + x + ',' + (138 + Math.abs(i - 4.5) *
          -2) + ' ' + (x + 18) + ',' + (140 + Math.abs(i - 4.5) * -2) +
          ' ' + (x + 9) + ',' + (176 - Math.abs(i - 4.5) * 3) +
          '" fill="#f1efe8"/>';
    }
    return '<svg viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet">' +
        monsterDefs() +
        '<path d="M60 320 L100 230 L240 230 L280 320 Z" fill="#633806"/>' +
        '<path d="M100 240 L10 170 L0 210 L80 270 Z" fill="#854f0b"/>' +
        '<path d="M240 240 L330 170 L340 210 L260 270 Z" fill="#854f0b"/>' +
        '<ellipse cx="170" cy="130" rx="168" ry="110" ' +
        'fill="url(#' + defsId + 'goldenVerity)"/>' +
        '<ellipse cx="112" cy="78" rx="26" ry="32" fill="#000" ' +
        'transform="rotate(-14 112 78)"/>' +
        '<ellipse cx="228" cy="78" rx="26" ry="32" fill="#000" ' +
        'transform="rotate(14 228 78)"/>' +
        '<path d="M26 125 Q170 170 314 125 Q306 230 170 234 Q34 230 26 125 ' +
        'Z" fill="#412402"/><path d="M36 130 Q170 170 304 130 Q296 222 170 ' +
        '226 Q44 222 36 130 Z" fill="#1a0e04"/>' + teeth + '</svg>';
  }

  // ---------------------------------------------------------------------
  // Drawing the office and rooms
  // ---------------------------------------------------------------------

  /** @const {!Object<string, {x: number, y: number, size: number}>} */
  const SPOTS = {
    hall: {x: 800, y: 190, size: 46},
    ventL: {x: 190, y: 305, size: 70},
    ventR: {x: 1410, y: 305, size: 70},
    office: {x: 800, y: 215, size: 230},
  };

  /**
   * Draws the office: the long hallway in the middle, a vent on each
   * side and the desk in front. It is 1600 wide; you see 680 at a time.
   * @return {string} SVG markup.
   */
  function drawOffice() {
    let tiles = '';
    for (let x = 0; x < WORLD_WIDTH; x += 40) {
      tiles += '<rect x="' + x + '" y="330" width="20" height="90" ' +
          'fill="#161616"/>';
    }
    return monsterDefs() +
      '<rect width="1600" height="420" fill="#121212"/>' +
      '<rect y="330" width="1600" height="90" fill="#1c1c1c"/>' + tiles +
      '<rect y="320" width="1600" height="10" fill="#242424"/>' +
      '<rect x="420" y="70" width="90" height="120" fill="#1d1a16" ' +
      'stroke="#2c2620"/>' +
      '<circle cx="465" cy="115" r="26" fill="#3a3118"/>' +
      '<text x="465" y="175" text-anchor="middle" fill="#3a3530" ' +
      'font-size="11">CELEBRATE</text>' +
      '<rect x="1090" y="80" width="80" height="100" fill="#1a1d22" ' +
      'stroke="#262a30"/>' +
      '<circle cx="1130" cy="120" r="22" fill="#1c2a40"/>' +
      '<path d="M360 40 L400 60 L440 40 L480 60 L520 40" stroke="#2a2420" ' +
      'stroke-width="3" fill="none"/>' +
      '<path d="M1080 40 L1120 60 L1160 40 L1200 60 L1240 40" ' +
      'stroke="#2a2420" stroke-width="3" fill="none"/>' +
      '<polygon points="620,40 980,40 980,330 620,330" fill="#0a0a0a"/>' +
      '<polygon points="620,40 700,110 700,260 620,330" fill="#161616"/>' +
      '<polygon points="980,40 900,110 900,260 980,330" fill="#161616"/>' +
      '<polygon points="620,330 700,260 900,260 980,330" fill="#1a1a1a"/>' +
      '<polygon points="700,110 900,110 900,260 700,260" fill="#0d0d0d"/>' +
      '<polygon points="745,140 855,140 855,230 745,230" fill="#070707"/>' +
      '<polygon points="770,158 830,158 830,212 770,212" fill="#030303"/>' +
      '<rect x="610" y="30" width="380" height="12" fill="#262626"/>' +
      '<rect x="610" y="30" width="12" height="300" fill="#262626"/>' +
      '<rect x="978" y="30" width="12" height="300" fill="#262626"/>' +
      '<rect x="70" y="230" width="240" height="140" rx="4" ' +
      'fill="#1d1d1d" stroke="#333331"/>' +
      '<rect x="90" y="250" width="200" height="100" fill="#050505"/>' +
      '<rect x="1290" y="230" width="240" height="140" rx="4" ' +
      'fill="#1d1d1d" stroke="#333331"/>' +
      '<rect x="1310" y="250" width="200" height="100" fill="#050505"/>' +
      '<g stroke="#2a2a2a" stroke-width="3">' +
      '<line x1="90" y1="250" x2="290" y2="250"/>' +
      '<line x1="1310" y1="250" x2="1510" y2="250"/></g>' +
      '<g id="spot_hall"></g><g id="spot_ventL"></g><g id="spot_ventR"></g>' +
      '<g id="spot_office"></g>' +
      '<rect x="540" y="350" width="520" height="70" fill="#231d17"/>' +
      '<rect x="540" y="342" width="520" height="12" fill="#2e261e"/>' +
      '<rect x="600" y="320" width="60" height="26" fill="#2a2a2a"/>' +
      '<rect x="606" y="324" width="48" height="16" fill="#0d1a14"/>' +
      '<circle cx="980" cy="318" r="24" fill="none" stroke="#333" ' +
      'stroke-width="3"/>' +
      '<rect x="976" y="340" width="8" height="8" fill="#333"/>' +
      '<rect x="760" y="334" width="70" height="10" fill="#3a3530" ' +
      'transform="rotate(-4 795 339)"/>' +
      '<rect x="850" y="330" width="16" height="14" fill="#1f2a3a"/>';
  }

  /**
   * Draws one camera room, with any monsters in it.
   * @param {!CameraInfo} cam The camera.
   * @param {!Array<string>} here Monsters in this room.
   * @return {string} SVG markup.
   */
  function drawRoom(cam, here) {
    const kind = cam.kind;
    let art = monsterDefs() +
        '<rect width="680" height="420" fill="#101010"/>' +
        '<rect width="680" height="260" fill="#151515"/>' +
        '<rect y="260" width="680" height="160" fill="#0e0e0e"/>';
    // A checkered floor and a dim ceiling lamp make every room feel real.
    if (kind !== 'vent') {
      for (let x = 0; x < 680; x += 40) {
        art += '<rect x="' + x + '" y="' + (x % 80 === 0 ? 260 : 300) +
            '" width="40" height="40" fill="#141414"/>' +
            '<rect x="' + x + '" y="' + (x % 80 === 0 ? 340 : 380) +
            '" width="40" height="40" fill="#141414"/>';
      }
      art += '<rect x="330" y="0" width="20" height="10" fill="#2a2a2a"/>' +
          '<polygon points="320,10 360,10 480,420 200,420" fill="#fac775" ' +
          'opacity="0.03"/>' +
          '<ellipse cx="120" cy="200" rx="30" ry="50" fill="#0b0b0b" ' +
          'opacity="0.5"/>';
    }
    if (kind === 'stage') {
      art += '<rect x="60" y="40" width="560" height="190" fill="#0a0a0a"/>' +
          '<path d="M40 30 Q70 130 50 240 L100 240 Q120 120 90 30 Z" ' +
          'fill="#3a0e12"/><path d="M640 30 Q610 130 630 240 L580 240 ' +
          'Q560 120 590 30 Z" fill="#3a0e12"/>' +
          '<path d="M40 30 L640 30 L640 50 Q340 70 40 50 Z" fill="#4a1216"/>' +
          '<g fill="#24201a"><path d="M150 70 L180 90 L210 70 Z"/>' +
          '<path d="M230 72 L260 92 L290 72 Z"/><path d="M310 74 L340 94 ' +
          'L370 74 Z"/><path d="M390 72 L420 92 L450 72 Z"/>' +
          '<path d="M470 70 L500 90 L530 70 Z"/></g>' +
          '<rect x="50" y="230" width="580" height="30" fill="#2a2018"/>' +
          '<ellipse cx="140" cy="330" rx="90" ry="22" fill="#1a1a1a"/>' +
          '<ellipse cx="540" cy="330" rx="90" ry="22" fill="#1a1a1a"/>';
    } else if (kind === 'party') {
      art += '<path d="M60 50 L100 70 L140 50 L180 70 L220 50 L260 70 L300 ' +
          '50 L340 70 L380 50 L420 70 L460 50 L500 70 L540 50 L580 70 ' +
          'L620 50" stroke="#2a2420" stroke-width="3" fill="none"/>' +
          '<rect x="240" y="90" width="200" height="34" fill="#1a1612"/>' +
          '<text x="340" y="113" text-anchor="middle" fill="#3a3028" ' +
          'font-size="14">HAPPY BIRTHDAY</text>' +
          '<rect x="80" y="280" width="220" height="16" fill="#1d1a16"/>' +
          '<rect x="380" y="300" width="220" height="16" fill="#1d1a16"/>' +
          '<path d="M120 280 L130 260 L140 280 Z M200 280 L210 260 L220 280' +
          ' Z M440 300 L450 280 L460 300 Z" fill="#2a2018"/>' +
          '<line x1="560" y1="300" x2="570" y2="230" stroke="#2c2c2a"/>' +
          '<circle cx="572" cy="222" r="12" fill="#2a1418"/>';
    } else if (kind === 'hall') {
      art += '<polygon points="200,0 480,0 400,260 280,260" fill="#0b0b0b"/>' +
          '<polygon points="280,260 400,260 520,420 160,420" ' +
          'fill="#161616"/>' +
          '<rect x="140" y="60" width="50" height="70" fill="#1d1a16"/>' +
          '<rect x="490" y="80" width="50" height="70" fill="#1a1d22"/>' +
          '<rect x="60" y="150" width="20" height="90" fill="#1d1a16"/>';
    } else if (kind === 'vent') {
      art += '<polygon points="0,0 680,0 480,140 200,140" fill="#1a1a1a"/>' +
          '<polygon points="0,420 680,420 480,280 200,280" fill="#1a1a1a"/>' +
          '<rect x="200" y="140" width="280" height="140" fill="#050505"/>' +
          '<g stroke="#262626" stroke-width="2"><line x1="0" y1="0" ' +
          'x2="200" y2="140"/><line x1="680" y1="0" x2="480" y2="140"/>' +
          '<line x1="0" y1="420" x2="200" y2="280"/><line x1="680" ' +
          'y1="420" x2="480" y2="280"/></g>';
    } else if (kind === 'prize') {
      const open = night.insanityOut ? 40 : (100 - night.music) * 0.25;
      const glow = night.insanityOut ? 1 : 0.2 + (100 - night.music) / 120;
      art += '<rect x="30" y="60" width="300" height="7" fill="#2a241c"/>' +
          '<rect x="30" y="125" width="300" height="7" fill="#2a241c"/>' +
          '<g fill="#24221f"><circle cx="60" cy="46" r="13"/>' +
          '<rect x="85" y="32" width="24" height="28"/>' +
          '<circle cx="135" cy="44" r="15"/><circle cx="210" cy="46" r="13"/>' +
          '<circle cx="100" cy="110" r="14"/><circle cx="240" cy="110" ' +
          'r="14"/></g>' +
          '<rect x="370" y="180" width="290" height="90" fill="#1d1a16"/>' +
          '<rect x="380" y="40" width="260" height="40" fill="#1a1410" ' +
          'stroke="#412402"/><text x="510" y="66" text-anchor="middle" ' +
          'fill="#5a3d10" font-size="18">PRIZES</text>' +
          '<ellipse cx="200" cy="330" rx="150" ry="40" fill="#1a1216"/>' +
          '<rect x="140" y="230" width="120" height="100" fill="#2a1f12" ' +
          'stroke="#5a3d10"/>' +
          '<rect x="192" y="230" width="16" height="100" fill="#854f0b"/>' +
          '<path d="M130 ' + (230 - open) + ' L270 ' + (230 - open * 0.6) +
          ' L270 222 L130 222 Z" fill="#3a2a16"/>' +
          '<circle cx="182" cy="226" r="1.6" fill="#d3d1c7" opacity="' +
          glow + '"/><circle cx="218" cy="226" r="1.6" fill="#d3d1c7" ' +
          'opacity="' + glow + '"/>';
      if (night.insanityOut) {
        art += '<text x="200" y="370" text-anchor="middle" ' +
            'fill="#ef9f27" font-size="14">THE BOX IS EMPTY</text>';
      }
    } else if (kind === 'game') {
      for (let i = 0; i < 4; i++) {
        art += '<rect x="' + (70 + i * 150) + '" y="110" width="80" ' +
            'height="170" fill="#1a1a1a" stroke="#262626"/>' +
            '<rect x="' + (80 + i * 150) + '" y="125" width="60" ' +
            'height="45" fill="#0a1410"/><circle cx="' + (95 + i * 150) +
            '" cy="200" r="5" fill="#2a1418"/>';
      }
    } else if (kind === 'kids') {
      art += '<circle cx="140" cy="330" r="16" fill="#2a1418"/>' +
          '<rect x="220" y="320" width="30" height="20" fill="#1f2a3a"/>' +
          '<circle cx="400" cy="340" r="12" fill="#3a3118"/>' +
          '<rect x="480" y="310" width="40" height="30" fill="#1d1a16"/>' +
          '<path d="M60 80 h560" stroke="#2a2420" stroke-width="3"/>' +
          '<circle cx="300" cy="360" r="10" fill="#26241f"/>' +
          '<rect x="560" y="330" width="40" height="14" fill="#26241f" ' +
          'transform="rotate(20 580 337)"/>';
    } else if (kind === 'parts') {
      art += '<rect x="60" y="60" width="560" height="8" fill="#2a2a28"/>' +
          '<rect x="60" y="150" width="560" height="8" fill="#2a2a28"/>' +
          '<circle cx="140" cy="40" r="18" fill="#26241f"/>' +
          '<circle cx="300" cy="130" r="18" fill="#26241f"/>' +
          '<circle cx="470" cy="130" r="16" fill="#26241f"/>' +
          '<rect x="200" y="260" width="280" height="60" fill="#1d1a16"/>' +
          '<path d="M220 260 L260 230 M300 260 L330 236" stroke="#2c2c2a" ' +
          'stroke-width="3"/>';
    } else if (kind === 'back') {
      for (let i = 0; i < 6; i++) {
        art += '<circle cx="' + (90 + i * 100) + '" cy="100" r="26" ' +
            'fill="#1f1d1a"/><circle cx="' + (82 + i * 100) + '" cy="96" ' +
            'r="4" fill="#0b0b0b"/><circle cx="' + (98 + i * 100) +
            '" cy="96" r="4" fill="#0b0b0b"/>';
      }
      art += '<rect x="40" y="130" width="600" height="8" fill="#2a2a28"/>';
    }
    here.forEach((name, i) => {
      const spotX = kind === 'stage' ? 160 + i * 130 : 220 + i * 140;
      const spotY = kind === 'vent' ? 210 : 175;
      const size = MONSTER_INFO[name].body ? 200 :
          (kind === 'vent' ? 110 : 130);
      art += drawMonster(name, spotX, spotY, size);
    });
    if (night.vanity.cam === cam.id) {
      art += drawMonster('vanity', 520, 170, 150);
    }
    return art;
  }

  /** Builds the camera map buttons. */
  function buildCamMap() {
    const map = document.getElementById('camMap');
    map.innerHTML = '';
    CAMERAS.forEach((cam) => {
      const button = document.createElement('div');
      button.className = 'mapRoom';
      button.id = 'map_' + cam.id;
      button.textContent = 'CAM ' + cam.id;
      button.style.left = cam.x + '%';
      button.style.top = cam.y + '%';
      button.style.width = cam.w + '%';
      button.style.height = cam.h + '%';
      button.addEventListener('mousedown', (event) => {
        event.stopPropagation();
        switchCamera(cam.id);
      });
      map.appendChild(button);
    });
    const you = document.createElement('div');
    you.className = 'mapRoom you';
    you.textContent = 'YOU';
    you.style.left = '43%';
    you.style.top = '83%';
    you.style.width = '14%';
    you.style.height = '15%';
    map.appendChild(you);
  }

  /**
   * Finds a camera by its number.
   * @param {string} id The camera number.
   * @return {!CameraInfo}
   */
  function getCam(id) {
    return CAMERAS.find((cam) => cam.id === id);
  }

  /**
   * Marks a monster as seen in the index.
   * @param {string} name The monster.
   */
  function markSeen(name) {
    if (night && night.noIndex) {
      return;
    }
    const entry = save.index[name] || {seen: false, scared: false, times: 0};
    if (!entry.seen) {
      entry.seen = true;
      save.index[name] = entry;
      writeSave();
    }
  }

  // ---------------------------------------------------------------------
  // Running a night
  // ---------------------------------------------------------------------

  /**
   * How active a monster is on a night, from 0 (asleep) to 20.
   * @param {string} name The monster.
   * @param {number} number Which night.
   * @return {number}
   */
  function levelFor(name, number) {
    const info = MONSTER_INFO[name];
    if (info.intro > number) {
      return 0;
    }
    let level = 4 + (number - info.intro) * 3;
    if (number === 6) {
      level += 3;
    }
    // Manly mode: everyone moves faster.
    if (save.settings.spookiness === 'manly') {
      level += 4;
    }
    return Math.min(20, level);
  }

  /**
   * Starts a night.
   * @param {number} number Which night (1 to 6).
   */
  function startNight(number, custom) {
    hidePopup();
    stopTune();
    window.clearTimeout(effectTimer);
    window.clearTimeout(staticFrame);
    // On custom night, the player picks every level.
    const level = (name) => custom ? custom.levels[name] :
        levelFor(name, number);
    const monsters = {};
    Object.keys(MONSTER_INFO).forEach((name) => {
      if (MONSTER_INFO[name].path) {
        monsters[name] = {step: 0, level: level(name)};
      }
    });
    // Golden Verity: a 1 in 2,000 chance each night, unless custom night
    // changes it.
    const goldenLevel = custom ? custom.golden : 1;
    let goldenAt = -1;
    if (forceGolden || Math.random() < goldenChance(goldenLevel)) {
      goldenAt = HOUR_SECONDS * (1 + Math.random() * 4);
      forceGolden = false;
    }
    night = {
      number: number,
      seconds: 0,
      viewX: (WORLD_WIDTH - 680) / 2,
      battery: 100,
      music: 100,
      maskOn: false,
      camsOn: false,
      cam: '1',
      monsters: monsters,
      // Monsters inside your office. fooled means they came in while you
      // already had the mask on.
      inside: [],
      limit: custom ? custom.limit || 1 : SPOT_LIMIT[number],
      roam: 0,
      moveTimer: 0,
      boost: 0,
      angry: {timer: 0, flashes: 0, wasLit: false},
      vanity: {cam: null, timer: 0, watch: 0, level: level('vanity')},
      insanityLevel: level('insanity'),
      custom: custom || null,
      // Raising Golden Verity still counts for stars but not the index.
      // Lowering him counts for the index but not stars.
      noIndex: goldenLevel > 1,
      noStars: goldenLevel < 1,
      // The sandbox never counts for stars or the index.
      sandbox: Boolean(custom && custom.sandbox),
      godMode: false,
      noScares: false,
      timeSpeed: 1,
      insanityOut: false,
      insanityTimer: 0,
      goldenAt: goldenAt,
      paused: false,
      over: false,
      lastTime: 0,
      lastMusicWarn: 0,
    };
    if (night.sandbox) {
      night.noIndex = true;
      night.noStars = true;
    }
    document.getElementById('officeView').innerHTML = drawOffice();
    officeDefsId = defsId;
    buildSandboxPanel();
    buildCamMap();
    document.getElementById('maskLayer').classList.remove('on');
    document.getElementById('camLayer').classList.remove('on');
    document.getElementById('scareLayer').style.display = 'none';
    document.getElementById('goldenText').className = '';
    document.getElementById('hudNight').textContent = nightName(number);
    const intro = document.getElementById('introBox');
    intro.innerHTML = '<div class="nightIntro">12:00 AM</div>' +
        '<div class="warnText" style="margin-top:14px">' +
        nightName(number) + '</div><div class="hint">Press Esc to pause' +
        '</div>';
    intro.style.transition = 'none';
    intro.style.opacity = '1';
    showScreen('officeScreen');
    playNote(110, 2, 'sine', 0.08);
    window.setTimeout(() => {
      intro.style.transition = 'opacity 1.5s';
      intro.style.opacity = '0';
    }, 2200);
    drawMonsters();
    updateHud();
    window.requestAnimationFrame(nightLoop);
  }

  /**
   * Where a walking monster is right now.
   * @param {string} name The monster.
   * @return {string} A camera number, or 'hall', 'ventL', 'ventR' or
   *     'office'. Asleep monsters stay where they start.
   */
  function whereIs(name) {
    return MONSTER_INFO[name].path[night.monsters[name].step];
  }

  /** Puts every monster in its spot in the office and on the cameras. */
  function drawMonsters() {
    // The office keeps its own shading, made when the night started.
    defsId = officeDefsId;
    ['hall', 'ventL', 'ventR', 'office'].forEach((spotName) => {
      const spot = SPOTS[spotName];
      let art = '';
      let count = 0;
      Object.keys(night.monsters).forEach((name) => {
        if (whereIs(name) !== spotName) {
          return;
        }
        const office = spotName === 'office';
        if (office && !insideEntry(name)) {
          return;
        }
        const body = MONSTER_INFO[name].body;
        const shift = office ? 0 : (count % 2 ? 1 : -1) *
            Math.ceil(count / 2) * spot.size * 0.7;
        const extra = office ? 'opacity="0.9"' :
            'class="litOnly" data-name="' + name + '"';
        const size = body ? spot.size * 1.9 : spot.size;
        const y = body ? spot.y + spot.size * 0.35 : spot.y;
        const art1 = drawMonster(name, spot.x + shift, y, size, extra);
        // Each monster in the office wanders on its own.
        art += office ? '<g class="roamer">' + art1 + '</g>' : art1;
        count++;
      });
      document.getElementById('spot_' + spotName).innerHTML = art;
    });
    if (night.camsOn) {
      drawCamera();
    }
  }

  /** Draws the camera that is picked. */
  function drawCamera() {
    const cam = getCam(night.cam);
    const here = Object.keys(night.monsters).filter((name) => {
      return whereIs(name) === cam.id;
    });
    here.forEach(markSeen);
    if (night.vanity.cam === cam.id) {
      markSeen('vanity');
    }
    document.getElementById('camView').innerHTML = drawRoom(cam, here);
    document.getElementById('camLabel').textContent =
        'CAM ' + cam.id + '  ' + cam.name;
    document.querySelectorAll('.mapRoom').forEach((button) => {
      button.classList.toggle('picked', button.id === 'map_' + cam.id);
    });
    document.getElementById('windBox').style.display =
        cam.id === '11' && night.insanityLevel > 0 ? 'block' : 'none';
  }

  /**
   * Switches to another camera.
   * @param {string} id The camera number.
   */
  function switchCamera(id) {
    night.cam = id;
    playNote(1200, 0.05, 'square', 0.03);
    drawCamera();
    flashStatic();
    if (night.vanity.cam === id) {
      // A faint, glassy ring: something is looking back at you.
      playNote(1568, 0.8, 'sine', 0.03);
    }
  }

  /** A burst of static when the camera changes. */
  function flashStatic() {
    const canvas = document.getElementById('camStatic');
    fillStatic(canvas);
    if (save.settings.epileptic) {
      canvas.style.opacity = '0.12';
      return;
    }
    canvas.style.opacity = '0.6';
    window.setTimeout(() => {
      canvas.style.opacity = '0.12';
    }, 150);
  }

  /**
   * Fills a canvas with random gray dots.
   * @param {!HTMLCanvasElement} canvas
   */
  function fillStatic(canvas) {
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const shade = Math.random() * 255;
      image.data[i] = shade;
      image.data[i + 1] = shade;
      image.data[i + 2] = shade;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }

  /** Opens or closes the cameras. */
  function toggleCameras() {
    if (!night || night.over || night.paused || night.maskOn) {
      return;
    }
    night.camsOn = !night.camsOn;
    document.getElementById('camLayer').classList.toggle('on', night.camsOn);
    playNote(night.camsOn ? 600 : 400, 0.12, 'square', 0.04);
    if (night.camsOn) {
      drawCamera();
      flashStatic();
    }
  }

  /** Puts the mask on or takes it off. */
  function toggleMask() {
    if (!night || night.over || night.paused || night.camsOn) {
      return;
    }
    night.maskOn = !night.maskOn;
    night.inside.forEach((entry) => {
      entry.mask = 0;
    });
    document.getElementById('maskLayer').classList.toggle('on', night.maskOn);
    playNote(night.maskOn ? 140 : 180, 0.2, 'triangle', 0.06);
  }

  /** @return {boolean} True if the flashlight is shining right now. */
  function lightOn() {
    if (night.maskOn || night.camsOn || night.battery <= 0) {
      return false;
    }
    return mouseDown || keysDown[save.settings.keys.flashlight] === true;
  }

  /**
   * Gives one monster its chance to move.
   * @param {string} name The monster.
   * @return {boolean} True if it moved.
   */
  function tryMove(name) {
    const monster = night.monsters[name];
    const info = MONSTER_INFO[name];
    const path = info.path;
    const here = path[monster.step];
    // Safety: a monster "in the office" that isn't really inside goes
    // back to its start.
    if (here === 'office' && !insideEntry(name)) {
      monster.step = 0;
      return false;
    }
    if (monster.level <= 0 || monster.step >= path.length - 1) {
      return false;
    }
    // Curiosity won't move while you watch it.
    if (info.shy && night.camsOn && night.cam === here) {
      return false;
    }
    const roll = Math.floor(Math.random() * 20) + 1;
    if (roll > Math.min(20, monster.level + night.boost)) {
      return false;
    }
    const next = path[monster.step + 1];
    // Each spot only fits so many monsters.
    if (SPOTS[next] && countAt(next) >= night.limit) {
      return false;
    }
    monster.step++;
    if (next === 'office') {
      // With the mask already on, it comes in, sees the mask, and gives
      // up after a moment.
      letIn(name, night.maskOn);
    } else if (next === 'ventL' || next === 'ventR') {
      playNote(260, 0.15, 'square', 0.05);
      window.setTimeout(() => playNote(240, 0.15, 'square', 0.05), 180);
    } else if (next === 'hall' && name === 'angrity') {
      night.angry = {timer: 0, flashes: 0, wasLit: false};
      playNote(80, 1.5, 'sawtooth', 0.08);
    } else if (info.body && next === 'hall') {
      // Heavy stomping.
      [0, 350, 700].forEach((wait) => {
        window.setTimeout(() => playNote(50, 0.25, 'square', 0.09), wait);
      });
    }
    if (info.noisy) {
      // Calamity knocks something over. Everyone comes running.
      playCrash();
      night.boost = 4;
      return true;
    }
    return true;
  }

  /** Every few seconds, the monsters get a chance to move. */
  function moveMonsters() {
    const boostBefore = night.boost;
    Object.keys(night.monsters).forEach((name) => {
      tryMove(name);
      // Velocity is fast: it gets a second chance.
      if (MONSTER_INFO[name].fast) {
        tryMove(name);
      }
    });
    // A boost from Calamity only lasts one round.
    if (boostBefore > 0) {
      night.boost = 0;
    }
    // Vanity shows up on a random camera.
    const vanity = night.vanity;
    if (vanity.level > 0 && !vanity.cam &&
        Math.floor(Math.random() * 20) + 1 <= vanity.level) {
      const choices = CAMERAS.filter((cam) => cam.id !== '11');
      vanity.cam = choices[Math.floor(Math.random() * choices.length)].id;
      vanity.timer = 0;
      vanity.watch = 0;
    }
    drawMonsters();
  }

  /**
   * Finds a monster inside your office.
   * @param {string} name The monster.
   * @return {?Object} Its entry, or null if it isn't inside.
   */
  function insideEntry(name) {
    return night.inside.find((entry) => entry.name === name) || null;
  }

  /**
   * Counts the monsters at a spot.
   * @param {string} spot 'hall', 'ventL', 'ventR' or 'office'.
   * @return {number}
   */
  function countAt(spot) {
    return Object.keys(night.monsters).filter((name) => {
      return whereIs(name) === spot;
    }).length;
  }

  /**
   * A monster gets into your office.
   * @param {string} name The monster.
   * @param {boolean} fooled True if you already had the mask on.
   */
  function letIn(name, fooled) {
    night.inside.push({name: name, fooled: fooled, timer: 0, mask: 0});
    markSeen(name);
    if (!fooled) {
      playNote(60, 1.2, 'sawtooth', 0.07);
    }
    startOfficeStatic();
  }

  /**
   * Takes a monster out of your office (it doesn't move it).
   * @param {string} name The monster.
   */
  function removeInside(name) {
    night.inside = night.inside.filter((entry) => entry.name !== name);
    if (!night.inside.length) {
      stopOfficeStatic();
    }
  }

  /**
   * Sends a monster in your office back to where it started.
   * @param {string} name The monster.
   */
  function sendBack(name) {
    removeInside(name);
    night.monsters[name].step = 0;
    playNote(300, 0.3, 'triangle', 0.05);
    drawMonsters();
  }

  /** @type {?AudioBufferSourceNode} The static hiss in the office. */
  let officeStatic = null;

  /** Starts the static hiss while a monster is in the office. */
  function startOfficeStatic() {
    if (!audio || officeStatic) {
      return;
    }
    const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.12;
    }
    officeStatic = audio.createBufferSource();
    officeStatic.buffer = buffer;
    officeStatic.loop = true;
    officeStatic.connect(masterGain);
    officeStatic.start();
  }

  /** Stops the static hiss. */
  function stopOfficeStatic() {
    if (officeStatic) {
      officeStatic.stop();
      officeStatic = null;
    }
  }

  /** A loud crash, for Calamity. */
  function playCrash() {
    if (!audio) {
      return;
    }
    const buffer = audio.createBuffer(1, audio.sampleRate * 0.6,
        audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    const noise = audio.createBufferSource();
    const gain = audio.createGain();
    gain.gain.value = 0.25;
    noise.buffer = buffer;
    noise.connect(gain);
    gain.connect(masterGain);
    noise.start();
  }

  /**
   * Updates what you can see under the flashlight, and counts flashes
   * at Angrity.
   * @param {boolean} shining True if the light is on.
   */
  function updateLight(shining) {
    const dark = document.getElementById('darkness');
    if (shining) {
      dark.style.background = 'radial-gradient(circle at ' + mouseX + 'px ' +
          mouseY + 'px, rgba(255,236,190,0.16) 0px, rgba(255,236,190,0.06) ' +
          (LIGHT_RADIUS * 0.6) + 'px, rgba(0,0,0,0.85) ' + LIGHT_RADIUS +
          'px)';
    } else {
      dark.style.background = 'rgba(0, 0, 0, 0.6)';
    }
    // A monster is inside: the lights flash on and off. In epileptic
    // mode they just stay dark instead.
    if (night.inside.length) {
      const flashOff = save.settings.epileptic ||
          Math.floor(night.seconds / 0.12) % 2 === 0 || Math.random() < 0.2;
      if (flashOff) {
        dark.style.background = 'rgba(0, 0, 0, 0.93)';
      }
    }
    let angrityLit = false;
    document.querySelectorAll('.litOnly').forEach((element) => {
      const box = element.getBoundingClientRect();
      const midX = box.left + box.width / 2;
      const midY = box.top + box.height / 2;
      const away = Math.hypot(midX - mouseX, midY - mouseY);
      const lit = shining && away < LIGHT_RADIUS + box.width / 3;
      element.setAttribute('opacity', lit ? '1' : '0.04');
      if (lit) {
        markSeen(element.dataset.name);
        if (element.dataset.name === 'angrity') {
          angrityLit = true;
        }
      }
    });
    // Each new flash of light on Angrity counts. Three sends him away.
    const angry = night.angry;
    if (angrityLit && !angry.wasLit) {
      angry.flashes++;
      playNote(140 + angry.flashes * 60, 0.2, 'sawtooth', 0.06);
      if (angry.flashes >= 3) {
        night.monsters.angrity.step = 0;
        angry.flashes = 0;
        playNote(400, 0.5, 'triangle', 0.06);
        drawMonsters();
      }
    }
    angry.wasLit = angrityLit;
  }

  /** Updates the clock, battery and music box on the screen. */
  function updateHud() {
    const hour = Math.floor(night.seconds / HOUR_SECONDS);
    document.getElementById('hudTime').textContent =
        (hour === 0 ? 12 : hour) + ' AM';
    document.getElementById('hudNight').textContent =
        nightName(night.number) + (night.timeSpeed === 0 ? '  FROZEN' :
            (night.timeSpeed === 4 ? '  4x SPEED' : ''));
    document.getElementById('hudBattery').style.width =
        Math.max(0, night.battery) + '%';
    const music = Math.max(0, night.music);
    document.getElementById('hudMusic').style.width = music + '%';
    document.getElementById('windFill').style.width = music + '%';
    // The music box only matters on nights when Insanity is awake.
    document.getElementById('hudMusicBox').style.display =
        night.insanityLevel > 0 ? 'block' : 'none';
    let alert = '';
    if (night.insanityOut) {
      alert = 'Something got out...';
    } else if (night.insanityLevel <= 0) {
      alert = '';
    } else if (music <= 0) {
      alert = 'Music box is empty!';
    } else if (music < 25) {
      alert = 'Wind the music box!';
    }
    document.getElementById('musicAlert').textContent = alert;
  }

  /**
   * Runs every frame during a night.
   * @param {number} time The time from the browser.
   */
  function nightLoop(time) {
    if (!night || night.over) {
      return;
    }
    const step = night.lastTime ? Math.min((time - night.lastTime) / 1000,
        0.1) : 0;
    night.lastTime = time;
    if (night.paused) {
      window.requestAnimationFrame(nightLoop);
      return;
    }

    // The clock.
    night.seconds += step * night.timeSpeed;
    if (night.seconds >= HOUR_SECONDS * 6) {
      winNight();
      return;
    }

    // Turning to look at the vents.
    if (!night.camsOn && !night.maskOn && !overPanel) {
      const edge = window.innerWidth * 0.18;
      const keys = save.settings.keys;
      let turn = 0;
      if (mouseX < edge || keysDown[keys.turnLeft]) {
        turn = -1;
      } else if (mouseX > window.innerWidth - edge ||
          keysDown[keys.turnRight]) {
        turn = 1;
      }
      night.viewX = Math.max(0, Math.min(WORLD_WIDTH - 680,
          night.viewX + turn * 700 * step));
      document.getElementById('officeView').setAttribute('viewBox',
          night.viewX + ' 0 680 420');
    }

    // Freeze (sandbox) stops everything but looking around.
    const tick = night.timeSpeed === 0 ? 0 : step;

    // The flashlight.
    const shining = lightOn();
    if (shining) {
      night.battery -= tick * 1.1;
    }
    updateLight(shining);

    // The music box runs down. Holding the button winds it back up.
    const winding = night.camsOn && night.cam === '11' &&
        (windHeld || keysDown[save.settings.keys.wind]);
    if (night.insanityOut) {
      // Too late. Nothing can stop it now.
      night.insanityTimer += tick;
      if (night.insanityTimer >= 6) {
        jumpscare('insanity');
        return;
      }
    } else if (winding) {
      night.music = Math.min(100, night.music + tick * 14);
      if (Math.random() < 0.15) {
        playNote(880 + Math.random() * 200, 0.08, 'triangle', 0.02);
      }
    } else {
      const speed = night.insanityLevel > 0 ?
          0.8 + night.insanityLevel * 0.06 : 0.7 + night.number * 0.15;
      night.music = Math.max(0, night.music - tick * speed);
    }
    if (night.music <= 0 && !night.insanityOut) {
      if (night.insanityLevel > 0) {
        night.insanityOut = true;
        night.insanityTimer = 0;
        markSeen('insanity');
        // The music box tune plays one last time.
        TUNE.slice(0, 8).forEach((freq, i) => {
          window.setTimeout(() => playNote(freq, 0.5, 'triangle', 0.07),
              i * 300);
        });
      }
    }

    // Monsters get a chance to move every few seconds.
    night.moveTimer += tick * 1000;
    if (night.moveTimer >= MOVE_CHANCE_MS) {
      night.moveTimer = 0;
      moveMonsters();
    }

    // Monsters in your office. One fooled by the mask leaves after a
    // moment, unless you take the mask off too soon. The others need
    // the mask on for a while, or they get you.
    for (const entry of night.inside.slice()) {
      if (entry.fooled) {
        entry.timer += tick;
        if (!night.maskOn) {
          entry.fooled = false;
          entry.timer = 0;
        } else if (entry.timer >= 1.5) {
          sendBack(entry.name);
        }
      } else if (night.maskOn) {
        entry.mask += tick;
        if (entry.mask >= MASK_FOOL_SECONDS) {
          sendBack(entry.name);
        }
      } else {
        entry.timer += tick;
        if (entry.timer >= MASK_GRACE[night.number]) {
          jumpscare(entry.name);
          return;
        }
      }
    }

    // Each monster inside wanders across the whole office, so you have
    // to turn to keep track of them.
    if (night.inside.length) {
      night.roam += tick;
      const roamers = document.querySelectorAll('#spot_office .roamer');
      roamers.forEach((group, i) => {
        const drift = Math.sin(night.roam * 0.9 + i * 2.1) * 520;
        group.setAttribute('transform', 'translate(' + drift + ' 0)');
      });
    } else {
      night.roam = 0;
    }

    // Angrity in the hall: flash him 3 times before he charges.
    if (night.monsters.angrity && whereIs('angrity') === 'hall') {
      night.angry.timer += tick;
      if (night.angry.timer >= Math.max(5, 9 - (night.number - 5) * 2)) {
        jumpscare('angrity');
        return;
      }
    }

    // Vanity: don't stare into the mirror.
    const vanity = night.vanity;
    if (vanity.cam) {
      vanity.timer += tick;
      if (night.camsOn && night.cam === vanity.cam) {
        vanity.watch += tick;
        if (vanity.watch >= 2.5) {
          jumpscare('vanity');
          return;
        }
      } else {
        vanity.watch = Math.max(0, vanity.watch - tick);
      }
      if (vanity.timer >= 15) {
        vanity.cam = null;
        if (night.camsOn) {
          drawCamera();
        }
      }
    }

    // Golden Verity.
    if (night.goldenAt > 0 && night.seconds >= night.goldenAt) {
      night.goldenAt = -1;
      goldenVisit();
    }

    if (night.camsOn && night.cam === '11' && Math.random() < 0.05) {
      drawCamera();
    }

    updateHud();
    window.requestAnimationFrame(nightLoop);
  }

  /** "hey its me its verity" flashes twice, then he leaps. */
  function goldenVisit() {
    markSeen('goldenVerity');
    const text = document.getElementById('goldenText');
    const style = save.settings.epileptic ? 'goldenFade' : 'goldenFlash';
    const show = (wait) => {
      window.setTimeout(() => {
        if (!night || night.over) {
          return;
        }
        text.className = style;
        playNote(196, 0.9, 'sawtooth', 0.05);
      }, wait);
      window.setTimeout(() => {
        text.className = '';
      }, wait + (save.settings.epileptic ? 1400 : 700));
    };
    show(0);
    show(1800);
    window.setTimeout(() => {
      if (night && !night.over) {
        jumpscare('goldenVerity');
      }
    }, 3600);
  }

  /** Plays a loud scream. */
  function playScream() {
    if (!audio) {
      return;
    }
    const length = 1.4;
    const buffer = audio.createBuffer(1, audio.sampleRate * length,
        audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = audio.createBufferSource();
    noise.buffer = buffer;
    const gain = audio.createGain();
    gain.gain.value = 0.5;
    noise.connect(gain);
    gain.connect(masterGain);
    noise.start();
    const osc = audio.createOscillator();
    const oscGain = audio.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audio.currentTime +
        length);
    oscGain.gain.setValueAtTime(0.3, audio.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime +
        length);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start();
    osc.stop(audio.currentTime + length);
  }

  /**
   * A monster got you. What happens depends on the spookiness level.
   * @param {string} name The monster.
   */
  function jumpscare(name) {
    if (night.godMode) {
      sandboxScare(name);
      return;
    }
    night.over = true;
    stopOfficeStatic();
    if (!night.noIndex) {
      const entry = save.index[name] ||
          {seen: true, scared: false, times: 0};
      entry.seen = true;
      entry.scared = true;
      entry.times++;
      save.index[name] = entry;
    }
    if (name === 'goldenVerity' && !night.noStars) {
      save.stars.golden = true;
    }
    writeSave();
    document.getElementById('maskLayer').classList.remove('on');
    document.getElementById('camLayer').classList.remove('on');
    document.getElementById('goldenText').className = '';
    const layer = document.getElementById('scareLayer');
    const level = save.settings.spookiness;
    const calm = save.settings.epileptic;
    // Baby mode, or the sandbox's "remove jumpscares": no scare at all.
    if (level === 'baby' || night.noScares) {
      gameOver(name);
      return;
    }
    layer.innerHTML = level === 'toddler' ? '' : scareHtml(name, level);
    const length = scareLength(name, level);
    layer.classList.toggle('shake', !calm);
    layer.style.display = 'block';
    playScream();
    window.setTimeout(() => {
      layer.style.display = 'none';
      gameOver(name);
    }, length);
  }

  /**
   * The picture for a jump scare.
   * @param {string} name Which monster.
   * @param {string} level 'kid' or 'manly'.
   * @return {string} HTML markup.
   */
  function scareHtml(name, level) {
    if (level === 'manly') {
      const own = MONSTER_INFO[name].scare;
      return '<div class="scareArt scare-' + own + '">' +
          drawKidScare(name, true) + '</div>' +
          (save.settings.epileptic ? '' : '<div class="manlyFlash"></div>') +
          '<div class="insult">' +
          INSULTS[Math.floor(Math.random() * INSULTS.length)] + '</div>';
    }
    const style = MONSTER_INFO[name].scare;
    return '<div class="scareArt scare-' + style + '">' +
        drawKidScare(name) + '</div>';
  }

  /**
   * How long a jump scare lasts, in milliseconds.
   * @param {string} name Which monster.
   * @param {string} level The spookiness level.
   * @return {number}
   */
  function scareLength(name, level) {
    if (level === 'manly') {
      return 2600;
    }
    const style = MONSTER_INFO[name].scare;
    return style === 'peek' || style === 'mirror' ? 1700 : 1300;
  }

  /** @type {number} */
  let overTimer = 0;

  /**
   * Shows the static game over screen, then goes home.
   * @param {string} name The monster that got you.
   */
  function gameOver(name) {
    const hour = Math.floor(night.seconds / HOUR_SECONDS);
    document.getElementById('overText').textContent =
        nightName(night.number) + '  |  ' + (hour === 0 ? 12 : hour) +
        ' AM  |  ' +
        MONSTER_INFO[name].name + ' got you';
    showScreen('gameOverScreen');
    const canvas = document.getElementById('overStatic');
    const start = Date.now();
    const draw = () => {
      fillStatic(canvas);
      if (Date.now() - start < 5000 && !save.settings.epileptic) {
        overTimer = window.setTimeout(draw, 70);
      }
    };
    draw();
    playStaticSound(5);
    window.setTimeout(() => {
      window.clearTimeout(overTimer);
      night = null;
      goHome();
    }, 5000);
  }

  /**
   * Plays a hiss of static.
   * @param {number} seconds How long.
   */
  function playStaticSound(seconds) {
    if (!audio) {
      return;
    }
    const buffer = audio.createBuffer(1, audio.sampleRate * seconds,
        audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.08;
    }
    const noise = audio.createBufferSource();
    noise.buffer = buffer;
    noise.connect(masterGain);
    noise.start();
  }

  /** You made it to 6 AM! */
  function winNight() {
    night.over = true;
    stopOfficeStatic();
    const number = night.number;
    if (night.custom) {
      // Beat custom night with all 15 monsters at 20 for the star.
      const levels = night.custom.levels;
      const allMax = Object.keys(levels).every((name) => levels[name] >= 20);
      if (allMax && !night.noStars) {
        save.stars.custom = true;
      }
    } else if (!save.beaten.includes(number)) {
      save.beaten.push(number);
    }
    if (!night.custom && save.night <= number) {
      save.night = Math.min(number + 1, 6);
    }
    if (number === 5) {
      save.stars.night5 = true;
    }
    if (number === 6) {
      save.stars.night6 = true;
    }
    writeSave();
    showScreen('winScreen');
    const time = document.getElementById('winTime');
    time.textContent = '5:59 AM';
    document.getElementById('winText').textContent = '';
    window.setTimeout(() => {
      time.textContent = '6:00 AM';
      document.getElementById('winText').textContent = nightName(number) +
          ' complete';
      [523, 659, 784, 1047].forEach((freq, i) => {
        window.setTimeout(() => playNote(freq, 0.6, 'triangle', 0.08),
            i * 220);
      });
    }, 1500);
    window.setTimeout(() => {
      night = null;
      goHome();
    }, 6000);
  }

  /** Pauses and asks if you want to quit. */
  function askQuit() {
    night.paused = true;
    showPopup(
        '<div class="panelTitle">PAUSED</div>' +
        '<div class="infoText" style="text-align:center">' +
        'Quit to the menu? This night won\'t be saved.</div>' +
        '<div class="bottomRow">' +
        '<button class="btn" id="keepPlaying">Keep playing</button>' +
        '<button class="btn" id="quitNight">Quit</button></div>');
    document.getElementById('keepPlaying').onclick = () => {
      playClick();
      hidePopup();
      night.paused = false;
    };
    document.getElementById('quitNight').onclick = () => {
      playClick();
      night.over = true;
      stopOfficeStatic();
      night = null;
      goHome();
    };
  }

  // =====================================================================
  // SANDBOX (only after the admin code)
  // =====================================================================

  /** @const {number} The sandbox uses this night number. */
  const SANDBOX_NIGHT = 8;

  /** @const {number} How active every monster is in the sandbox. */
  const SANDBOX_LEVEL = 10;

  /** @type {boolean} True while the mouse is over the sandbox panel. */
  let overPanel = false;

  /** Starts a normal-ish night with admin powers. */
  function startSandbox() {
    const levels = {};
    CUSTOM_MONSTERS.forEach((name) => {
      // The custom night only monsters stay asleep unless you spawn them.
      levels[name] = CUSTOM_ONLY.includes(name) ? 0 : SANDBOX_LEVEL;
    });
    startNight(SANDBOX_NIGHT, {levels: levels, golden: 1, sandbox: true,
      limit: 1});
  }

  /** Builds the admin powers panel on the side of the screen. */
  function buildSandboxPanel() {
    const panel = document.getElementById('sandboxPanel');
    if (!night.sandbox) {
      panel.style.display = 'none';
      return;
    }
    let options = '';
    MONSTERS.forEach((name) => {
      options += '<option value="' + name + '">' + MONSTER_INFO[name].name +
          '</option>';
    });
    let hours = '';
    [0, 1, 2, 3, 4, 5].forEach((hour) => {
      hours += '<button class="sbBtn" data-hour="' + hour + '">' +
          (hour === 0 ? 12 : hour) + '</button>';
    });
    panel.innerHTML =
        '<div class="sbTitle">ADMIN POWERS <span>(H to hide)</span></div>' +
        '<button class="sbBtn wide" id="sbGod">Can\'t die: OFF</button>' +
        '<button class="sbBtn wide" id="sbNoScares" style="margin-top:4px">' +
        'Jumpscares: ON</button>' +
        '<div class="sbLabel">Spawn monsters</div>' +
        '<select id="sbMonster">' + options + '</select>' +
        '<div class="sbRow">' +
        '<button class="sbBtn" data-spot="hall">Hall</button>' +
        '<button class="sbBtn" data-spot="ventL">Left vent</button>' +
        '<button class="sbBtn" data-spot="ventR">Right vent</button>' +
        '<button class="sbBtn" data-spot="office">Office</button>' +
        '<button class="sbBtn" data-spot="home">Send home</button>' +
        '<button class="sbBtn" data-spot="special">Do their thing</button>' +
        '</div><div id="sbMessage"></div>' +
        '<div class="sbLabel">Max monsters per spot</div>' +
        '<div class="sbRow"><button class="sbBtn" data-limit="1">1</button>' +
        '<button class="sbBtn" data-limit="2">2</button>' +
        '<button class="sbBtn" data-limit="3">3</button></div>' +
        '<div class="sbLabel">Time</div><div class="sbRow">' +
        '<button class="sbBtn" id="sbFreeze">Freeze</button>' +
        '<button class="sbBtn" id="sbFast">4x speed</button></div>' +
        '<div class="sbRow">' + hours + '</div>' +
        '<div class="sbLabel">Refill</div><div class="sbRow">' +
        '<button class="sbBtn" id="sbBattery">Battery</button>' +
        '<button class="sbBtn" id="sbMusic">Music box</button></div>';
    panel.style.display = 'block';

    const say = (text) => {
      document.getElementById('sbMessage').textContent = text;
    };
    const press = (id, action) => {
      document.getElementById(id).addEventListener('click', () => {
        playClick();
        action();
      });
    };
    press('sbGod', () => {
      night.godMode = !night.godMode;
      document.getElementById('sbGod').textContent = 'Can\'t die: ' +
          (night.godMode ? 'ON' : 'OFF');
      document.getElementById('sbGod').classList.toggle('on', night.godMode);
    });
    press('sbNoScares', () => {
      night.noScares = !night.noScares;
      const button = document.getElementById('sbNoScares');
      button.textContent = 'Jumpscares: ' +
          (night.noScares ? 'REMOVED' : 'ON');
      button.classList.toggle('on', night.noScares);
    });
    press('sbFreeze', () => {
      night.timeSpeed = night.timeSpeed === 0 ? 1 : 0;
      updateTimeButtons();
    });
    press('sbFast', () => {
      night.timeSpeed = night.timeSpeed === 4 ? 1 : 4;
      updateTimeButtons();
    });
    press('sbBattery', () => {
      night.battery = 100;
    });
    press('sbMusic', () => {
      night.music = 100;
      night.insanityOut = false;
      night.insanityTimer = 0;
    });
    const showLimit = () => {
      panel.querySelectorAll('[data-limit]').forEach((button) => {
        button.classList.toggle('on', Number(button.dataset.limit) ===
            night.limit);
      });
    };
    panel.querySelectorAll('[data-limit]').forEach((button) => {
      button.addEventListener('click', () => {
        playClick();
        night.limit = Number(button.dataset.limit);
        showLimit();
      });
    });
    showLimit();
    panel.querySelectorAll('[data-hour]').forEach((button) => {
      button.addEventListener('click', () => {
        playClick();
        night.seconds = Number(button.dataset.hour) * HOUR_SECONDS;
      });
    });
    panel.querySelectorAll('[data-spot]').forEach((button) => {
      button.addEventListener('click', () => {
        playClick();
        const name = document.getElementById('sbMonster').value;
        say(sandboxSpawn(name, button.dataset.spot));
      });
    });
    // Clicking the panel shouldn't turn on the flashlight, and pointing
    // at it shouldn't turn your view.
    panel.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });
    panel.addEventListener('mouseenter', () => {
      overPanel = true;
    });
    panel.addEventListener('mouseleave', () => {
      overPanel = false;
    });
    updateTimeButtons();
  }

  /** Lights up the time button that is on. */
  function updateTimeButtons() {
    document.getElementById('sbFreeze').classList.toggle('on',
        night.timeSpeed === 0);
    document.getElementById('sbFast').classList.toggle('on',
        night.timeSpeed === 4);
  }

  /**
   * Moves a monster where the admin asked.
   * @param {string} name The monster.
   * @param {string} spot 'hall', 'ventL', 'ventR', 'office', 'home' or
   *     'special'.
   * @return {string} A message saying what happened.
   */
  function sandboxSpawn(name, spot) {
    const info = MONSTER_INFO[name];
    if (spot === 'special') {
      if (name === 'vanity') {
        const choices = CAMERAS.filter((cam) => cam.id !== '11');
        night.vanity.cam =
            choices[Math.floor(Math.random() * choices.length)].id;
        night.vanity.timer = 0;
        night.vanity.watch = 0;
        drawMonsters();
        return 'Vanity is hiding on CAM ' + night.vanity.cam + '.';
      }
      if (name === 'insanity') {
        night.insanityLevel = Math.max(night.insanityLevel, SANDBOX_LEVEL);
        night.music = 0;
        return 'The music box is empty...';
      }
      if (name === 'goldenVerity') {
        goldenVisit();
        return 'hey its me its verity';
      }
      return info.name + ' has no special thing. Try a spot instead.';
    }
    if (!info.path) {
      return info.name + ' doesn\'t walk around. Try "Do their thing".';
    }
    const monster = night.monsters[name];
    if (spot === 'home') {
      removeInside(name);
      monster.step = 0;
      drawMonsters();
      return info.name + ' went back to CAM ' + info.path[0] + '.';
    }
    const where = info.path.indexOf(spot);
    if (where < 0) {
      return info.name + ' never comes that way.';
    }
    if (whereIs(name) === spot) {
      return info.name + ' is already there.';
    }
    if (countAt(spot) >= night.limit) {
      return 'That spot is full (' + night.limit + ' max).';
    }
    removeInside(name);
    if (spot === 'office') {
      monster.step = where;
      letIn(name, night.maskOn);
    } else {
      monster.step = where;
      if (name === 'angrity') {
        night.angry = {timer: 0, flashes: 0, wasLit: false};
      }
    }
    drawMonsters();
    return info.name + ' is coming!';
  }

  /**
   * Can't die is on: show the jump scare, then keep the night going.
   * @param {string} name The monster that "got" you.
   */
  function sandboxScare(name) {
    night.paused = true;
    // Keep the night running underneath (it waits while paused).
    window.requestAnimationFrame(nightLoop);
    stopOfficeStatic();
    const layer = document.getElementById('scareLayer');
    const level = save.settings.spookiness;
    const showIt = level !== 'baby' && !night.noScares;
    if (showIt) {
      layer.innerHTML = level === 'toddler' ? '' : scareHtml(name, level);
      layer.classList.toggle('shake', !save.settings.epileptic);
      layer.style.display = 'block';
      playScream();
    }
    // Everyone who could have got you goes home.
    if (night.monsters[name]) {
      night.monsters[name].step = 0;
    }
    removeInside(name);
    if (name === 'insanity') {
      night.music = 100;
      night.insanityOut = false;
      night.insanityTimer = 0;
    }
    if (name === 'vanity') {
      night.vanity.cam = null;
    }
    night.angry.timer = 0;
    window.setTimeout(() => {
      layer.style.display = 'none';
      if (!night) {
        return;
      }
      drawMonsters();
      night.paused = false;
    }, showIt ? scareLength(name, level) : 0);
  }

  // ---------------------------------------------------------------------
  // Controls during a night
  // ---------------------------------------------------------------------

  /** @type {boolean} True while the wind button is held. */
  let windHeld = false;

  const officeScreen = document.getElementById('officeScreen');

  document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });
  officeScreen.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouseDown = true;
    }
  });
  document.addEventListener('mouseup', () => {
    mouseDown = false;
    windHeld = false;
  });
  document.getElementById('maskBtn').addEventListener('mousedown',
      (event) => {
        event.stopPropagation();
        toggleMask();
      });
  document.getElementById('camBtn').addEventListener('mousedown',
      (event) => {
        event.stopPropagation();
        toggleCameras();
      });
  document.getElementById('windBtn').addEventListener('mousedown',
      (event) => {
        event.stopPropagation();
        windHeld = true;
      });
  // Don't let the right-click menu get in the way.
  officeScreen.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  document.addEventListener('keydown', (event) => {
    if (!night || night.over || waitingFor) {
      return;
    }
    if (event.code === 'Escape') {
      if (!night.paused) {
        askQuit();
      }
      return;
    }
    if (night.paused) {
      return;
    }
    const keys = save.settings.keys;
    if (keysDown[event.code]) {
      return;
    }
    keysDown[event.code] = true;
    if (event.code === 'KeyH' && night.sandbox) {
      const panel = document.getElementById('sandboxPanel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      overPanel = false;
      return;
    }
    if (event.code === keys.mask) {
      event.preventDefault();
      toggleMask();
    } else if (event.code === keys.cameras) {
      toggleCameras();
    }
  });
  document.addEventListener('keyup', (event) => {
    keysDown[event.code] = false;
  });

  /** Shows how to play. */
  function showHowToPlay() {
    showPopup(
        '<div class="panelTitle">HOW TO PLAY</div>' +
        '<div class="infoText">' +
        'Survive from 12 AM to 6 AM. There are no doors this time.<br><br>' +
        '<b>Flashlight:</b> Hold the mouse button. A circle of light ' +
        'follows your mouse. It uses battery.<br>' +
        '<b>Turn:</b> Move the mouse to the left or right edge to look ' +
        'at the vents.<br>' +
        '<b>Mask:</b> Put it on when a monster is in your office. It ' +
        'fools most of them.<br>' +
        '<b>Cameras:</b> Watch the pizzeria. You can\'t wear the mask ' +
        'and use the cameras at the same time.<br>' +
        '<b>Music box:</b> On Cam 11, hold the button to wind it. If it ' +
        'runs out, Insanity comes for you, and the mask won\'t help.<br>' +
        '<b>Angrity:</b> The mask doesn\'t fool him. Flash your light ' +
        'at him 3 times.<br><br>' +
        'Some say a golden one shows up once in a very long while...' +
        '</div><div class="bottomRow"><span></span>' +
        '<button class="btn" id="closePopup">Back</button></div>');
    document.getElementById('closePopup').onclick = () => {
      playClick();
      hidePopup();
    };
  }

  // ---------------------------------------------------------------------
  // Options
  // ---------------------------------------------------------------------

  /** @type {?string} The action waiting for a new key, if any. */
  let waitingFor = null;

  /**
   * Turns a key code into a short name, like 'KeyA' into 'A'.
   * @param {string} code The key code.
   * @return {string} The name to show.
   */
  function keyName(code) {
    if (code.startsWith('Key')) {
      return code.slice(3);
    }
    if (code.startsWith('Digit')) {
      return code.slice(5);
    }
    const names = {
      Space: 'Space', ArrowLeft: 'Left', ArrowRight: 'Right',
      ArrowUp: 'Up', ArrowDown: 'Down', ShiftLeft: 'Shift',
      ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl',
      Enter: 'Enter', Tab: 'Tab',
    };
    return names[code] || code;
  }

  /** Fills in every part of the options screen from the save. */
  function drawOptions() {
    const settings = save.settings;
    document.querySelectorAll('.spookBtn').forEach((btn) => {
      btn.classList.toggle('picked', btn.dataset.level ===
          settings.spookiness);
    });
    document.getElementById('spookNote').textContent =
        SPOOK_NOTES[settings.spookiness];
    document.getElementById('epilepticSwitch').classList.toggle('on',
        settings.epileptic);
    document.getElementById('epilepticLabel').textContent =
        settings.epileptic ? 'On' : 'Off';
    document.getElementById('volumeSlider').value = settings.volume;
    document.getElementById('volumeLabel').textContent =
        settings.volume + '%';
    const grid = document.getElementById('keyGrid');
    grid.innerHTML = '';
    KEY_ACTIONS.forEach((action) => {
      const name = document.createElement('div');
      name.textContent = action.name;
      const box = document.createElement('div');
      box.className = 'keyBox' + (waitingFor === action.id ?
          ' waiting' : '');
      box.textContent = waitingFor === action.id ?
          'Press a key' : keyName(settings.keys[action.id]);
      box.addEventListener('click', () => {
        playClick();
        waitingFor = action.id;
        drawOptions();
      });
      grid.appendChild(name);
      grid.appendChild(box);
    });
  }

  /** Opens the options screen. */
  function openOptions() {
    waitingFor = null;
    showScreen('optionsScreen');
    drawOptions();
  }

  document.querySelectorAll('.spookBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      playClick();
      if (btn.dataset.level === 'manly' &&
          save.settings.spookiness !== 'manly') {
        showBloodWarning();
        return;
      }
      save.settings.spookiness = btn.dataset.level;
      writeSave();
      drawOptions();
    });
  });

  /** Asks the player if they really want Manly mode. */
  function showBloodWarning() {
    showPopup(
        '<div class="panelTitle scaryFont">BLOOD WARNING</div>' +
        '<div class="infoText" style="text-align:center">' +
        'jumpscares now include blood (a little)</div>' +
        '<div class="bottomRow">' +
        '<button class="btn" id="kidButton">Im a kid and i know it</button>' +
        '<button class="btn scaryFont" id="manButton">' +
        'Im a man and i am brave</button></div>');
    document.getElementById('kidButton').onclick = () => {
      playClick();
      hidePopup();
    };
    document.getElementById('manButton').onclick = () => {
      playNote(70, 0.8, 'sawtooth', 0.12);
      save.settings.spookiness = 'manly';
      writeSave();
      hidePopup();
      drawOptions();
    };
  }

  document.getElementById('epilepticSwitch').addEventListener('click', () => {
    playClick();
    save.settings.epileptic = !save.settings.epileptic;
    writeSave();
    applyEpileptic();
    drawOptions();
  });

  document.getElementById('volumeSlider').addEventListener('input',
      (event) => {
        save.settings.volume = Math.round(Number(event.target.value));
        document.getElementById('volumeLabel').textContent =
            save.settings.volume + '%';
        applyVolume();
        writeSave();
      });

  document.getElementById('optionsBack').addEventListener('click', () => {
    playClick();
    goHome();
  });

  document.getElementById('resetKeys').addEventListener('click', () => {
    playClick();
    save.settings.keys = makeNewSave().settings.keys;
    waitingFor = null;
    writeSave();
    drawOptions();
  });

  document.addEventListener('keydown', (event) => {
    if (!waitingFor) {
      return;
    }
    event.preventDefault();
    if (event.code === 'Escape') {
      waitingFor = null;
      drawOptions();
      return;
    }
    // If another action already uses this key, swap them.
    const keys = save.settings.keys;
    const oldKey = keys[waitingFor];
    Object.keys(keys).forEach((id) => {
      if (keys[id] === event.code) {
        keys[id] = oldKey;
      }
    });
    keys[waitingFor] = event.code;
    waitingFor = null;
    playClick();
    writeSave();
    drawOptions();
  });

  // ---------------------------------------------------------------------
  // Admin code
  // ---------------------------------------------------------------------

  document.getElementById('codeButton').addEventListener('click', () => {
    playClick();
    showPopup(
        '<div class="panelTitle">ADMINISTRATOR CODE</div>' +
        '<input id="codeInput" maxlength="20" autocomplete="off">' +
        '<div id="codeMessage"></div>' +
        '<div class="bottomRow">' +
        '<button class="btn" id="codeBack">Back</button>' +
        '<button class="btn" id="codeEnter">Enter</button></div>');
    const input = document.getElementById('codeInput');
    input.focus();
    const tryCode = () => {
      const message = document.getElementById('codeMessage');
      if (input.value.trim().toLowerCase() === 'golden') {
        forceGolden = true;
        message.style.color = '#ef9f27';
        message.textContent = 'He will visit you next night...';
        return;
      }
      if (input.value.trim().toLowerCase() === ADMIN_CODE) {
        unlockEverything();
        message.style.color = '#5dcaa5';
        message.textContent = 'Everything unlocked.';
        playNote(523, 0.3, 'triangle', 0.08);
        window.setTimeout(() => playNote(784, 0.5, 'triangle', 0.08), 150);
        updateMenu();
      } else {
        message.style.color = '#e24b4a';
        message.textContent = 'Wrong code.';
        playNote(110, 0.3, 'square', 0.06);
      }
    };
    document.getElementById('codeEnter').onclick = tryCode;
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        tryCode();
      }
    });
    document.getElementById('codeBack').onclick = () => {
      playClick();
      hidePopup();
    };
  });

  /** Gives the tester everything in the game. */
  function unlockEverything() {
    save.night = 6;
    save.beaten = [1, 2, 3, 4, 5, 6];
    save.stars = {night5: true, night6: true, custom: true, golden: true};
    MONSTERS.forEach((name) => {
      save.index[name] = {seen: true, scared: true, times: 0};
    });
    save.sandbox = true;
    writeSave();
  }

  applyEpileptic();
})();
