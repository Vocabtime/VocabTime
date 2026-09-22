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
      console.error("Google Sign-In Error Details:", error.code, error.message, error);
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

let firestoreUnsubscribe = null;
let isRemoteUpdating = false;

// Load Progress from Cloud Firestore Document users/{uid} with Real-Time Sync
function loadUserProgressFromCloud(uid) {
  if (!firebaseDb) return;

  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }

  const userDocRef = firebaseDb.collection('users').doc(uid);
  
  firestoreUnsubscribe = userDocRef.onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      console.log("Real-time Cloud progress update received for UID:", uid);
      isRemoteUpdating = true;
      loadCloudStateIntoMemory(data);
      isRemoteUpdating = false;
    } else {
      console.log("First-time login: creating new cloud document for UID:", uid);
      saveUserProgressToCloud(true);
    }
  }, (err) => {
    console.error("Error loading progress from Cloud Firestore:", err);
    showToast("Lỗi khi kết nối Cloud: " + err.message);
  });
}

// Populate Memory State & UI from Cloud Data
function loadCloudStateIntoMemory(data) {
  if (!data) return;

  // 1. Sync Albums list
  if (data.albums && Array.isArray(data.albums) && data.albums.length > 0) {
    albums = data.albums;
    localStorage.setItem('vt_albums', JSON.stringify(albums));
  }

  // 2. Sync Active Album ID
  if (data.activeAlbumId) {
    activeAlbumId = data.activeAlbumId;
    localStorage.setItem('vt_activeAlbumId', activeAlbumId);
  }

  // 3. Sync Active Album pointer
  activeAlbum = albums.find(a => a.id === activeAlbumId) || albums[0];
  if (activeAlbum) activeAlbumId = activeAlbum.id;

  // 4. Merge/Set Active Album vocabulary & progress
  if (data.vocabList && Array.isArray(data.vocabList)) {
    vocabList = data.vocabList;
  } else if (activeAlbum && activeAlbum.vocabList) {
    vocabList = activeAlbum.vocabList;
  }

  if (data.unlockedWordsSet && Array.isArray(data.unlockedWordsSet)) {
    unlockedWordsSet = new Set(data.unlockedWordsSet);
  } else if (activeAlbum && activeAlbum.unlockedWordsSet) {
    unlockedWordsSet = new Set(activeAlbum.unlockedWordsSet);
  }

  if (data.starredWords && Array.isArray(data.starredWords)) {
    starredWords = new Set(data.starredWords);
  } else if (activeAlbum && activeAlbum.starredWords) {
    starredWords = new Set(activeAlbum.starredWords);
  }

  if (typeof data.maxUnlockedIndex === 'number') {
    maxUnlockedIndex = data.maxUnlockedIndex;
  } else if (activeAlbum && typeof activeAlbum.maxUnlockedIndex === 'number') {
    maxUnlockedIndex = activeAlbum.maxUnlockedIndex;
  }

  if (typeof data.typeCorrectTotal === 'number') {
    typeCorrectTotal = data.typeCorrectTotal;
    localStorage.setItem('vt_typeCorrect', typeCorrectTotal);
  }

  if (data.globalScope) {
    globalScope = data.globalScope;
    localStorage.setItem('vt_scope', globalScope);
  }

  // 5. Sync activeAlbum properties back into memory
  if (activeAlbum) {
    activeAlbum.vocabList = vocabList;
    activeAlbum.unlockedWordsSet = Array.from(unlockedWordsSet);
    activeAlbum.starredWords = Array.from(starredWords);
    activeAlbum.maxUnlockedIndex = maxUnlockedIndex;
  }

  // 6. Save merged state to localStorage
  localStorage.setItem('vt_albums', JSON.stringify(albums));
  localStorage.setItem('vt_activeAlbumId', activeAlbumId);
  localStorage.setItem('vt_vocabList', JSON.stringify(vocabList));
  localStorage.setItem('vt_unlockedWordsSet', JSON.stringify([...unlockedWordsSet]));
  localStorage.setItem('vt_starredWords', JSON.stringify([...starredWords]));
  localStorage.setItem('vt_maxUnlockedIndex', maxUnlockedIndex);

  // 7. Apply Settings & Theme
  if (data.themeId && typeof applyTheme === 'function') applyTheme(data.themeId);
  if (typeof data.glassOpacity === 'number' && typeof applyGlassOpacity === 'function') applyGlassOpacity(data.glassOpacity);
  if (typeof data.mistIndex === 'number' && typeof applyMistStyle === 'function') {
    currentMistIdx = data.mistIndex;
    applyMistStyle();
  }
  if (data.customBg) {
    localStorage.setItem('vt_custom_bg', data.customBg);
    if (typeof initCustomBackground === 'function') initCustomBackground();
  } else {
    localStorage.removeItem('vt_custom_bg');
    if (typeof initCustomBackground === 'function') initCustomBackground();
  }

  // 8. Update UI
  flashcardDeck = [...vocabList];
  if (typeof cardIdx === 'undefined' || cardIdx >= flashcardDeck.length) cardIdx = 0;
  if (typeof updateStatsUI === 'function') updateStatsUI();
  if (typeof renderFlashcard === 'function') renderFlashcard();
  if (typeof renderAlbumsList === 'function') renderAlbumsList();
}

