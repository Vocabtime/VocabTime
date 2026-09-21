/* VocabTime - Game Engines (Flashcards, Quiz, Match, Keyboard Typing) */

/* Web Audio API Synthesizer for Sound FX */
const AudioFX = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playCorrect() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  },
  playWrong() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(247.94, now); // B3
      osc.frequency.exponentialRampToValueAtTime(164.81, now + 0.2); // E3
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  },
  playVictory() {
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const now = this.ctx.currentTime + (i * 0.12);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      });
    } catch (e) {}
  }
};

/* Confetti Celebration for 100% Score */
function triggerConfettiCelebration() {
  AudioFX.playVictory();
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6, x: 0.2 }
    });
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6, x: 0.8 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.4 }
      });
    }, 250);
  }
}

function getGameVocabularyPool() {
  if (globalScope === 'all') {
    return [...vocabList];
  }
  const pool = vocabList.filter(w => unlockedWordsSet.has(w.en));
  if (pool.length < MIN_UNLOCKED) {
    return vocabList.slice(0, MIN_UNLOCKED);
  }
  return pool;
}

// Flashcard Engine
let flashcardDeck = [...vocabList];
let cardIdx = 0;
let isFlipped = false;
let autoVoice = false;

function playVoiceText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

function renderFlashcard() {
  isFlipped = false;
  const box = document.getElementById('flashcardBox');
  if (box) box.classList.remove('rotate-y-180');

  const cardArea = document.querySelector('.perspective-1000');
  const navArea = document.querySelector('#view-flashcards > div.flex.items-center.justify-between.w-full.mt-6');
  let emptyState = document.getElementById('fcEmptyStateContainer');

  if (!flashcardDeck || flashcardDeck.length === 0) {
    if (box) box.style.display = 'none';
    if (navArea) navArea.style.display = 'none';
    if (!emptyState && cardArea && cardArea.parentNode) {
      emptyState = document.createElement('div');
      emptyState.id = 'fcEmptyStateContainer';
      emptyState.className = "w-full glass-card rounded-3xl p-8 border-2 border-vtGrayBorder text-center my-4 shadow-sm";
      emptyState.innerHTML = `
        <div class="w-16 h-16 rounded-3xl bg-vtPurpleLight text-vtPurple flex items-center justify-center text-3xl font-black mx-auto mb-3 shadow-xs">
          <i class="fa-solid fa-folder-open"></i>
        </div>
        <h3 class="font-black text-xl text-slate-800">Album này chưa có từ vựng nào!</h3>
        <p class="text-xs font-bold text-slate-400 mt-1 mb-5">Vui lòng nạp thêm từ vựng từ file Word (.docx), .txt hoặc nhập trực tiếp để bắt đầu học.</p>
        <button onclick="switchNav('add')" class="px-6 py-3.5 rounded-2xl btn-vt-purple text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer">
          <i class="fa-solid fa-plus-circle mr-1.5"></i> Nạp từ vựng vào Album ngay
        </button>
      `;
      cardArea.parentNode.insertBefore(emptyState, cardArea);
    }
    if (emptyState) emptyState.style.display = 'block';
    updateStatsUI();
    return;
  } else {
    if (box) box.style.display = 'block';
    if (navArea) navArea.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
  }

  if (cardIdx >= flashcardDeck.length) cardIdx = 0;
  if (cardIdx < 0) cardIdx = 0;

  const item = flashcardDeck[cardIdx];
  if (!item) return;

  const fcEn = document.getElementById('fcEnText');
  const fcVi = document.getElementById('fcViText');
  const fcHint = document.getElementById('fcBackWordHint');

  if (fcEn) fcEn.innerText = item.en;
  if (fcVi) fcVi.innerText = item.vi;
  if (fcHint) fcHint.innerText = item.en;

  unlockedWordsSet.add(item.en);
  if (cardIdx > maxUnlockedIndex) {
    maxUnlockedIndex = cardIdx;
    localStorage.setItem('vt_maxUnlockedIndex', maxUnlockedIndex);
  }
  localStorage.setItem('vt_unlockedWordsSet', JSON.stringify([...unlockedWordsSet]));

  updateCardStarUI();
  updateStatsUI();

  if (autoVoice) {
    setTimeout(() => playVoiceText(item.en), 120);
  }
}

