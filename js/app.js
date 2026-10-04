/* VocabTime - Main Application Controller & UI Handlers */

function updateStatsUI() {
  const total = vocabList.length;
  const unlockedCount = total > 0 ? Math.min(unlockedWordsSet.size, total) : 0;

  const elUnlocked = document.getElementById('statUnlockedWordCount');
  const elTotal = document.getElementById('statTotalWordCount');
  const elStarred = document.getElementById('statStarredCount');
  const elTypeCorrect = document.getElementById('typeCorrectCount');
  const activeAlbumLabel = document.getElementById('activeAlbumNameLabel');

  if (elUnlocked) elUnlocked.innerText = unlockedCount;
  if (elTotal) elTotal.innerText = total;
  if (elStarred) elStarred.innerText = starredWords.size;
  if (elTypeCorrect) elTypeCorrect.innerText = typeCorrectTotal;
  if (activeAlbumLabel && typeof activeAlbum !== 'undefined' && activeAlbum) {
    activeAlbumLabel.innerText = activeAlbum.name;
  }

  const elFcIdx = document.getElementById('fcCurrentIdx');
  const elFcTotal = document.getElementById('fcTotalCount');
  const elFcProgress = document.getElementById('fcProgressBar');

  if (flashcardDeck.length === 0) {
    if (elFcIdx) elFcIdx.innerText = 0;
    if (elFcTotal) elFcTotal.innerText = 0;
    if (elFcProgress) elFcProgress.style.width = '0%';
  } else {
    if (elFcIdx) elFcIdx.innerText = cardIdx + 1;
    if (elFcTotal) elFcTotal.innerText = flashcardDeck.length;
    if (elFcProgress) elFcProgress.style.width = `${Math.max(4, Math.round(((cardIdx + 1) / flashcardDeck.length) * 100))}%`;
  }

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
  showToast(globalScope === 'all' ? "Đã chuyển sang: Toàn bộ từ!" : "Đã chuyển sang: Chỉ từ đã mở khóa ở Flashcards!");
}

function switchNav(tabName) {
  const topBanners = document.getElementById('topGlobalBanners');
  if (topBanners) {
    if (tabName === 'learned' || tabName === 'albums') {
      topBanners.classList.add('hidden');
    } else {
      topBanners.classList.remove('hidden');
    }
  }

  document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));
  const activePanel = document.getElementById(`view-${tabName}`);
  if (activePanel) activePanel.classList.remove('hidden');

  document.querySelectorAll('.nav-tab').forEach(t => {
    t.className = "nav-tab py-2.5 px-3 sm:px-5 border-b-[3px] border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-1.5 font-extrabold shrink-0 cursor-pointer";
  });
  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) {
    activeTab.className = "nav-tab py-2.5 px-3 sm:px-5 border-b-[3px] border-vtPurple text-vtPurple flex items-center gap-1.5 font-extrabold shrink-0 cursor-pointer";
  }

  if (tabName === 'flashcards') {
    renderFlashcard();
  } else if (tabName === 'quiz') {
    startQuizRound();
  } else if (tabName === 'match') {
    startMatchGame();
  } else if (tabName === 'type') {
    initTypeSession();
  } else if (tabName === 'learned') {
    renderLearnedWordsList();
  } else if (tabName === 'albums') {
    renderAlbumsList();
  }
  updateStatsUI();
}