// Clear User State when Logged Out (No Data Leaks)
function clearUserDataToGuest() {
  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }
  albums = JSON.parse(localStorage.getItem('vt_albums')) || [defaultInitialAlbum];
  activeAlbumId = localStorage.getItem('vt_activeAlbumId') || albums[0].id;
  syncActiveAlbumState();
  globalScope = localStorage.getItem('vt_scope') || 'unlocked';
  
  flashcardDeck = [...vocabList];
  cardIdx = 0;
  
  updateStatsUI();
  renderFlashcard();
  if (typeof renderAlbumsList === 'function') renderAlbumsList();
}

// Save User Progress to Cloud Firestore Document users/{uid}
function saveUserProgressToCloud(immediate = false) {
  if (!currentUser || !firebaseDb || isRemoteUpdating) return;

  if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);

  const doSync = () => {
    if (typeof activeAlbum !== 'undefined' && activeAlbum) {
      activeAlbum.vocabList = vocabList;
      activeAlbum.unlockedWordsSet = Array.from(unlockedWordsSet);
      activeAlbum.starredWords = Array.from(starredWords);
      activeAlbum.maxUnlockedIndex = maxUnlockedIndex;
    }

    const payload = {
      displayName: currentUser.displayName || '',
      email: currentUser.email || '',
      photoURL: currentUser.photoURL || '',
      albums: albums,
      activeAlbumId: activeAlbumId,
      vocabList: vocabList,
      unlockedWordsSet: Array.from(unlockedWordsSet),
      starredWords: Array.from(starredWords),
      maxUnlockedIndex: maxUnlockedIndex,
      typeCorrectTotal: typeCorrectTotal,
      globalScope: globalScope,
      themeId: typeof currentThemeId !== 'undefined' ? currentThemeId : 'purple',
      glassOpacity: typeof glassOpacity !== 'undefined' ? glassOpacity : 0.82,
      mistIndex: typeof currentMistIdx !== 'undefined' ? currentMistIdx : 0,
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
    cloudSyncTimeout = setTimeout(doSync, 600);
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
        <button onclick="openSettingsModal()" class="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-white border-2 border-vtGrayBorder hover:border-vtPurple p-0.5 flex items-center justify-center transition shadow-2xs cursor-pointer overflow-hidden shrink-0" title="Tài khoản: ${currentUser.displayName}">
          <img src="${avatar}" alt="${currentUser.displayName}" class="w-full h-full rounded-xl object-cover" onerror="this.src='https://www.gstatic.com/images/branding/product/2x/avatar_square_blue_120dp.png'" />
        </button>
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
