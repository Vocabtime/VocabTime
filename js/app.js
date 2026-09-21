/* VocabTime - Main Application Controller & UI Handlers */

function updateStatsUI() {
  const total = vocabList.length;
  const unlockedCount = Math.max(MIN_UNLOCKED, unlockedWordsSet.size);

  const elUnlocked = document.getElementById('statUnlockedWordCount');
  const elTotal = document.getElementById('statTotalWordCount');
  const elStarred = document.getElementById('statStarredCount');
  const elTypeCorrect = document.getElementById('typeCorrectCount');

  if (elUnlocked) elUnlocked.innerText = Math.min(unlockedCount, total);
  if (elTotal) elTotal.innerText = total;
  if (elStarred) elStarred.innerText = starredWords.size;
  if (elTypeCorrect) elTypeCorrect.innerText = typeCorrectTotal;

  const elFcIdx = document.getElementById('fcCurrentIdx');
  const elFcTotal = document.getElementById('fcTotalCount');
  const elFcProgress = document.getElementById('fcProgressBar');

  if (elFcIdx) elFcIdx.innerText = cardIdx + 1;
  if (elFcTotal) elFcTotal.innerText = flashcardDeck.length;
  if (elFcProgress) elFcProgress.style.width = `${Math.max(4, Math.round(((cardIdx + 1) / flashcardDeck.length) * 100))}%`;

  const scopeLabel = document.getElementById('scopeNoticeLabel');
  const btnScope = document.getElementById('btnScopeToggle');
  if (scopeLabel && btnScope) {
    if (globalScope === 'all') {
      scopeLabel.innerText = `Toàn bộ ${total} từ vựng`;
      scopeLabel.className = 'text-vtPurple font-extrabold';
      btnScope.innerText = 'Chỉ từ đã học';
    } else {
      scopeLabel.innerText = `${unlockedCount} từ đã học qua Flashcard`;
      scopeLabel.className = 'text-vtPurpleDark font-extrabold';
      btnScope.innerText = 'Tất cả từ';
    }
  }
}

function toggleGlobalScopeMode() {
  globalScope = globalScope === 'unlocked' ? 'all' : 'unlocked';
  localStorage.setItem('vt_scope', globalScope);
  updateStatsUI();
  showToast(globalScope === 'all' ? "Đã chuyển sang: Toàn bộ 167 từ!" : "Đã chuyển sang: Chỉ từ đã mở khóa ở Flashcards!");
}

function switchNav(tabName) {
  document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));
  const activePanel = document.getElementById(`view-${tabName}`);
  if (activePanel) activePanel.classList.remove('hidden');

  document.querySelectorAll('.nav-tab').forEach(t => {
    t.className = "nav-tab py-2.5 px-3 sm:px-5 border-b-[3px] border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-1.5 font-extrabold shrink-0";
  });
  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) {
    activeTab.className = "nav-tab py-2.5 px-3 sm:px-5 border-b-[3px] border-vtPurple text-vtPurple flex items-center gap-1.5 font-extrabold shrink-0";
  }

  if (tabName === 'flashcards') {
    renderFlashcard();
  } else if (tabName === 'quiz') {
    startQuizRound();
  } else if (tabName === 'match') {
    startMatchGame();
  } else if (tabName === 'type') {
    initTypeSession();
  }
  updateStatsUI();
}

// Word Manager & Batch Import (.DOCX / .TXT)
let bufferImportWords = [];