function flipActiveCard() {
  if (!flashcardDeck || flashcardDeck.length === 0) return;
  isFlipped = !isFlipped;
  const box = document.getElementById('flashcardBox');
  if (box) {
    if (isFlipped) box.classList.add('rotate-y-180');
    else box.classList.remove('rotate-y-180');
  }
}

function nextActiveCard() {
  if (!flashcardDeck || flashcardDeck.length === 0) return;
  cardIdx = (cardIdx + 1) % flashcardDeck.length;
  renderFlashcard();
}

function prevActiveCard() {
  if (!flashcardDeck || flashcardDeck.length === 0) return;
  cardIdx = (cardIdx - 1 + flashcardDeck.length) % flashcardDeck.length;
  renderFlashcard();
}

function playCardVoice() {
  if (!flashcardDeck || flashcardDeck.length === 0) return;
  const item = flashcardDeck[cardIdx];
  if (item) playVoiceText(item.en);
}

function toggleAutoVoice(val) {
  autoVoice = val;
  if (autoVoice) playCardVoice();
}

function shuffleCardDeck() {
  if (!flashcardDeck || flashcardDeck.length === 0) return;
  flashcardDeck = shuffle(flashcardDeck);
  cardIdx = 0;
  renderFlashcard();
  showToast("Đã xáo trộn ngẫu nhiên toàn bộ thẻ!");
}

function toggleStarCard() {
  if (!flashcardDeck || flashcardDeck.length === 0) return;
  const item = flashcardDeck[cardIdx];
  if (!item) return;
  if (starredWords.has(item.en)) {
    starredWords.delete(item.en);
  } else {
    starredWords.add(item.en);
  }
  localStorage.setItem('vt_starredWords', JSON.stringify([...starredWords]));
  updateCardStarUI();
  updateStatsUI();
}

function updateCardStarUI() {
  const item = flashcardDeck[cardIdx];
  const starIcon = document.querySelector('#btnCardStar i');
  if (!starIcon || !item) return;
  if (starredWords.has(item.en)) {
    starIcon.className = 'fa-solid fa-star text-amber-400';
  } else {
    starIcon.className = 'fa-regular fa-star text-slate-300';
  }
}

function toggleStarredOnlyFilter() {
  if (starredWords.size === 0) {
    showToast("Bạn chưa gắn sao từ vựng nào!");
    return;
  }
  flashcardDeck = vocabList.filter(x => starredWords.has(x.en));
  cardIdx = 0;
  switchNav('flashcards');
  renderFlashcard();
  showToast(`Đang lọc ${starredWords.size} từ gắn sao ⭐`);
}

// Quiz Engine ("Trắc nghiệm")
let quizQuestions = [];
let currentQuizIdx = 0;
let quizScore = 0;
let currentQuizQuestion = null;

