/* VocabTime - Theme, Custom Background & Settings Manager */

// 10 Theme Presets
const themePresets = [
  { id: 'purple', name: 'Tím Lavender', main: '#936bf5', dark: '#794de3', light: '#f3effe', hover: '#8656f3', border: '#dcd0fd' },
  { id: 'green', name: 'Xanh Clover', main: '#10b981', dark: '#059669', light: '#ecfdf5', hover: '#059669', border: '#a7f3d0' },
  { id: 'blue', name: 'Xanh Sky Blue', main: '#0284c7', dark: '#0369a1', light: '#e0f2fe', hover: '#0369a1', border: '#bae6fd' },
  { id: 'rose', name: 'Hồng Pink Sand', main: '#f43f5e', dark: '#e11d48', light: '#ffe4e6', hover: '#e11d48', border: '#fecdd3' },
  { id: 'orange', name: 'Cam Coral', main: '#f97316', dark: '#ea580c', light: '#fff7ed', hover: '#ea580c', border: '#ffedd5' },
  { id: 'white', name: 'Trắng Starlight', main: '#f1f5f9', dark: '#cbd5e1', light: '#ffffff', hover: '#e2e8f0', border: '#cbd5e1' },
  { id: 'red', name: 'Đỏ Crimson', main: '#dc2626', dark: '#b91c1c', light: '#fef2f2', hover: '#b91c1c', border: '#fecaca' },
  { id: 'black', name: 'Đen Space Black', main: '#18181b', dark: '#09090b', light: '#27272a', hover: '#27272a', border: '#3f3f46' },
  { id: 'teal', name: 'Xanh ngọc Mint', main: '#0d9488', dark: '#0f766e', light: '#ccfbf1', hover: '#0f766e', border: '#99f6e4' },
  { id: 'slate', name: 'Xám Dark Slate', main: '#475569', dark: '#334155', light: '#f1f5f9', hover: '#334155', border: '#cbd5e1' }
];

let currentThemeId = localStorage.getItem('vt_themeId') || 'purple';

function applyTheme(themeId) {
  const preset = themePresets.find(t => t.id === themeId) || themePresets[0];
  currentThemeId = preset.id;
  localStorage.setItem('vt_themeId', preset.id);

  const root = document.documentElement;
  root.style.setProperty('--vt-main', preset.main);
  root.style.setProperty('--vt-dark', preset.dark);
  root.style.setProperty('--vt-light', preset.light);
  root.style.setProperty('--vt-hover', preset.hover);
  root.style.setProperty('--vt-border', preset.border);

  renderThemeGrid();
}

function renderThemeGrid() {
  const grid = document.getElementById('themeGrid');
  if (!grid) return;
  grid.innerHTML = '';

  themePresets.forEach(preset => {
    const isSelected = preset.id === currentThemeId;
    const btn = document.createElement('button');
    btn.className = `group p-3 rounded-2xl border-2 font-extrabold text-xs flex items-center gap-2.5 transition-all duration-200 text-left cursor-pointer hover:scale-[1.03] hover:shadow-md hover:brightness-105 active:scale-95 ${
      isSelected 
        ? 'bg-white border-vtPurple text-slate-800 shadow-md ring-2 ring-vtPurple/30' 
        : 'bg-white/90 border-slate-200 hover:border-vtPurple text-slate-700'
    }`;
    btn.onclick = () => {
      applyTheme(preset.id);
      showToast(`Đã đổi màu sắc: ${preset.name}`);
    };

    const isWhite = preset.id === 'white';
    btn.innerHTML = `
      <div class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-black shadow-xs transition-transform duration-200 group-hover:scale-110" style="background-color: ${preset.main}; ${isWhite ? 'border: 1.5px solid #cbd5e1; color: #334155;' : ''}">
        ${isSelected ? `<i class="fa-solid fa-check ${isWhite ? 'text-slate-800' : 'text-white'}"></i>` : ''}
      </div>
      <span class="truncate">${preset.name}</span>
    `;
    grid.appendChild(btn);
  });
}

// Font Size Manager
const fontSizes = [
  { id: 'sm', name: 'Nhỏ', scale: '90%' },
  { id: 'md', name: 'Vừa', scale: '100%' },
  { id: 'lg', name: 'Lớn', scale: '110%' },
  { id: 'xl', name: 'Rất lớn', scale: '120%' }
];

let currentFontSizeId = localStorage.getItem('vt_fontSize') || 'md';

function applyFontSize(sizeId) {
  const item = fontSizes.find(f => f.id === sizeId) || fontSizes[1];
  currentFontSizeId = item.id;
  localStorage.setItem('vt_fontSize', item.id);
  document.documentElement.style.fontSize = item.scale;
  renderFontSizeGrid();
}

function renderFontSizeGrid() {
  const grid = document.getElementById('fontSizeGrid');
  if (!grid) return;
  grid.innerHTML = '';

  fontSizes.forEach(item => {
    const isSelected = item.id === currentFontSizeId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `py-2 px-1 rounded-xl border-2 font-extrabold text-xs text-center transition cursor-pointer ${
      isSelected 
        ? 'bg-vtPurple text-white border-vtPurple shadow-xs' 
        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
    }`;
    btn.onclick = () => {
      applyFontSize(item.id);
      showToast(`Đã đổi cỡ chữ: ${item.name}`);
    };
    btn.innerText = item.name;
    grid.appendChild(btn);
  });
}

// Element Translucency / Glass Opacity Manager
let glassOpacity = parseFloat(localStorage.getItem('vt_glassOpacity')) || 0.82;