function renderLearnedWordsList() {
  const container = document.getElementById('learnedWordsListContainer');
  const nameLabel = document.getElementById('learnedAlbumNameLabel');
  const countBadge = document.getElementById('learnedCountBadge');
  const searchInput = document.getElementById('learnedSearchInput');

  if (!container) return;

  if (typeof activeAlbum !== 'undefined' && activeAlbum) {
    if (nameLabel) nameLabel.innerText = activeAlbum.name;
  }

  if (typeof vocabList === 'undefined' || !vocabList || typeof unlockedWordsSet === 'undefined') {
    container.innerHTML = `<p class="text-xs text-slate-400 font-bold text-center py-6">Chưa có dữ liệu từ vựng.</p>`;
    return;
  }

  // Lấy danh sách từ đã học chỉ thuộc Album hiện tại
  const allLearned = vocabList.filter(w => unlockedWordsSet.has(w.en));
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  if (countBadge) {
    countBadge.innerHTML = `<i class="fa-solid fa-graduation-cap mr-1"></i> ${allLearned.length} / ${vocabList.length} từ đã học`;
  }

  const filtered = query
    ? allLearned.filter(w => (w.en && w.en.toLowerCase().includes(query)) || (w.vi && w.vi.toLowerCase().includes(query)))
    : allLearned;

  if (allLearned.length === 0) {
    container.innerHTML = `
      <div class="glass-card rounded-3xl p-8 border-2 border-vtGrayBorder text-center shadow-xs">
        <div class="w-14 h-14 rounded-full bg-vtPurpleLight text-vtPurple flex items-center justify-center text-2xl font-black mx-auto mb-3">
          <i class="fa-solid fa-book-open"></i>
        </div>
        <h3 class="font-black text-lg text-slate-800">Chưa có từ nào được học trong Album này!</h3>
        <p class="text-xs font-bold text-slate-400 mt-1 mb-5">Hãy lướt qua các thẻ từ Flashcard để tự động mở khóa & nạp từ vựng vào danh sách tiến trình.</p>
        <button onclick="switchNav('flashcards')" class="px-6 py-3 rounded-2xl btn-vt-purple text-white font-black text-xs uppercase tracking-wider cursor-pointer">
          <i class="fa-solid fa-play mr-1"></i> Học Flashcard ngay
        </button>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-card rounded-3xl p-6 border-2 border-vtGrayBorder text-center shadow-xs">
        <p class="text-xs font-bold text-slate-500">Không tìm thấy từ vựng nào khớp với từ khóa "${query}".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filtered.forEach(item => {
    const isStarred = typeof starredWords !== 'undefined' && starredWords.has(item.en);

    const card = document.createElement('div');
    card.className = "glass-card rounded-2xl p-4 border-2 border-vtGrayBorder border-b-4 border-b-slate-200 hover:border-vtPurple transition flex items-center justify-between gap-3";

    card.innerHTML = `
      <div class="flex items-center gap-3 overflow-hidden">
        <button onclick="playVoiceText('${item.en.replace(/'/g, "\\'")}')" class="w-10 h-10 rounded-xl bg-vtPurpleLight hover:bg-vtPurple text-vtPurple hover:text-white flex items-center justify-center text-sm font-black shrink-0 transition cursor-pointer" title="Phát âm tiếng Anh">
          <i class="fa-solid fa-volume-high"></i>
        </button>
        <div class="truncate">
          <div class="flex items-center gap-2">
            <h4 class="font-black text-base text-slate-800 tracking-tight truncate">${item.en}</h4>
            ${item.phonetic ? `<span class="text-xs font-semibold text-slate-400 shrink-0">${item.phonetic}</span>` : ''}
          </div>
          <p class="text-xs font-bold text-vtPurpleDark mt-0.5 line-clamp-1">${item.vi}</p>
          ${item.example ? `<p class="text-[11px] font-semibold text-slate-400 italic mt-0.5 line-clamp-1">"${item.example}"</p>` : ''}
        </div>
      </div>

      <button onclick="toggleStarLearnedWord('${item.en.replace(/'/g, "\\'")}')" class="w-9 h-9 rounded-xl ${isStarred ? 'bg-amber-100 text-amber-500 border border-amber-300' : 'bg-slate-100 text-slate-400 hover:text-amber-500'} flex items-center justify-center text-sm transition shrink-0 cursor-pointer" title="${isStarred ? 'Bỏ gắn sao' : 'Gắn sao ghi nhớ'}">
        <i class="fa-solid fa-star"></i>
      </button>
    `;
    container.appendChild(card);
  });
}

function toggleStarLearnedWord(enWord) {
  if (typeof starredWords === 'undefined') return;
  if (starredWords.has(enWord)) {
    starredWords.delete(enWord);
  } else {
    starredWords.add(enWord);
  }
  if (typeof saveAllData === 'function') saveAllData();
  else if (typeof updateStatsUI === 'function') updateStatsUI();
  renderLearnedWordsList();
}

function renderAlbumsList() {
  const container = document.getElementById('albumsGrid');
  const activeLabel = document.getElementById('activeAlbumNameLabel');
  if (activeLabel && typeof activeAlbum !== 'undefined' && activeAlbum) {
    activeLabel.innerText = activeAlbum.name;
  }
  if (!container || typeof albums === 'undefined') return;

  container.innerHTML = '';
  albums.forEach(album => {
    const isActive = album.id === activeAlbumId;
    const wordCount = (album.vocabList || []).length;
    const unlockedCount = wordCount > 0 ? Math.min((album.unlockedWordsSet || []).length, wordCount) : 0;
    const progressPercent = wordCount > 0 ? Math.min(100, Math.round((unlockedCount / wordCount) * 100)) : 0;

    const card = document.createElement('div');
    card.className = `glass-card rounded-3xl p-5 border-2 transition-all duration-200 relative flex flex-col justify-between ${
      isActive 
        ? 'border-vtPurple bg-vtPurpleLight/40 shadow-md ring-2 ring-vtPurple/30' 
        : 'border-vtGrayBorder border-b-4 border-b-slate-200 hover:border-slate-300'
    }`;

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="w-12 h-12 rounded-2xl ${isActive ? 'bg-vtPurple text-white shadow-[0_2px_0_var(--vt-dark)]' : 'bg-slate-100 text-slate-600'} flex items-center justify-center text-xl font-black shrink-0">
              <i class="fa-solid ${album.icon || 'fa-folder-closed'}"></i>
            </div>
            <div class="truncate">
              <h3 class="font-black text-base text-slate-800 tracking-tight truncate">${album.name}</h3>
              <p class="text-xs font-semibold text-slate-400 mt-0.5 line-clamp-1">${album.description || 'Album từ vựng'}</p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button onclick="openRenameAlbumModal('${album.id}')" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-vtPurple flex items-center justify-center text-xs transition cursor-pointer" title="Đổi tên Album">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="deleteAlbum('${album.id}')" class="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-xs transition cursor-pointer" title="Xóa Album">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        <div class="space-y-2 my-4">
          <div class="flex justify-between text-xs font-extrabold">
            <span class="text-slate-500"><i class="fa-solid fa-book-open mr-1 text-vtPurple"></i> ${wordCount} từ vựng</span>
            <span class="text-vtPurpleDark">${unlockedCount} từ đã xem (${progressPercent}%)</span>
          </div>
          <div class="w-full h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
            <div class="h-full bg-vtPurple transition-all duration-300" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
        ${isActive ? `
          <button onclick="switchNav('flashcards')" class="w-full py-2.5 rounded-2xl btn-vt-purple text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-play"></i> Học Album này ngay
          </button>
        ` : `
          <button onclick="switchActiveAlbum('${album.id}')" class="w-full py-2.5 rounded-2xl bg-white border-2 border-slate-200 hover:border-vtPurple text-slate-700 hover:text-vtPurple font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs">
            <i class="fa-solid fa-check"></i> Chọn Album này
          </button>
        `}
      </div>
    `;

    container.appendChild(card);
  });
}