function startQuizRound() {
  const pool = getGameVocabularyPool();
  if (!pool || pool.length === 0) {
    const container = document.getElementById('quizOptionsContainer');
    if (container) {
      container.innerHTML = `
        <div class="glass-card rounded-3xl p-8 border-2 border-vtGrayBorder text-center shadow-sm">
          <div class="w-14 h-14 rounded-full bg-vtPurpleLight text-vtPurple flex items-center justify-center text-2xl font-black mx-auto mb-3">
            <i class="fa-solid fa-list-check"></i>
          </div>
          <h3 class="font-black text-lg text-slate-800">Album chưa có từ vựng nào!</h3>
          <p class="text-xs font-bold text-slate-400 mt-1 mb-5">Vui lòng nạp thêm từ vựng vào Album này để làm bài Trắc nghiệm.</p>
          <button onclick="switchNav('add')" class="px-5 py-2.5 rounded-2xl btn-vt-purple text-white font-black text-xs uppercase tracking-wider cursor-pointer">
            <i class="fa-solid fa-plus-circle mr-1"></i> Nạp từ vựng ngay
          </button>
        </div>
      `;
    }
    const qWord = document.getElementById('quizQuestionWord');
    if (qWord) qWord.innerText = "Chưa có từ vựng";
    const qTotal = document.getElementById('quizTotalNum');
    if (qTotal) qTotal.innerText = 0;
    const qCurrent = document.getElementById('quizCurrentNum');
    if (qCurrent) qCurrent.innerText = 0;
    const fb = document.getElementById('quizFeedbackBanner');
    if (fb) fb.classList.add('hidden');
    const btnNext = document.getElementById('btnQuizNext');
    if (btnNext) btnNext.classList.add('hidden');
    return;
  }
  quizQuestions = shuffle(pool).slice(0, Math.min(10, pool.length));
  currentQuizIdx = 0;
  quizScore = 0;
  document.getElementById('quizTotalNum').innerText = quizQuestions.length;
  renderQuizItem();
}

