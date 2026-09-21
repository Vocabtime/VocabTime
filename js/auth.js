/* VocabTime - Authentication & Cloud Firestore Sync Engine */

let currentUser = null;
let cloudSyncTimeout = null;

// Google Sign-In Trigger
function loginWithGoogle() {
  if (!initFirebase()) {
    showToast("Vui lòng cấu hình Firebase Web Config trong file js/firebase-config.js để sử dụng Đăng nhập!");
    openSettingsModal();
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      showToast(`Chào mừng ${result.user.displayName || 'bạn'} đã đăng nhập!`);
    })
    .catch((error) => {
      console.error("Google Sign-In Error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        showToast("Đăng nhập Google thất bại: " + error.message);
      }
    });
}

// Sign-Out Trigger
function logoutUser() {
  if (firebaseAuth) {
    firebaseAuth.signOut().then(() => {
      showToast("Đã đăng xuất thành công!");
    }).catch((err) => {
      console.error("Logout Error:", err);
    });
  } else {
    currentUser = null;
    clearUserDataToGuest();
    updateAuthUI();
    showToast("Đã đăng xuất khỏi chế độ Khách!");
  }
}

// Authentication State Listener
function initAuthListener() {
  if (!initFirebase()) {
    updateAuthUI();
    return;
  }

  firebaseAuth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = {
        uid: user.uid,
        displayName: user.displayName || 'Người dùng',
        email: user.email || '',
        photoURL: user.photoURL || ''
      };
      console.log("Logged in user UID:", user.uid);
      updateAuthUI();
      loadUserProgressFromCloud(user.uid);
    } else {
      currentUser = null;
      console.log("User signed out.");
      clearUserDataToGuest();
      updateAuthUI();
    }
  });
}

// Load Progress from Cloud Firestore Document users/{uid}
function loadUserProgressFromCloud(uid) {
  if (!firebaseDb) return;

  const userDocRef = firebaseDb.collection('users').doc(uid);
  
  userDocRef.get().then((doc) => {
    if (doc.exists) {
      const data = doc.data();
      console.log("Cloud progress loaded for UID:", uid);
      loadCloudStateIntoMemory(data);
    } else {
      console.log("Creating new cloud document for UID:", uid);
      saveUserProgressToCloud(true);
    }
  }).catch((err) => {
    console.error("Error loading progress from Cloud Firestore:", err);
    showToast("Lỗi khi tải dữ liệu từ Cloud: " + err.message);
  });
}

// Populate Memory State & UI from Cloud Data
function loadCloudStateIntoMemory(data) {
  if (data.vocabList && Array.isArray(data.vocabList)) {
    vocabList = data.vocabList;
  }
  if (data.unlockedWordsSet && Array.isArray(data.unlockedWordsSet)) {
    unlockedWordsSet = new Set(data.unlockedWordsSet);
  }
  if (data.starredWords && Array.isArray(data.starredWords)) {
    starredWords = new Set(data.starredWords);
  }
  if (typeof data.maxUnlockedIndex === 'number') {
    maxUnlockedIndex = data.maxUnlockedIndex;
  }
  if (typeof data.typeCorrectTotal === 'number') {
    typeCorrectTotal = data.typeCorrectTotal;
  }
  if (data.globalScope) {
    globalScope = data.globalScope;
  }
  if (data.themeId) {
    applyTheme(data.themeId);
  }
  if (typeof data.glassOpacity === 'number') {
    applyGlassOpacity(data.glassOpacity);
  }
  if (typeof data.mistIndex === 'number') {
    currentMistIdx = data.mistIndex;
    applyMistStyle();
  }
  if (data.customBg) {
    localStorage.setItem('vt_custom_bg', data.customBg);
    initCustomBackground();
  } else {
    localStorage.removeItem('vt_custom_bg');
    initCustomBackground();
  }

  flashcardDeck = [...vocabList];
  cardIdx = 0;
  updateStatsUI();
  renderFlashcard();
}

// Clear User State when Logged Out (No Data Leaks)
function clearUserDataToGuest() {
  vocabList = JSON.parse(localStorage.getItem('vt_vocabList')) || initialVocabularyList;
  starredWords = new Set(JSON.parse(localStorage.getItem('vt_starredWords')) || []);
  typeCorrectTotal = parseInt(localStorage.getItem('vt_typeCorrect')) || 0;
  maxUnlockedIndex = parseInt(localStorage.getItem('vt_maxUnlockedIndex')) || (MIN_UNLOCKED - 1);
  unlockedWordsSet = new Set(JSON.parse(localStorage.getItem('vt_unlockedWordsSet')) || []);
  globalScope = localStorage.getItem('vt_scope') || 'unlocked';
  
  flashcardDeck = [...vocabList];
  cardIdx = 0;
  
  updateStatsUI();
  renderFlashcard();
}

