// Yera Noona Christmas Microsite App Logic
(function() {
  // State definition
  const STATE_KEY = 'yera-christmas-2026';

  const defaultState = {
    availability: null, // "free" | "busy" | "unsure"
    hangout: null,      // "yes" | "no"
    times: [],          // Array<"eve-morning" | "eve-lunch" | "eve-dinner" | "xmas-after-church">
    timeUnsure: false,
    places: [],         // Array<id>
    customPlace: "",
    memo: "",
    noButtonEscapes: 0,
    completedAt: null
  };

  let state = loadState();

  // Audio & Snow instances
  let audioEngine = new window.AudioEngine();
  let snowSystem = null;

  // Runaway No Button Labels (12 phrases)
  const NO_BUTTON_LABELS = [
    "No",
    "Wait, wrong one",
    "Not this",
    "Can’t catch it",
    "Yes is warmer",
    "The snow is slippery",
    "Santa said no to no",
    "Think once more",
    "Yes is the safe side",
    "Almost unclickable",
    "Okay, one more try…",
    "No, I really can’t"
  ];

  // Places Data Catalog
  const PLACES_DATA = [
    {
      id: "the-hyundai-yeouido",
      title: "The Hyundai Seoul Christmas village",
      korean: "더현대 서울 크리스마스 마을",
      chip: "Yeouido · Indoor",
      vibe: "Sounds Forest on the 5th floor — winter trees and cottages",
      body: "Yeouido, 5F The Hyundai Seoul. The city’s usual Christmas photo stop. A little village of cottages through an indoor winter forest. Pretty in daylight too. Expect a wait.",
      bestWith: "Eve morning / Eve lunch",
      photo: "public/places/the-hyundai.jpg",
      mapHint: "Yeouinaru / Yeouido station",
      category: "indoor"
    },
    {
      id: "coex-starfield-library",
      title: "COEX Starfield Library",
      korean: "코엑스 별마당 도서관",
      chip: "Samseong · Indoor",
      vibe: "A tall tree inside the stacks, ceiling like falling stars",
      body: "The library in the middle of Starfield COEX Mall. Indoor, so the cold is not a problem. Tree photos, a slow walk between the shelves.",
      bestWith: "Eve dinner / after church",
      photo: "public/places/coex.jpg",
      mapHint: "Samseong station",
      category: "indoor"
    },
    {
      id: "shinsegae-myeongdong",
      title: "Shinsegae Myeongdong",
      korean: "신세계 본점 명동",
      chip: "Myeongdong · Indoor + outdoor",
      vibe: "The big tree and the night facade lights",
      body: "Middle of Myeongdong. Tree inside, light show on the wall outside. Better after dark. Crowded.",
      bestWith: "Eve dinner",
      photo: "public/places/shinsegae.jpg",
      mapHint: "Myeongdong station",
      category: "both"
    },
    {
      id: "lotte-world-tower-market",
      title: "Lotte World Tower Christmas market",
      korean: "롯데월드타워 크리스마스 마켓",
      chip: "Jamsil · Outdoor",
      vibe: "Market stalls under the tallest tower",
      body: "Outdoor market by the tower lawn. Lights, stalls, something hot to drink. Wear a real coat.",
      bestWith: "Eve dinner",
      photo: "public/places/lotte-tower.jpg",
      mapHint: "Jamsil station",
      category: "outdoor"
    },
    {
      id: "gwanghwamun-market",
      title: "Gwanghwamun Christmas market",
      korean: "광화문 크리스마스 마켓",
      chip: "Gwanghwamun · Outdoor",
      vibe: "Seoul’s main square market",
      body: "Easy walking, lots of photos, cafes nearby.",
      bestWith: "Eve lunch / Eve dinner",
      photo: "public/places/gwanghwamun.jpg",
      mapHint: "Gwanghwamun station",
      category: "outdoor"
    },
    {
      id: "cheonggyecheon-lights",
      title: "Cheonggyecheon winter lights",
      korean: "청계천",
      chip: "Euljiro · Outdoor walk",
      vibe: "A slow walk along the stream lights",
      body: "Better for walking side by side than sitting a long time. Cold, but the mood is clear.",
      bestWith: "Eve dinner",
      photo: "public/places/cheonggyecheon.jpg",
      mapHint: "Euljiro 1-ga / Gwanghwamun",
      category: "outdoor"
    },
    {
      id: "myeongdong-cathedral",
      title: "Myeongdong Cathedral",
      korean: "명동성당",
      chip: "Myeongdong · Outdoor",
      vibe: "Red brick that actually belongs to Christmas",
      body: "Fits Christmas Day after church. It is a church — keep the visit quiet.",
      bestWith: "Christmas Day after church",
      photo: "public/places/myeongdong-cathedral.jpg",
      mapHint: "Myeongdong station",
      category: "less-crowded"
    }
  ];

  // DOM Elements
  let currentSceneIndex = 0;
  let countdownTarget = "xmas"; // "xmas" (Dec 25) or "eve" (Dec 24)
  let timerInterval = null;
  let resetSealTaps = 0;

  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });

  function initApp() {
    // Snow init
    const canvas = document.getElementById('snow-canvas');
    snowSystem = new window.SnowSystem(canvas);
    snowSystem.start();

    // Audio toggle button
    const audioBtn = document.getElementById('audio-toggle');
    updateAudioBtnUI();
    audioBtn.addEventListener('click', () => {
      const isMuted = audioEngine.toggleMute();
      updateAudioBtnUI();
      showToast(isMuted ? "Audio muted" : "Audio unmuted");
    });

    // Populate Places List
    renderPlaceCards('all');

    // Attach Event Handlers
    setupEventHandlers();

    // Check if returning visitor
    if (state.completedAt || state.availability) {
      showToast("Your last answers are still here");
    }

    // First visit toast after 1.2s on Scene 0
    setTimeout(() => {
      if (currentSceneIndex === 0) {
        showToast("Sound is nicer · mute it at the top right anytime");
      }
    }, 1200);

    // Initial scene render
    updateNavUI();
    startDDayTimer();
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? { ...defaultState, ...JSON.parse(raw) } : { ...defaultState };
    } catch(e) {
      return { ...defaultState };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch(e) {
      console.error("Failed to save state", e);
    }
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  function updateAudioBtnUI() {
    const icon = document.getElementById('audio-icon');
    const text = document.getElementById('audio-text');
    if (audioEngine.isMuted) {
      icon.textContent = "🔇";
      text.textContent = "Muted";
    } else {
      icon.textContent = "♪";
      text.textContent = "Snow over the village";
    }
  }

  function switchScene(targetSceneId, navIndex) {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(targetSceneId);
    if (target) {
      target.classList.add('active');
    }

    if (typeof navIndex === 'number') {
      currentSceneIndex = navIndex;
    }
    updateNavUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateNavUI() {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach(step => {
      const stepIdx = parseInt(step.getAttribute('data-step'), 10);
      step.classList.remove('active', 'completed');
      if (stepIdx === currentSceneIndex) {
        step.classList.add('active');
      } else if (stepIdx < currentSceneIndex) {
        step.classList.add('completed');
      }
    });
  }

  function setupEventHandlers() {
    // Scene 0 - Envelope & Open Letter
    const envWrapper = document.getElementById('envelope-wrapper');
    const waxSeal = document.getElementById('wax-seal');
    const btnOpenLetter = document.getElementById('btn-open-letter');

    function handleOpenEnvelope() {
      audioEngine.startMusic();
      audioEngine.playCrackSFX();
      waxSeal.classList.add('cracked');
      envWrapper.classList.add('opened');

      setTimeout(() => {
        switchScene('scene-1', 1);
      }, 600);
    }

    envWrapper.addEventListener('click', handleOpenEnvelope);
    btnOpenLetter.addEventListener('click', handleOpenEnvelope);

    // Scene 1 - Availability
    document.getElementById('card-free').addEventListener('click', () => {
      audioEngine.playTapSFX();
      state.availability = "free";
      saveState();
      document.getElementById('card-free').classList.add('selected');
      setTimeout(() => {
        document.getElementById('card-free').classList.remove('selected');
        switchScene('scene-2', 2);
      }, 400);
    });

    document.getElementById('card-busy').addEventListener('click', () => {
      audioEngine.playTapSFX();
      state.availability = "busy";
      saveState();
      switchScene('scene-ending-a', 1);
      renderEndingA_DDay();
    });

    document.getElementById('link-unsure').addEventListener('click', () => {
      audioEngine.playTapSFX();
      state.availability = "unsure";
      saveState();
      // Change Scene 2 headline if unsure
      document.getElementById('invite-eyebrow').textContent = "If the day opens up...";
      document.getElementById('invite-headline').innerHTML = "Want to hang out<br>if you are free?";
      switchScene('scene-2', 2);
    });

    // Hidden Ending A handlers
    document.getElementById('btn-save-busy-note').addEventListener('click', () => {
      audioEngine.playTapSFX();
      state.memo = document.getElementById('busy-memo-input').value.trim();
      saveState();
      showToast("Note saved. Have a lovely Christmas!");
    });

    document.getElementById('btn-watch-snow').addEventListener('click', () => {
      audioEngine.playTapSFX();
      showToast("Watching the quiet snow...");
    });

    // Scene 2 - Invitation & Runaway No Button
    const btnYes = document.getElementById('btn-yes-invite');
    const btnNo = document.getElementById('btn-no-runaway');
    const ghostSlot = document.getElementById('ghost-slot');

    btnYes.addEventListener('click', () => {
      audioEngine.playTapSFX();
      triggerConfetti();
      state.hangout = "yes";
      saveState();
      showToast("Okay. Just pick a time.");
      setTimeout(() => {
        switchScene('scene-3', 3);
      }, 700);
    });

    // Runaway No Button Logic (§6)
    let escapesCount = state.noButtonEscapes || 0;

    function fleeNoButton(e) {
      if (escapesCount >= 11) return; // 12th tap is allowed

      escapesCount++;
      state.noButtonEscapes = escapesCount;
      saveState();

      audioEngine.playWhooshSFX();

      // Show ghost slot on first flee
      if (!btnNo.classList.contains('fleeing')) {
        btnNo.classList.add('fleeing');
        ghostSlot.classList.add('visible');
      }

      // Cycle label
      const nextLabel = NO_BUTTON_LABELS[Math.min(escapesCount, NO_BUTTON_LABELS.length - 1)];
      btnNo.textContent = nextLabel;

      // Calculate escape position
      const btnRect = btnNo.getBoundingClientRect();
      const safeTop = 60;
      const safeBottom = window.innerHeight - 80;
      const safeLeft = 20;
      const safeRight = window.innerWidth - btnRect.width - 20;

      // Random flee coordinates away from current center
      let newX = Math.random() * (safeRight - safeLeft) + safeLeft;
      let newY = Math.random() * (safeBottom - safeTop) + safeTop;

      // Perpendicular jitter & boundary bounce clamp
      btnNo.style.left = `${Math.max(safeLeft, Math.min(safeRight, newX))}px`;
      btnNo.style.top = `${Math.max(safeTop, Math.min(safeBottom, newY))}px`;
    }

    // Touch and mouse runaway triggers
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      btnNo.addEventListener('pointerenter', fleeNoButton);
      btnNo.addEventListener('touchstart', (e) => {
        if (escapesCount < 11) {
          e.preventDefault();
          fleeNoButton(e);
        }
      }, { passive: false });
    }

    btnNo.addEventListener('click', (e) => {
      if (escapesCount < 11 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        e.preventDefault();
        fleeNoButton(e);
      } else {
        // 12th tap honored
        audioEngine.playTapSFX();
        state.hangout = "no";
        saveState();
        switchScene('scene-ending-b', 2);
        renderEndingB_DDay();
      }
    });

    // Scene 3 - Times Selection
    const timeTiles = document.querySelectorAll('.time-tile');
    timeTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        audioEngine.playTapSFX();
        const timeId = tile.getAttribute('data-time');
        if (tile.classList.contains('selected')) {
          tile.classList.remove('selected');
          state.times = state.times.filter(t => t !== timeId);
        } else {
          tile.classList.add('selected');
          if (!state.times.includes(timeId)) {
            state.times.push(timeId);
          }
        }
        state.timeUnsure = false;
        saveState();
      });
    });

    document.getElementById('link-time-unsure').addEventListener('click', () => {
      audioEngine.playTapSFX();
      state.timeUnsure = true;
      state.times = [];
      timeTiles.forEach(t => t.classList.remove('selected'));
      saveState();
      showToast("Time marked as not sure yet.");
      switchScene('scene-4', 4);
    });

    document.getElementById('btn-submit-time').addEventListener('click', () => {
      if (state.times.length === 0 && !state.timeUnsure) {
        showToast("Please select at least one time or tap 'I’m not sure yet'");
        return;
      }
      audioEngine.playTapSFX();
      switchScene('scene-4', 4);
    });

    // Scene 4 - Places Filters & Selection
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        audioEngine.playTapSFX();
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.getAttribute('data-filter');
        renderPlaceCards(filter);
      });
    });

    document.getElementById('btn-submit-places').addEventListener('click', () => {
      const customVal = document.getElementById('custom-place-input').value.trim();
      state.customPlace = customVal;
      saveState();

      if (state.places.length === 0 && !customVal) {
        showToast("Please select at least one place or type your own");
        return;
      }
      audioEngine.playTapSFX();
      switchScene('scene-5', 4);
    });

    // Scene 5 - Optional Note
    document.getElementById('btn-seal-letter').addEventListener('click', () => {
      audioEngine.playTapSFX();
      state.memo = document.getElementById('memo-input').value.trim();
      state.completedAt = new Date().toISOString();
      saveState();

      // Transition to Sealed Letter Summary
      renderSummaryCard();
      switchScene('scene-6', 6);
    });

    // Scene 6 - Summary & Actions
    document.getElementById('btn-edit-answers').addEventListener('click', () => {
      audioEngine.playTapSFX();
      switchScene('scene-1', 1);
    });

    document.getElementById('dday-toggle-target').addEventListener('click', () => {
      audioEngine.playTapSFX();
      countdownTarget = countdownTarget === "xmas" ? "eve" : "xmas";
      const btn = document.getElementById('dday-toggle-target');
      btn.textContent = countdownTarget === "xmas" ? "Count down to Eve instead" : "Count down to Christmas Day instead";
      updateDDayDisplay();
    });

    // Save as Image (PNG)
    document.getElementById('btn-save-image').addEventListener('click', async () => {
      audioEngine.playTapSFX();
      showToast("Generating image...");

      const card = document.getElementById('letter-summary-card');
      try {
        if (window.htmlToImage) {
          const dataUrl = await window.htmlToImage.toPng(card, { quality: 0.95, backgroundColor: '#f6efe2' });
          const link = document.createElement('a');
          link.download = 'yera-christmas-2026.png';
          link.href = dataUrl;
          link.click();
          showToast("Image saved!");
        } else {
          showToast("Screenshot mode: hold screen to save");
        }
      } catch(err) {
        console.error("PNG export error", err);
        showToast("Please take a screenshot of your screen!");
      }
    });

    // 8-tap wax seal reset gesture
    document.getElementById('summary-wax-seal').addEventListener('click', () => {
      resetSealTaps++;
      if (resetSealTaps >= 8) {
        resetSealTaps = 0;
        localStorage.removeItem(STATE_KEY);
        state = { ...defaultState };
        showToast("Answers reset!");
        setTimeout(() => {
          location.reload();
        }, 500);
      } else {
        showToast(`Reset seal: ${8 - resetSealTaps} more taps`);
      }
    });
  }

  function renderPlaceCards(filter) {
    const listContainer = document.getElementById('place-card-list');
    listContainer.innerHTML = '';

    const filtered = PLACES_DATA.filter(p => {
      if (filter === 'all') return true;
      if (filter === 'indoor') return p.category === 'indoor' || p.category === 'both';
      if (filter === 'outdoor') return p.category === 'outdoor' || p.category === 'both';
      if (filter === 'less-crowded') return p.category === 'less-crowded';
      return true;
    });

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = `place-card ${state.places.includes(p.id) ? 'selected' : ''}`;
      card.setAttribute('data-id', p.id);

      card.innerHTML = `
        <div class="place-img-wrapper">
          <img src="${p.photo}" alt="${p.title}" class="place-img" loading="lazy">
          <div class="place-badge">${p.chip}</div>
        </div>
        <div class="place-info">
          <div class="place-title">${p.title}</div>
          <div class="place-korean">${p.korean}</div>
          <div class="place-vibe">${p.vibe}</div>
          <div class="place-body">${p.body}</div>
          <div class="place-footer">
            <span>Best with: ${p.bestWith}</span>
            <button class="place-select-btn">${state.places.includes(p.id) ? 'Selected ✓' : 'This one'}</button>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        audioEngine.playTapSFX();
        if (state.places.includes(p.id)) {
          state.places = state.places.filter(id => id !== p.id);
          card.classList.remove('selected');
          card.querySelector('.place-select-btn').textContent = 'This one';
        } else {
          state.places.push(p.id);
          card.classList.add('selected');
          card.querySelector('.place-select-btn').textContent = 'Selected ✓';
        }
        saveState();
      });

      listContainer.appendChild(card);
    });
  }

  function triggerConfetti() {
    const container = document.getElementById('scene-container');
    for (let i = 0; i < 18; i++) {
      const piece = document.createElement('div');
      const isStar = i % 2 === 0;
      piece.style.position = 'fixed';
      piece.style.top = '40%';
      piece.style.left = '50%';
      piece.style.width = isStar ? '12px' : '6px';
      piece.style.height = isStar ? '12px' : '16px';
      piece.style.backgroundColor = isStar ? '#e8d3a4' : '#16302a';
      piece.style.clipPath = isStar ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none';
      piece.style.zIndex = '99';
      piece.style.pointerEvents = 'none';

      const angle = (i / 18) * Math.PI * 2;
      const velocity = 80 + Math.random() * 120;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity - 100;

      piece.animate([
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${vx}px, ${vy + 200}px) scale(0.5) rotate(${360 + Math.random()*360}deg)`, opacity: 0 }
      ], {
        duration: 1200 + Math.random() * 400,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards'
      });

      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 1600);
    }
  }

  function renderSummaryCard() {
    const timeLabels = {
      'eve-morning': 'Christmas Eve morning (Thu 24 Dec)',
      'eve-lunch': 'Christmas Eve lunch (Thu 24 Dec)',
      'eve-dinner': 'Christmas Eve dinner (Thu 24 Dec)',
      'xmas-after-church': 'Christmas Day after church (Fri 25 Dec)'
    };

    // Times summary
    const timeElem = document.getElementById('summary-times');
    if (state.timeUnsure || state.times.length === 0) {
      timeElem.innerHTML = '· Not sure yet';
    } else {
      timeElem.innerHTML = state.times.map(t => `<div>· ${timeLabels[t] || t}</div>`).join('');
    }

    // Places summary
    const placeElem = document.getElementById('summary-places');
    let placeHtml = '';
    state.places.forEach(id => {
      const p = PLACES_DATA.find(item => item.id === id);
      if (p) {
        placeHtml += `<div class="summary-item"><div class="summary-item-title">· ${p.title}</div><span class="korean">${p.korean}</span></div>`;
      }
    });
    if (state.customPlace) {
      placeHtml += `<div class="summary-item"><div class="summary-item-title">· Custom: ${state.customPlace}</div></div>`;
    }
    if (!placeHtml) {
      placeHtml = '· Not specified';
    }
    placeElem.innerHTML = placeHtml;

    // Memo
    const memoElem = document.getElementById('summary-memo');
    memoElem.textContent = state.memo ? `· "${state.memo}"` : '· None';
  }

  function renderEndingA_DDay() {
    const container = document.getElementById('compact-dday-container-a');
    if (container) {
      container.innerHTML = `
        <div class="dday-card">
          <div class="dday-main">${getDDayString("xmas")}</div>
          <div class="dday-monday-line">${getMondaysLeftString("xmas")}</div>
        </div>
      `;
    }
  }

  function renderEndingB_DDay() {
    const container = document.getElementById('compact-dday-container-b');
    if (container) {
      container.innerHTML = `
        <div class="dday-card">
          <div class="dday-main">${getDDayString("xmas")}</div>
          <div class="dday-monday-line">${getMondaysLeftString("xmas")}</div>
        </div>
      `;
    }
  }

  // KST Date and D-Day Countdown Calculation (§8)
  function getKSTDate(dateObj = new Date()) {
    // Convert date object to Asia/Seoul timezone date
    const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
    const kstOffset = 9 * 3600000;
    return new Date(utc + kstOffset);
  }

  function getTargetDateKST(type = "xmas") {
    // 2026-12-25 00:00 KST or 2026-12-24 00:00 KST
    const day = type === "eve" ? 24 : 25;
    // Create Date in KST
    return new Date(Date.UTC(2026, 11, day, 0, 0, 0) - (9 * 3600000));
  }

  function startDDayTimer() {
    if (timerInterval) clearInterval(timerInterval);
    updateDDayDisplay();
    timerInterval = setInterval(updateDDayDisplay, 1000);
  }

  function updateDDayDisplay() {
    const bigElem = document.getElementById('dday-big');
    const timerElem = document.getElementById('dday-ticking');
    const mondayElem = document.getElementById('dday-monday-count');
    const slotElem = document.getElementById('mini-slot-countdown');

    if (!bigElem) return;

    const targetKST = getTargetDateKST(countdownTarget);
    const nowKST = getKSTDate();

    // D-Day Big label
    const diffMs = targetKST - nowKST;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let ddayText = "";
    if (diffDays > 0) ddayText = `D-${diffDays}`;
    else if (diffDays === 0) ddayText = `D-Day`;
    else ddayText = `D+${Math.abs(diffDays)}`;

    const titleText = countdownTarget === "eve" ? "Christmas Eve" : "Christmas";
    bigElem.innerHTML = `${titleText}<br>${ddayText}`;

    // Ticking timer
    if (diffMs > 0) {
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diffMs / (1000 * 60)) % 60);
      const secs = Math.floor((diffMs / 1000) % 60);

      const pad = n => String(n).padStart(2, '0');
      timerElem.textContent = `${pad(days)} days ${pad(hours)} hrs ${pad(mins)} min ${pad(secs)} sec`;
    } else {
      timerElem.textContent = "00 days 00 hrs 00 min 00 sec";
    }

    // Monday count line
    mondayElem.textContent = getMondaysLeftString(countdownTarget);

    // Mini slot countdown if earliest selected slot exists
    if (state.times && state.times.length > 0 && !state.timeUnsure && slotElem) {
      const slotTimeMs = getEarliestSlotMs(state.times);
      if (slotTimeMs && slotTimeMs > nowKST.getTime()) {
        const slotDiffMs = slotTimeMs - nowKST.getTime();
        const sHours = Math.floor(slotDiffMs / (1000 * 60 * 60));
        const sMins = Math.floor((slotDiffMs / (1000 * 60)) % 60);
        slotElem.style.display = 'block';
        slotElem.textContent = `⏳ Earliest slot in: ${sHours} hrs ${sMins} mins`;
      } else {
        slotElem.style.display = 'none';
      }
    } else if (slotElem) {
      slotElem.style.display = 'none';
    }
  }

  function getDDayString(targetType) {
    const targetKST = getTargetDateKST(targetType);
    const nowKST = getKSTDate();
    const diffMs = targetKST - nowKST;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const titleText = targetType === "eve" ? "Christmas Eve" : "Christmas";

    if (diffDays > 0) return `${titleText} D-${diffDays}`;
    if (diffDays === 0) return `${titleText} D-Day`;
    return `${titleText} D+${Math.abs(diffDays)}`;
  }

  /**
   * Monday Algorithm (§8):
   * Count Mondays from current KST date through 21 Dec 2026.
   * Snapshot check: on 2026-09-01 KST this is 16 Mondays before 2026-12-25 (Sep 7 ... Dec 21).
   */
  function mondaysUntil(targetDateKST) {
    const nowKST = getKSTDate();

    // End date is 21 Dec 2026 KST (day before Christmas Eve)
    const endKST = new Date(Date.UTC(2026, 11, 21, 23, 59, 59) - (9 * 3600000));

    if (nowKST > targetDateKST) return 0;

    let count = 0;
    // Iterate day by day in KST
    let curr = new Date(nowKST.getFullYear(), nowKST.getMonth(), nowKST.getDate());
    const limit = new Date(2026, 11, 21);

    while (curr <= limit) {
      if (curr.getDay() === 1) { // 1 = Monday
        count++;
      }
      curr.setDate(curr.getDate() + 1);
    }
    return count;
  }

  function getMondaysLeftString(targetType) {
    const targetKST = getTargetDateKST(targetType);
    const nowKST = getKSTDate();

    if (nowKST >= targetKST) return "It’s today.";

    const n = mondaysUntil(targetKST);

    if (n > 1) {
      return `${n} Mondays left until Christmas.`;
    } else if (n === 1) {
      return "One Monday left until Christmas.";
    } else {
      return "Christmas is later this week.";
    }
  }

  function getEarliestSlotMs(times) {
    // Times mapping to KST hour/mins:
    // eve-morning: 2026-12-24 10:00 KST
    // eve-lunch: 2026-12-24 12:30 KST
    // eve-dinner: 2026-12-24 18:00 KST
    // xmas-after-church: 2026-12-25 13:30 KST
    const map = {
      'eve-morning': new Date(Date.UTC(2026, 11, 24, 1, 0, 0)).getTime(),
      'eve-lunch': new Date(Date.UTC(2026, 11, 24, 3, 30, 0)).getTime(),
      'eve-dinner': new Date(Date.UTC(2026, 11, 24, 9, 0, 0)).getTime(),
      'xmas-after-church': new Date(Date.UTC(2026, 11, 25, 4, 30, 0)).getTime(),
    };

    let minTime = null;
    times.forEach(t => {
      if (map[t]) {
        if (!minTime || map[t] < minTime) {
          minTime = map[t];
        }
      }
    });
    return minTime;
  }

})();