function renderQuizItem() {
  if (currentQuizIdx >= quizQuestions.length) {
    updateStatsUI();
    document.getElementById('quizQuestionWord').innerText = "Hoàn thành! 🎉";

    const is100Percent = (quizScore === quizQuestions.length && quizQuestions.length > 0);

    if (is100Percent) {
      triggerConfettiCelebration();
    }

    document.getElementById('quizOptionsContainer').innerHTML = `
      <div class="glass-card rounded-3xl p-6 sm:p-8 border-2 ${is100Percent ? 'border-amber-400 ring-4 ring-amber-400/20' : 'border-vtPurple'} border-b-4 border-b-vtPurpleDark text-center shadow-lg">
        ${is100Percent ? `
          <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-white flex items-center justify-center text-3xl font-black mx-auto mb-3 shadow-md animate-bounce">
            🏆
          </div>
          <span class="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-3 py-1 rounded-full">Đạt 100% Tuyệt Đối</span>
          <h3 class="font-black text-2xl sm:text-3xl text-slate-800 mt-2">Xuất sắc! Bạn đúng ${quizScore}/${quizQuestions.length} câu! 🎉</h3>
          <p class="text-xs font-extrabold text-slate-500 mt-1 mb-5">Bạn đã thuộc lòng hoàn hảo toàn bộ bộ từ vựng này!</p>
        ` : `
          <h3 class="font-black text-2xl text-vtPurpleDark">Bạn đạt được ${quizScore}/${quizQuestions.length} điểm!</h3>
          <p class="text-xs font-bold text-slate-500 mt-1 mb-4">Các câu hỏi và lựa chọn được đảo ngẫu nhiên sau mỗi lượt.</p>
        `}
        <button onclick="startQuizRound()" class="w-full py-4 rounded-2xl btn-vt-purple text-white font-black text-sm uppercase tracking-wider shadow-md">
          <i class="fa-solid fa-shuffle mr-1"></i> Làm đề ngẫu nhiên mới
        </button>
      </div>
    `;
    document.getElementById('quizFeedbackBanner').classList.add('hidden');
    document.getElementById('btnQuizNext').classList.add('hidden');
    return;
  }

  currentQuizQuestion = quizQuestions[currentQuizIdx];
  document.getElementById('quizCurrentNum').innerText = currentQuizIdx + 1;
  document.getElementById('quizQuestionWord').innerText = currentQuizQuestion.en;
  document.getElementById('quizProgressBar').style.width = `${Math.round(((currentQuizIdx + 1) / quizQuestions.length) * 100)}%`;
  document.getElementById('quizFeedbackBanner').classList.add('hidden');
  document.getElementById('btnQuizNext').classList.add('hidden');

  const otherChoices = shuffle(vocabList.filter(x => x.en !== currentQuizQuestion.en));
  const choices = shuffle([
    currentQuizQuestion.vi,
    otherChoices[0]?.vi || "sự thay thế",
    otherChoices[1]?.vi || "quyết định",
    otherChoices[2]?.vi || "hoàn cảnh"
  ]);

  const container = document.getElementById('quizOptionsContainer');
  container.innerHTML = '';

  choices.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = "w-full text-left p-4 rounded-2xl bg-white border-2 border-vtGrayBorder border-b-4 border-b-slate-200 hover:bg-slate-50 font-extrabold text-sm text-slate-800 transition flex items-center justify-between active:translate-y-1 cursor-pointer";
    btn.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black">${idx + 1}</span>
        <span>${opt}</span>
      </div>
      <i class="fa-regular fa-circle text-slate-300"></i>
    `;
    btn.onclick = () => selectQuizChoice(btn, opt, currentQuizQuestion.vi);
    container.appendChild(btn);
  });
}

function selectQuizChoice(btn, chosen, correct) {
  document.querySelectorAll('#quizOptionsContainer button').forEach(b => b.disabled = true);
  const fb = document.getElementById('quizFeedbackBanner');
  fb.classList.remove('hidden');

  if (chosen === correct) {
    quizScore++;
    updateStatsUI();
    AudioFX.playCorrect();

    btn.className = "w-full text-left p-4 rounded-2xl bg-vtPurpleLight border-2 border-vtPurple border-b-4 border-b-vtPurpleDark font-extrabold text-sm text-vtPurpleDark flex items-center justify-between";
    btn.querySelector('i').className = 'fa-solid fa-circle-check text-vtPurple text-base';

    fb.className = "rounded-2xl p-4 mb-4 bg-vtPurpleLight border-2 border-vtPurple text-vtPurpleDark flex items-center gap-3";
    fb.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-vtPurple text-white flex items-center justify-center font-black text-lg shrink-0 shadow-[0_2px_0_var(--vt-dark)]">
        <i class="fa-solid fa-check"></i>
      </div>
      <div>
        <h4 class="font-black text-base">Chính xác! Làm tốt lắm!</h4>
        <p class="text-xs font-bold text-vtPurpleDark/80">Bạn nhớ từ vựng rất chuẩn.</p>
      </div>
    `;
  } else {
    updateStatsUI();
    AudioFX.playWrong();

    btn.className = "w-full text-left p-4 rounded-2xl bg-vtRedLight border-2 border-vtRed border-b-4 border-b-vtRedDark font-extrabold text-sm text-vtRedDark flex items-center justify-between";
    btn.querySelector('i').className = 'fa-solid fa-circle-xmark text-vtRed text-base';

    document.querySelectorAll('#quizOptionsContainer button').forEach(b => {
      if (b.innerText.includes(correct)) {
        b.className = "w-full text-left p-4 rounded-2xl bg-vtPurpleLight border-2 border-vtPurple border-b-4 border-b-vtPurpleDark font-extrabold text-sm text-vtPurpleDark flex items-center justify-between";
      }
    });

    fb.className = "rounded-2xl p-4 mb-4 bg-vtRedLight border-2 border-vtRed text-vtRedDark flex items-center gap-3";
    fb.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-vtRed text-white flex items-center justify-center font-black text-lg shrink-0 shadow-[0_2px_0_#e11d48]">
        <i class="fa-solid fa-xmark"></i>
      </div>
      <div>
        <h4 class="font-black text-base">Chưa chính xác!</h4>
        <p class="text-xs font-bold text-slate-700">Đáp án đúng là: <strong class="text-vtRedDark">${correct}</strong></p>
      </div>
    `;
  }

  document.getElementById('btnQuizNext').classList.remove('hidden');
}

function nextQuizQuestion() {
  currentQuizIdx++;
  renderQuizItem();
}

// Match Engine ("Nối từ")
let matchDeck = [];
let matchFirst = null;
let matchSecond = null;
let matchPairsRemaining = 6;
let matchSeconds = 0;
let matchInterval = null;

function startMatchGame() {
  clearInterval(matchInterval);
  matchSeconds = 0;
  matchPairsRemaining = 6;
  document.getElementById('matchTimer').innerText = "00:00";
  document.getElementById('matchVictorySheet').classList.add('hidden');

  const pool = getGameVocabularyPool();
  const grid = document.getElementById('matchCardsGrid');
  if (!pool || pool.length === 0) {
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-2 glass-card rounded-3xl p-8 border-2 border-vtGrayBorder text-center shadow-sm">
          <div class="w-14 h-14 rounded-full bg-vtPurpleLight text-vtPurple flex items-center justify-center text-2xl font-black mx-auto mb-3">
            <i class="fa-solid fa-puzzle-piece"></i>
          </div>
          <h3 class="font-black text-lg text-slate-800">Album chưa có từ vựng nào!</h3>
          <p class="text-xs font-bold text-slate-400 mt-1 mb-5">Vui lòng nạp thêm từ vựng vào Album này để chơi ghép từ.</p>
          <button onclick="switchNav('add')" class="px-5 py-2.5 rounded-2xl btn-vt-purple text-white font-black text-xs uppercase tracking-wider cursor-pointer">
            <i class="fa-solid fa-plus-circle mr-1"></i> Nạp từ vựng ngay
          </button>
        </div>
      `;
    }
    return;
  }

  matchInterval = setInterval(() => {
    matchSeconds++;
    const mins = String(Math.floor(matchSeconds / 60)).padStart(2, '0');
    const secs = String(matchSeconds % 60).padStart(2, '0');
    document.getElementById('matchTimer').innerText = `${mins}:${secs}`;
  }, 1000);

  const chosenPairs = shuffle(pool).slice(0, Math.min(6, pool.length));
  matchPairsRemaining = chosenPairs.length;

  matchDeck = [];
  chosenPairs.forEach((item, id) => {
    matchDeck.push({ id, text: item.en, type: 'en', matched: false });
    matchDeck.push({ id, text: item.vi, type: 'vi', matched: false });
  });
  matchDeck = shuffle(matchDeck);

  grid.innerHTML = '';
  matchDeck.forEach((card, index) => {
    const btn = document.createElement('button');
    btn.className = "h-20 p-2.5 rounded-2xl bg-white border-2 border-vtGrayBorder border-b-4 border-b-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm text-center flex items-center justify-center transition active:translate-y-1 cursor-pointer";
    btn.innerText = card.text;
    btn.onclick = () => handleMatchSelect(btn, card, index);
    grid.appendChild(btn);
  });
}