// Save User Progress to Cloud Firestore Document users/{uid}
function saveUserProgressToCloud(immediate = false) {
  if (!currentUser || !firebaseDb) return;

  if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);

  const doSync = () => {
    const payload = {
      displayName: currentUser.displayName,
      email: currentUser.email,
      photoURL: currentUser.photoURL,
      vocabList: vocabList,
      unlockedWordsSet: Array.from(unlockedWordsSet),
      starredWords: Array.from(starredWords),
      maxUnlockedIndex: maxUnlockedIndex,
      typeCorrectTotal: typeCorrectTotal,
      globalScope: globalScope,
      themeId: currentThemeId,
      glassOpacity: glassOpacity,
      mistIndex: currentMistIdx,
      customBg: localStorage.getItem('vt_custom_bg') || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    firebaseDb.collection('users').doc(currentUser.uid).set(payload, { merge: true })
      .then(() => {
        console.log("Cloud progress saved successfully for UID:", currentUser.uid);
      })
      .catch((err) => {
        console.error("Error saving user progress to Cloud Firestore:", err);
      });
  };

  if (immediate) {
    doSync();
  } else {
    cloudSyncTimeout = setTimeout(doSync, 1200);
  }
}

// Update User Account UI (Header Badge & Settings Modal Account Status)
function updateAuthUI() {
  const authContainer = document.getElementById('userAuthArea');
  const modalAuthArea = document.getElementById('settingsModalAuthSection');

  if (currentUser) {
    const avatar = currentUser.photoURL || 'https://www.gstatic.com/images/branding/product/2x/avatar_square_blue_120dp.png';
    
    if (authContainer) {
      authContainer.innerHTML = `
        <div onclick="openSettingsModal()" class="flex items-center gap-2 cursor-pointer bg-white/90 hover:bg-white px-2.5 py-1 rounded-2xl border-2 border-slate-200 hover:border-vtPurple shadow-2xs transition" title="Tài khoản: ${currentUser.displayName}">
          <img src="${avatar}" alt="Avatar" class="w-6 h-6 rounded-full object-cover border border-vtPurple shrink-0" onerror="this.src='https://www.gstatic.com/images/branding/product/2x/avatar_square_blue_120dp.png'" />
          <span class="font-extrabold text-xs text-slate-800 truncate max-w-[90px] sm:max-w-[120px]">${currentUser.displayName}</span>
        </div>
      `;
    }

    if (modalAuthArea) {
      modalAuthArea.innerHTML = `
        <div class="p-3.5 rounded-2xl bg-vtPurpleLight border-2 border-vtPurple flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 overflow-hidden">
            <img src="${avatar}" alt="Avatar" class="w-10 h-10 rounded-full object-cover border-2 border-vtPurple shrink-0" onerror="this.src='https://www.gstatic.com/images/branding/product/2x/avatar_square_blue_120dp.png'" />
            <div class="truncate">
              <h5 class="font-black text-sm text-slate-800 truncate">${currentUser.displayName}</h5>
              <p class="text-[11px] font-bold text-vtPurpleDark truncate">${currentUser.email}</p>
              <span class="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-0.5">
                <i class="fa-solid fa-cloud-arrow-up mr-1"></i> Đã đồng bộ Cloud
              </span>
            </div>
          </div>
          <button onclick="logoutUser()" class="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-black shrink-0 cursor-pointer shadow-2xs">
            <i class="fa-solid fa-right-from-bracket mr-1"></i> Đăng xuất
          </button>
        </div>
      `;
    }

  } else {
    if (authContainer) {
      authContainer.innerHTML = `
        <button onclick="loginWithGoogle()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-slate-200 hover:border-vtPurple text-slate-700 hover:text-vtPurple font-extrabold text-xs shadow-2xs transition cursor-pointer" title="Đăng nhập tài khoản Google">
          <i class="fa-brands fa-google text-vtPurple text-sm"></i>
          <span class="hidden sm:inline">Đăng nhập</span>
        </button>
      `;
    }

    if (modalAuthArea) {
      modalAuthArea.innerHTML = `
        <div class="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h5 class="font-black text-sm text-slate-800">Chế độ Khách (Offline)</h5>
            <p class="text-[11px] font-semibold text-slate-400">Đăng nhập Google để sao lưu tiến trình học lên Cloud.</p>
          </div>
          <button onclick="loginWithGoogle()" class="px-3.5 py-2 rounded-xl btn-vt-purple text-white font-black text-xs shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs">
            <i class="fa-brands fa-google"></i> Đăng nhập
          </button>
        </div>
      `;
    }
  }
}