function openCreateAlbumModal() {
  document.getElementById('createAlbumModal').classList.remove('hidden');
}

function closeCreateAlbumModal(e) {
  if (!e || e.target === document.getElementById('createAlbumModal')) {
    document.getElementById('createAlbumModal').classList.add('hidden');
  }
}

function handleCreateAlbumSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('newAlbumNameInput').value;
  const desc = document.getElementById('newAlbumDescInput').value;
  if (!name.trim()) return;

  createNewAlbum(name, desc);
  document.getElementById('newAlbumNameInput').value = '';
  document.getElementById('newAlbumDescInput').value = '';
  closeCreateAlbumModal();
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

let editingAlbumId = null;

function openRenameAlbumModal(albumId) {
  const target = albums.find(a => a.id === albumId);
  if (!target) return;
  editingAlbumId = albumId;
  const nameInput = document.getElementById('renameAlbumNameInput');
  const descInput = document.getElementById('renameAlbumDescInput');
  if (nameInput) nameInput.value = target.name || '';
  if (descInput) descInput.value = target.description || '';
  
  const modal = document.getElementById('renameAlbumModal');
  if (modal) modal.classList.remove('hidden');
}

function closeRenameAlbumModal(e) {
  if (e && e.target !== e.currentTarget && e.target.tagName !== 'BUTTON' && !e.target.closest('button')) return;
  const modal = document.getElementById('renameAlbumModal');
  if (modal) modal.classList.add('hidden');
  editingAlbumId = null;
}

function handleRenameAlbumSubmit(e) {
  if (e) e.preventDefault();
  if (!editingAlbumId) return;
  const nameInput = document.getElementById('renameAlbumNameInput');
  const descInput = document.getElementById('renameAlbumDescInput');
  if (!nameInput || !nameInput.value.trim()) return;

  renameAlbum(editingAlbumId, nameInput.value.trim(), descInput ? descInput.value.trim() : '');
  closeRenameAlbumModal();
}

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentThemeId);
  applyGlassOpacity(glassOpacity);
  initCustomBackground();
  updateStatsUI();
  renderFlashcard();
  if (typeof renderAlbumsList === 'function') {
    renderAlbumsList();
  }
  if (typeof initAuthListener === 'function') {
    initAuthListener();
  }
});