function handleMatchSelect(btn, card, index) {
  if (card.matched || btn.classList.contains('border-vtPurple')) return;

  if (!matchFirst) {
    matchFirst = { btn, card, index };
    btn.className = "h-20 p-2.5 rounded-2xl bg-vtPurpleLight border-2 border-vtPurple border-b-4 border-b-vtPurpleDark text-vtPurpleDark font-extrabold text-xs sm:text-sm text-center flex items-center justify-center";
  } else if (!matchSecond && matchFirst.index !== index) {
    matchSecond = { btn, card, index };
    btn.className = "h-20 p-2.5 rounded-2xl bg-vtPurpleLight border-2 border-vtPurple border-b-4 border-b-vtPurpleDark text-vtPurpleDark font-extrabold text-xs sm:text-sm text-center flex items-center justify-center";

    if (matchFirst.card.id === matchSecond.card.id && matchFirst.card.type !== matchSecond.card.type) {
      AudioFX.playCorrect();
      setTimeout(() => {
        matchFirst.btn.className = "h-20 p-2.5 rounded-2xl bg-purple-100 border-2 border-vtPurple text-vtPurpleDark font-extrabold text-xs sm:text-sm text-center flex items-center justify-center opacity-40 pointer-events-none";
        matchSecond.btn.className = "h-20 p-2.5 rounded-2xl bg-purple-100 border-2 border-vtPurple text-vtPurpleDark font-extrabold text-xs sm:text-sm text-center flex items-center justify-center opacity-40 pointer-events-none";
        matchFirst.card.matched = true;
        matchSecond.card.matched = true;
        matchPairsRemaining--;
        matchFirst = null;
        matchSecond = null;

        if (matchPairsRemaining === 0) {
          clearInterval(matchInterval);
          updateStatsUI();
          triggerConfettiCelebration();
          document.getElementById('matchRecordTime').innerText = document.getElementById('matchTimer').innerText;
          document.getElementById('matchVictorySheet').classList.remove('hidden');
        }
      }, 200);
    } else {
      AudioFX.playWrong();
      setTimeout(() => {
        matchFirst.btn.className = "h-20 p-2.5 rounded-2xl bg-white border-2 border-vtGrayBorder border-b-4 border-b-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm text-center flex items-center justify-center transition";
        matchSecond.btn.className = "h-20 p-2.5 rounded-2xl bg-white border-2 border-vtGrayBorder border-b-4 border-b-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm text-center flex items-center justify-center transition";
        matchFirst = null;
        matchSecond = null;
      }, 400);
    }
  }
}