function handleSingleWordAdd(e) {
  e.preventDefault();
  const en = document.getElementById('newEnWordInput').value.trim();
  const vi = document.getElementById('newViWordInput').value.trim();

  if (!en || !vi) return;

  const exists = vocabList.some(x => x.en.toLowerCase() === en.toLowerCase());
  if (exists) {
    showToast(`Từ "${en}" đã có trong danh sách!`);
    return;
  }

  vocabList.push({ en, vi });
  unlockedWordsSet.add(en);
  saveAllData();

  document.getElementById('newEnWordInput').value = '';
  document.getElementById('newViWordInput').value = '';

  const toast = document.getElementById('singleWordSuccessToast');
  toast.innerText = `Đã thêm thành công: "${en}" - ${vi}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

function parseTextIntoVocab(raw) {
  const lines = raw.split(/\r?\n/);
  const result = [];

  lines.forEach(line => {
    let clean = line.trim();
    if (!clean) return;
    clean = clean.replace(/^[\s\–\-\—\•\*\d+\.\)]+/, '').trim();
    if (!clean) return;

    let parts = null;
    if (clean.includes(' - ')) parts = clean.split(' - ');
    else if (clean.includes(' – ')) parts = clean.split(' – ');
    else if (clean.includes(' — ')) parts = clean.split(' — ');
    else if (clean.includes(' : ')) parts = clean.split(' : ');
    else if (clean.includes(':')) parts = clean.split(':');
    else if (clean.includes('\t')) parts = clean.split('\t');

    if (parts && parts.length >= 2) {
      const en = parts[0].trim();
      const vi = parts.slice(1).join(' - ').trim();
      if (en && vi && !en.startsWith('http')) {
        result.push({ en, vi });
      }
    }
  });
  return result;
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const msg = document.getElementById('uploadStatusMessage');
  msg.className = "mt-3 p-3 rounded-xl text-xs font-bold text-center bg-purple-50 border border-vtPurple text-vtPurpleDark block";
  msg.innerText = `Đang đọc file "${file.name}"...`;

  if (file.name.toLowerCase().endsWith('.docx')) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      if (window.mammoth) {
        window.mammoth.extractRawText({ arrayBuffer: evt.target.result })
          .then(res => handleRawExtractedText(res.value))
          .catch(err => {
            msg.className = "mt-3 p-3 rounded-xl text-xs font-bold text-center bg-rose-50 border border-rose-300 text-rose-800 block";
            msg.innerText = "Lỗi khi đọc file Word: " + err.message;
          });
      } else {
        msg.className = "mt-3 p-3 rounded-xl text-xs font-bold text-center bg-rose-50 border border-rose-300 text-rose-800 block";
        msg.innerText = "Thư viện Mammoth.js chưa sẵn sàng.";
      }
    };
    reader.readAsArrayBuffer(file);
  } else if (file.name.toLowerCase().endsWith('.txt')) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      handleRawExtractedText(evt.target.result);
    };
    reader.readAsText(file, 'UTF-8');
  } else {
    msg.className = "mt-3 p-3 rounded-xl text-xs font-bold text-center bg-rose-50 border border-rose-300 text-rose-800 block";
    msg.innerText = "Vui lòng chọn file .docx hoặc .txt";
  }
}

function pasteSampleList() {
  document.getElementById('pasteTextarea').value = 
`– artificial intelligence - trí tuệ nhân tạo
– machine learning - học máy
– database - cơ sở dữ liệu`;
}

function processPastedContent() {
  const text = document.getElementById('pasteTextarea').value;
  if (!text.trim()) {
    showToast("Vui lòng dán văn bản từ vựng vào ô trước!");
    return;
  }
  handleRawExtractedText(text);
}

function handleRawExtractedText(raw) {
  const parsed = parseTextIntoVocab(raw);
  const msg = document.getElementById('uploadStatusMessage');

  if (parsed.length === 0) {
    msg.className = "mt-3 p-3 rounded-xl text-xs font-bold text-center bg-amber-50 border border-amber-300 text-amber-800 block";
    msg.innerText = "Không tìm thấy từ vựng hợp lệ theo định dạng 'Từ - Nghĩa'.";
    return;
  }

  bufferImportWords = parsed.filter(item => 
    !vocabList.some(exist => exist.en.toLowerCase() === item.en.toLowerCase())
  );

  msg.className = "mt-3 p-3 rounded-xl text-xs font-bold text-center bg-vtPurpleLight border border-vtPurple text-vtPurpleDark block";
  msg.innerText = `Tìm thấy ${parsed.length} từ (${bufferImportWords.length} từ mới chưa có trong danh sách).`;

  const drawer = document.getElementById('importPreviewDrawer');
  const list = document.getElementById('previewItemsList');
  document.getElementById('previewCountText').innerText = bufferImportWords.length;
  list.innerHTML = '';

  if (bufferImportWords.length === 0) {
    list.innerHTML = '<p class="py-3 text-center text-slate-400">Tất cả các từ này đã có sẵn trong bộ từ vựng của bạn.</p>';
  } else {
    bufferImportWords.forEach(item => {
      const row = document.createElement('div');
      row.className = "py-2 flex items-center justify-between";
      row.innerHTML = `
        <span class="text-slate-800 font-extrabold">${item.en}</span>
        <span class="text-slate-500 font-semibold">${item.vi}</span>
      `;
      list.appendChild(row);
    });
  }

  drawer.classList.remove('hidden');
}

function confirmBatchImport() {
  if (bufferImportWords.length === 0) {
    document.getElementById('importPreviewDrawer').classList.add('hidden');
    return;
  }
  vocabList.push(...bufferImportWords);
  bufferImportWords.forEach(w => unlockedWordsSet.add(w.en));
  saveAllData();
  showToast(`Đã thêm thành công ${bufferImportWords.length} từ mới!`);
  bufferImportWords = [];
  document.getElementById('importPreviewDrawer').classList.add('hidden');
  document.getElementById('pasteTextarea').value = '';
}

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  const fcView = document.getElementById('view-flashcards');
  if (fcView && !fcView.classList.contains('hidden')) {
    if (e.code === 'Space') {
      e.preventDefault();
      flipActiveCard();
    } else if (e.code === 'ArrowRight') {
      nextActiveCard();
    } else if (e.code === 'ArrowLeft') {
      prevActiveCard();
    }
  }
});

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentThemeId);
  applyGlassOpacity(glassOpacity);
  initCustomBackground();
  updateStatsUI();
  renderFlashcard();
  if (typeof initAuthListener === 'function') {
    initAuthListener();
  }
});