function applyGlassOpacity(val) {
  glassOpacity = parseFloat(val);
  if (isNaN(glassOpacity) || glassOpacity < 0.2 || glassOpacity > 1) {
    glassOpacity = 0.82;
  }
  localStorage.setItem('vt_glassOpacity', glassOpacity);
  document.documentElement.style.setProperty('--glass-opacity', glassOpacity);

  const valEl = document.getElementById('glassOpacityValLabel');
  const sliderEl = document.getElementById('glassOpacityInput');
  if (valEl) valEl.innerText = `${Math.round(glassOpacity * 100)}%`;
  if (sliderEl && sliderEl.value != Math.round(glassOpacity * 100)) {
    sliderEl.value = Math.round(glassOpacity * 100);
  }
}

// Mist Level Presets for Background Overlay
const mistPresets = [
  { name: "Sương vừa", class: "bg-white/45 backdrop-blur-[6px]" },
  { name: "Sương dày", class: "bg-white/65 backdrop-blur-[10px]" },
  { name: "Không sương", class: "bg-transparent backdrop-blur-none" },
  { name: "Sương nhẹ", class: "bg-white/30 backdrop-blur-[3px]" }
];
let currentMistIdx = parseInt(localStorage.getItem('vt_mistIndex'));
if (isNaN(currentMistIdx) || currentMistIdx < 0 || currentMistIdx >= mistPresets.length) {
  currentMistIdx = 0;
}

function applyMistStyle() {
  const mistEl = document.getElementById('bgMistOverlay');
  const label = document.getElementById('settingsMistLabel');
  if (!mistEl) return;
  const preset = mistPresets[currentMistIdx];
  mistEl.className = `fixed inset-0 pointer-events-none z-0 transition-all duration-300 ${preset.class}`;
  if (label) label.innerText = preset.name;
}

function cycleMistLevel() {
  currentMistIdx = (currentMistIdx + 1) % mistPresets.length;
  localStorage.setItem('vt_mistIndex', currentMistIdx);
  applyMistStyle();
  showToast(`Lớp sương phủ nền: ${mistPresets[currentMistIdx].name}`);
}

// Custom Local Background Image Manager
function initCustomBackground() {
  const savedBg = localStorage.getItem('vt_custom_bg');
  const body = document.getElementById('appBody') || document.body;
  const html = document.documentElement;
  const fixedBgCover = document.getElementById('fixedAppBgCover');
  const fixedMobileBg = document.getElementById('fixedMobileBgLayer');
  const btnRemove = document.getElementById('settingsBtnRemoveBg');
  const mistEl = document.getElementById('bgMistOverlay');

  if (savedBg) {
    body.style.backgroundImage = 'none';
    html.style.backgroundImage = 'none';
    if (fixedBgCover) fixedBgCover.style.backgroundImage = `url(${savedBg})`;
    if (fixedMobileBg) fixedMobileBg.style.backgroundImage = `url(${savedBg})`;
    body.classList.add('has-custom-bg');
    html.classList.add('has-custom-bg');
    if (btnRemove) btnRemove.classList.remove('hidden');
    if (mistEl) mistEl.classList.remove('hidden');
    applyMistStyle();
  } else {
    body.style.backgroundImage = 'none';
    html.style.backgroundImage = 'none';
    if (fixedBgCover) fixedBgCover.style.backgroundImage = 'none';
    if (fixedMobileBg) fixedMobileBg.style.backgroundImage = 'none';
    body.classList.remove('has-custom-bg');
    html.classList.remove('has-custom-bg');
    if (btnRemove) btnRemove.classList.add('hidden');
    if (mistEl) mistEl.classList.add('hidden');
  }
}

function handleBackgroundUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast("Vui lòng chọn một tệp hình ảnh hợp lệ!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    const base64Img = evt.target.result;
    try {
      localStorage.setItem('vt_custom_bg', base64Img);
      initCustomBackground();
      const btnRemove = document.getElementById('settingsBtnRemoveBg');
      if (btnRemove) btnRemove.classList.remove('hidden');
      showToast("Đã thay đổi hình nền từ máy thành công!");
    } catch (err) {
      showToast("Ảnh quá lớn để lưu vào bộ nhớ, vui lòng chọn ảnh dung lượng nhẹ hơn!");
    }
  };
  reader.readAsDataURL(file);
}

function removeCustomBackground() {
  localStorage.removeItem('vt_custom_bg');
  initCustomBackground();
  const btnRemove = document.getElementById('settingsBtnRemoveBg');
  if (btnRemove) btnRemove.classList.add('hidden');
  showToast("Đã khôi phục giao diện tối giản mặc định!");
}

// Unified Settings Modal Manager
function openSettingsModal() {
  renderThemeGrid();
  renderFontSizeGrid();
  applyGlassOpacity(glassOpacity);
  applyMistStyle();

  const chkAuto = document.getElementById('settingsChkAutoVoice');
  if (chkAuto && typeof autoVoice !== 'undefined') {
    chkAuto.checked = autoVoice;
  }

  const btnRemove = document.getElementById('settingsBtnRemoveBg');
  if (btnRemove) {
    if (localStorage.getItem('vt_custom_bg')) {
      btnRemove.classList.remove('hidden');
    } else {
      btnRemove.classList.add('hidden');
    }
  }

  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.remove('hidden');
}

function closeSettingsModal(e) {
  if (e && e.target !== e.currentTarget && e.target.tagName !== 'BUTTON' && !e.target.closest('button')) return;
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.add('hidden');
}

// Auto-apply font size on script load
document.addEventListener('DOMContentLoaded', () => {
  applyFontSize(currentFontSizeId);
});