// Keyboard Typing Engine ("Gõ từ vựng")
let typeCurrentWord = null;
let typeRoundQueue = [];
let isTypeWaitingNext = false;

function initTypeSession() {
  const pool = getGameVocabularyPool();
  if (!pool || pool.length === 0) {
    const targetVi = document.getElementById('typeTargetVi');
    if (targetVi) targetVi.innerText = "Album chưa có từ vựng nào!";
    const input = document.getElementById('typeInputWord');
    if (input) {
      input.value = '';
      input.placeholder = "Vui lòng nạp từ vựng ở mục Thêm / Word...";
      input.disabled = true;
    }
    const fb = document.getElementById('typeResultBanner');
    if (fb) fb.classList.add('hidden');
    return;
  }
  typeRoundQueue = shuffle(pool);
  loadNextTypePrompt();
}

function loadNextTypePrompt() {
  isTypeWaitingNext = false;
  const pool = getGameVocabularyPool();
  if (!pool || pool.length === 0) return;

  if (typeRoundQueue.length === 0) {
    typeRoundQueue = shuffle(pool);
  }
  typeCurrentWord = typeRoundQueue.pop();
  if (!typeCurrentWord) return;

  document.getElementById('typeTargetVi').innerText = typeCurrentWord.vi;
  document.getElementById('typeHintBadge').classList.add('hidden');

  const input = document.getElementById('typeInputWord');
  input.value = '';
  input.disabled = false;
  input.className = "w-full px-5 py-4 pr-12 rounded-2xl bg-white border-2 border-vtGrayBorder border-b-4 border-b-slate-300 focus:border-vtPurple focus:border-b-vtPurpleDark text-slate-800 font-extrabold text-base sm:text-lg outline-none transition placeholder-slate-400";
  input.focus();

  const fb = document.getElementById('typeResultBanner');
  fb.classList.add('hidden');

  const submitBtn = document.getElementById('btnTypeCheck');
  submitBtn.innerHTML = `<span>Kiểm tra</span><kbd class="text-[10px] bg-vtPurpleDark px-2 py-0.5 rounded text-white font-mono">Enter</kbd>`;
  submitBtn.className = "flex-1 py-4 rounded-2xl btn-vt-purple text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer";
}

function handleTypeCheck(e) {
  if (e) e.preventDefault();
  if (!typeCurrentWord) return;

  if (isTypeWaitingNext) {
    loadNextTypePrompt();
    return;
  }

  const input = document.getElementById('typeInputWord');
  const user = cleanWord(input.value);
  const target = cleanWord(typeCurrentWord.en);
  const fb = document.getElementById('typeResultBanner');
  const submitBtn = document.getElementById('btnTypeCheck');

  if (!user) {
    input.focus();
    return;
  }

  if (user === target) {
    typeCorrectTotal++;
    localStorage.setItem('vt_typeCorrect', typeCorrectTotal);
    updateStatsUI();
    AudioFX.playCorrect();

    input.className = "w-full px-5 py-4 pr-12 rounded-2xl bg-vtPurpleLight border-2 border-vtPurple border-b-4 border-b-vtPurpleDark text-vtPurpleDark font-extrabold text-base sm:text-lg outline-none";
    fb.className = "rounded-2xl p-4 mb-4 bg-vtPurpleLight border-2 border-vtPurple text-vtPurpleDark flex items-center gap-3";
    fb.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-vtPurple text-white flex items-center justify-center font-black text-lg shrink-0 shadow-[0_2px_0_var(--vt-dark)]">
        <i class="fa-solid fa-check"></i>
      </div>
      <div>
        <h4 class="font-black text-base">Chính xác tuyệt vời!</h4>
        <p class="text-xs font-bold text-vtPurpleDark/80">"${typeCurrentWord.en}" : ${typeCurrentWord.vi}</p>
      </div>
    `;
    fb.classList.remove('hidden');

    playVoiceText(typeCurrentWord.en);
    isTypeWaitingNext = true;

    submitBtn.innerHTML = `<span>Từ tiếp theo</span><kbd class="text-[10px] bg-vtPurpleDark px-2 py-0.5 rounded text-white font-mono">Enter</kbd>`;

  } else {
    updateStatsUI();
    AudioFX.playWrong();

    input.className = "w-full px-5 py-4 pr-12 rounded-2xl bg-vtRedLight border-2 border-vtRed border-b-4 border-b-vtRedDark text-vtRedDark font-extrabold text-base sm:text-lg outline-none";
    fb.className = "rounded-2xl p-4 mb-4 bg-vtRedLight border-2 border-vtRed text-vtRedDark flex items-center gap-3";
    fb.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-vtRed text-white flex items-center justify-center font-black text-lg shrink-0 shadow-[0_2px_0_#e11d48]">
        <i class="fa-solid fa-xmark"></i>
      </div>
      <div>
        <h4 class="font-black text-base">Chưa chính xác!</h4>
        <p class="text-xs font-bold text-slate-700">Đáp án chuẩn là: <strong class="text-vtRedDark underline">${typeCurrentWord.en}</strong></p>
      </div>
    `;
    fb.classList.remove('hidden');

    playVoiceText(typeCurrentWord.en);
    isTypeWaitingNext = true;

    submitBtn.innerHTML = `<span>Tiếp tục</span><kbd class="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-white font-mono">Enter</kbd>`;
    submitBtn.className = "flex-1 py-4 rounded-2xl bg-slate-800 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer";
  }
}

function triggerTypeFirstLetterHint() {
  if (!typeCurrentWord) return;
  const badge = document.getElementById('typeHintBadge');
  badge.innerText = `💡 Gợi ý chữ cái đầu: "${typeCurrentWord.en.charAt(0).toUpperCase()}..."`;
  badge.classList.remove('hidden');
  document.getElementById('typeInputWord').focus();
}

function skipTypeWord() {
  if (!typeCurrentWord) return;
  updateStatsUI();

  const fb = document.getElementById('typeResultBanner');
  fb.className = "rounded-2xl p-4 mb-4 bg-slate-100 border-2 border-slate-300 text-slate-700 flex items-center gap-3";
  fb.innerHTML = `
    <div class="w-10 h-10 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-black text-lg shrink-0">
      <i class="fa-solid fa-info"></i>
    </div>
    <div>
      <h4 class="font-black text-base">Đáp án của từ: <strong class="text-slate-900">${typeCurrentWord.en}</strong></h4>
      <p class="text-xs font-bold text-slate-500">${typeCurrentWord.vi}</p>
    </div>
  `;
  fb.classList.remove('hidden');

  playVoiceText(typeCurrentWord.en);
  isTypeWaitingNext = true;

  const submitBtn = document.getElementById('btnTypeCheck');
  submitBtn.innerHTML = `<span>Từ tiếp theo</span><kbd class="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-white font-mono">Enter</kbd>`;
}
