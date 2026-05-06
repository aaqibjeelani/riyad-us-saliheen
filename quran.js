// ── State ────────────────────────────────────────
const savedPrayer = JSON.parse(localStorage.getItem('al_noor_prayer') || 'null') || {
    lat: 34.0837, lon: 74.7973, tz: 'Asia/Kolkata', city: 'Srinagar, Jammu & Kashmir', method: 1, school: 1
};
const state = {
    currentTab: 'quran',
    currentSurah: 1,
    currentTranslation: localStorage.getItem('al_noor_trans') || 'en.sahih',
    currentReciter: localStorage.getItem('al_noor_reciter') || 'ar.alafasy',
    bookmarks: JSON.parse(localStorage.getItem('quran_bookmarks') || '[]'),
    surahData: [],
    hadithBooks: [
        { id: 'eng-bukhari', name: 'Sahih al-Bukhari', author: 'Imam Bukhari', icon: '📘' },
        { id: 'eng-muslim', name: 'Sahih Muslim', author: 'Imam Muslim', icon: '📗' },
        { id: 'eng-abudawud', name: 'Sunan Abu Dawud', author: 'Imam Abu Dawud', icon: '📙' },
        { id: 'eng-tirmidhi', name: 'Jami at-Tirmidhi', author: 'Imam Tirmidhi', icon: '📕' },
        { id: 'eng-nasai', name: "Sunan an-Nasa'i", author: "Imam Nasa'i", icon: '📓' },
        { id: 'eng-ibnmajah', name: 'Sunan Ibn Majah', author: 'Imam Ibn Majah', icon: '📔' }
    ],
    currentHadithBook: null,
    hadithData: {},
    currentAudio: null,
    isPlaying: false,
    surahAyahOffsets: {},
    audioVisible: false,
    prayer: savedPrayer,
    prayerTimings: {},
    countdownTimer: null,
    hijriDate: '',
    isReadingMode: false,
    mushaf: {
        active: false,
        currentSurah: parseInt(localStorage.getItem('mushaf_last_surah')) || 1,
        currentJuz: parseInt(localStorage.getItem('mushaf_last_juz')) || 1,
        currentPage: parseInt(localStorage.getItem('mushaf_last_page')) || 0,
        totalPages: 1,
        versesPerPage: 8,
        sajdas: [],
        mode: localStorage.getItem('mushaf_mode') || 'surah' // 'surah' or 'juz'
    },
    tasbeeh: [
        { id: 'kalima3', title: '3rd Kalima (Tamjeed)', count: 0, target: 100, arabic: 'سُبْحَانَ اللهِ وَالْحَمْدُ للهِ وَلَا إِلَهَ إِلَّا اللهُ وَاللهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيمِ' },
        { id: 'darood', title: 'Darood Shareef', count: 0, target: 100, arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ' },
        { id: 'istighfar', title: 'Istighfaar', count: 0, target: 100, arabic: 'أَسْتَغْفِرُ اللهَ رَبِّي مِنْ كُلِّ ذَنْبٍ وَأَتُوبُ إِلَيْهِ' },
        { id: 'kalima1', title: 'Kalima Taibah', count: 0, target: 100, arabic: 'لَا إِلَهَ إِلَّا اللهُ مُحَمَّدٌ رَسُولُ اللهِ' }
    ],
    currentTasbeeh: null
};

const API_BASE = 'https://api.alquran.cloud/v1';
const HADITH_API = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

// ── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    applyStoredTheme();
    applyStoredFontSize();
    syncSettingsUI();
    loadSurahList();
    loadSurah(1);
    fetchPrayerTimes();
    fetchSajdaData();
});

async function fetchSajdaData() {
    const cached = localStorage.getItem('al_noor_sajdas');
    if (cached) {
        state.mushaf.sajdas = JSON.parse(cached);
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/sajda`);
        const data = await res.json();
        state.mushaf.sajdas = data.data.ayahs.map(a => a.number);
        localStorage.setItem('al_noor_sajdas', JSON.stringify(state.mushaf.sajdas));
    } catch (e) { console.error('Sajda load failed'); }
}

// ── UI Utilities ────────────────────────────────
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

function toggleSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    const panel = document.getElementById('sidebarPanel');
    const isOpen = panel.classList.contains('active');
    if (isOpen) {
        overlay.classList.remove('active');
        panel.classList.remove('active');
        document.body.style.overflow = '';
    } else {
        overlay.classList.add('active');
        panel.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderSidebarList();
    }
}

// ── Dark Mode & Theme ────────────────────────────
function toggleDarkMode() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('al_noor_theme', newTheme);
    syncSettingsUI();
    showToast(`${isDark ? 'Light' : 'Dark'} mode enabled`);
}

function applyStoredTheme() {
    const stored = localStorage.getItem('al_noor_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.setAttribute('data-theme', stored);
}

// ── Font Size ────────────────────────────────────
function setFontSize(size, btn) {
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.setProperty('--font-size', sizes[size]);
    localStorage.setItem('al_noor_font_size', size);

    if (btn) {
        document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
}

function applyStoredFontSize() {
    const size = localStorage.getItem('al_noor_font_size') || 'medium';
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.setProperty('--font-size', sizes[size]);
}

// ── Modal Management ─────────────────────────────
function openSettingsModal() { document.getElementById('settingsModal').classList.add('active'); }
function closeSettingsModal(e) {
    if (!e || e.target.id === 'settingsModal' || e.target.closest('.modal-close')) {
        document.getElementById('settingsModal').classList.remove('active');
    }
}

function openPrayerModal() { document.getElementById('prayerModal').classList.add('active'); }
function closePrayerModal(e) {
    if (!e || e.target.id === 'prayerModal' || e.target.closest('.modal-close')) {
        document.getElementById('prayerModal').classList.remove('active');
    }
}

function syncSettingsUI() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const darkBtn = document.getElementById('darkToggle');
    const headerDarkBtn = document.getElementById('darkToggleBtn');
    if (darkBtn) darkBtn.classList.toggle('on', isDark);
    if (headerDarkBtn) headerDarkBtn.textContent = isDark ? '☀️' : '🌙';

    const storedFontSize = localStorage.getItem('al_noor_font_size') || 'medium';
    document.querySelectorAll('.font-btn').forEach(btn => {
        const label = btn.textContent.trim();
        const btnSize = label === 'A' ? 'small' : (label === 'Aa' ? 'medium' : 'large');
        btn.classList.toggle('active', btnSize === storedFontSize);
    });

    const transSelect = document.getElementById('translationSelect');
    if (transSelect) transSelect.value = state.currentTranslation;

    const reciterSelect = document.getElementById('reciterSelect');
    if (reciterSelect) reciterSelect.value = state.currentReciter;

    const citySelect = document.getElementById('citySelect');
    if (citySelect) {
        const val = `${state.prayer.lat},${state.prayer.lon},${state.prayer.tz},${state.prayer.city}`;
        citySelect.value = state.prayer.city === 'Custom Coordinates' ? 'custom' : val;
    }

    const methodSelect = document.getElementById('methodSelect');
    if (methodSelect) methodSelect.value = state.prayer.method;

    const schoolSelect = document.getElementById('schoolSelect');
    if (schoolSelect) schoolSelect.value = state.prayer.school;
}

function renderSidebarList() {
    const list = document.getElementById('sidebarList');
    if (!state.surahData.length) {
        list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        return;
    }
    list.innerHTML = state.surahData.map(s => `
        <div class="sidebar-item ${s.number === state.currentSurah ? 'active' : ''}" 
             onclick="selectSurahFromSidebar(${s.number})">
            <div>
                <div style="font-weight: 600; font-size: 0.9rem;">${s.number}. ${s.englishName}</div>
                <div style="font-size: 0.75rem; opacity: 0.7;">${s.revelationType} • ${s.numberOfAyahs} verses</div>
            </div>
            <div style="font-family: 'Amiri', serif; font-size: 1.1rem;">${s.name}</div>
        </div>
    `).join('');
}

function selectSurahFromSidebar(num) {
    state.currentSurah = num;
    toggleSidebar();
    loadSurah(num);
    updateNavActive('quran');
}

// ── Prayer Times ────────────────────────────────
async function fetchPrayerTimes() {
    const { lat, lon, tz, method, school } = state.prayer;
    const cityLbl = document.getElementById('prayerLocationLabel');
    if (cityLbl) cityLbl.textContent = state.prayer.city;

    try {
        const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${method}&school=${school}&timezonestring=${tz}`);
        const data = await res.json();
        state.prayerTimings = data.data.timings;
        const hDate = data.data.date.hijri;
        state.hijriDate = `${hDate.day} ${hDate.month.en} ${hDate.year} AH`;

        const hijriEl = document.getElementById('hijriDateDisplay');
        if (hijriEl) hijriEl.textContent = state.hijriDate;

        renderPrayerTimes();
        startPrayerCountdown();
    } catch (e) {
        console.error('Prayer error:', e);
        showToast('Failed to sync prayer times');
    }
}

function formatAMPM(timeStr) {
    if (!timeStr) return '--:--';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hrs = h % 12 || 12;
    return `${hrs}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function renderPrayerTimes() {
    const grid = document.getElementById('prayerGrid');
    if (!grid || !state.prayerTimings.Fajr) return;

    const prayers = [
        { key: 'Fajr', label: 'Fajr' },
        { key: 'Sunrise', label: 'Sunrise' },
        { key: 'Dhuhr', label: 'Dhuhr' },
        { key: 'Asr', label: 'Asr' },
        { key: 'Maghrib', label: 'Maghrib' },
        { key: 'Isha', label: 'Isha' }
    ];

    grid.innerHTML = prayers.map(p => {
        const timeStr = state.prayerTimings[p.key];
        const isNext = checkIsNext(p.key);

        return `
            <div class="prayer-box ${isNext ? 'prayer-active' : ''}">
                <div class="prayer-name">${p.label}</div>
                <div class="prayer-time">${formatAMPM(timeStr)}</div>
            </div>
        `;
    }).join('');
}

function checkIsNext(key) {
    const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    let nextKey = 'Fajr';
    for (let k of prayers) {
        if (!state.prayerTimings[k]) continue;
        const [h, m] = state.prayerTimings[k].split(':').map(Number);
        if (h * 60 + m > currentMin) {
            nextKey = k;
            break;
        }
    }
    return key === nextKey;
}

function startPrayerCountdown() {
    if (state.countdownTimer) clearInterval(state.countdownTimer);

    const update = () => {
        const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();

        let nextKey = 'Fajr';
        let isTomorrow = true;

        for (let k of prayers) {
            if (!state.prayerTimings[k]) continue;
            const [h, m] = state.prayerTimings[k].split(':').map(Number);
            if (h * 60 + m > currentMin) {
                nextKey = k;
                isTomorrow = false;
                break;
            }
        }

        const nextName = document.getElementById('nextPrayerName');
        const countdown = document.getElementById('prayerCountdown');
        if (nextName) nextName.textContent = nextKey + (isTomorrow ? ' (Tomorrow)' : '');

        if (state.prayerTimings[nextKey]) {
            const [nh, nm] = state.prayerTimings[nextKey].split(':').map(Number);
            let diff = (nh * 60 + nm) - currentMin;
            if (isTomorrow) diff += 1440;

            const hrs = Math.floor(diff / 60);
            const mins = diff % 60;
            if (countdown) countdown.textContent = `${hrs}h ${mins}m left`;
        }
    };

    update();
    state.countdownTimer = setInterval(update, 60000);
}

async function applyPrayerSettings() {
    const citySelect = document.getElementById('citySelect');
    const methodSelect = document.getElementById('methodSelect');
    const schoolSelect = document.getElementById('schoolSelect');

    if (citySelect.value === 'custom') {
        if (navigator.geolocation) {
            showToast('Getting location...');
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                state.prayer = {
                    ...state.prayer,
                    lat: latitude.toFixed(4),
                    lon: longitude.toFixed(4),
                    city: 'Current Location',
                    method: methodSelect.value,
                    school: schoolSelect.value
                };
                saveAndReloadPrayer();
            }, () => showToast('Location access denied'));
        } else {
            showToast('Geolocation not supported');
        }
    } else {
        const [lat, lon, tz, name] = citySelect.value.split(',');
        state.prayer = {
            lat, lon, tz, city: name,
            method: methodSelect.value,
            school: schoolSelect.value
        };
        saveAndReloadPrayer();
    }
}

function saveAndReloadPrayer() {
    localStorage.setItem('al_noor_prayer', JSON.stringify(state.prayer));
    fetchPrayerTimes();
    closePrayerModal();
    showToast('Prayer settings updated');
}

// Surah List
async function loadSurahList() {
    const cached = localStorage.getItem('al_noor_surah_list');
    if (cached) {
        state.surahData = JSON.parse(cached);
        calculateOffsets();
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/surah`);
        const data = await res.json();
        state.surahData = data.data;
        localStorage.setItem('al_noor_surah_list', JSON.stringify(state.surahData));
        calculateOffsets();
    } catch (e) {
        showToast('Failed to load Surah list');
    }
}

function calculateOffsets() {
    let offset = 0;
    state.surahData.forEach(s => {
        state.surahAyahOffsets[s.number] = offset;
        offset += s.numberOfAyahs;
    });
}

function getGlobalAyahNumber(surah, verse) {
    return (state.surahAyahOffsets[surah] || 0) + verse;
}

// Load Surah
async function loadSurah(number) {
    state.currentSurah = number;
    const container = document.getElementById('dynamicContent');

    let resumeHtml = '';

    // Mushaf Resume (Tilawat)
    const lastPage = localStorage.getItem('mushaf_last_page');
    const lastTitle = localStorage.getItem('mushaf_last_title');
    if (lastPage) {
        resumeHtml += `
            <div class="resume-card" onclick="openMushaf(${lastPage}, 'page')">
                <div class="resume-info">
                    <div class="resume-label">RESUME TILAWAT</div>
                    <div class="resume-title">${lastTitle || 'Last Session'} (Page ${lastPage})</div>
                </div>
                <div class="resume-btn">Continue 📖</div>
            </div>
        `;
    }

    // PDF Resume
    const lastPdfUrl = localStorage.getItem('last_opened_pdf_url');
    const lastPdfTitle = localStorage.getItem('last_opened_pdf_title');
    if (lastPdfUrl && lastPdfTitle) {
        resumeHtml += `
            <div class="resume-card" onclick="openPdf('${lastPdfUrl}', '${lastPdfTitle}')" style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);">
                <div class="resume-info">
                    <div class="resume-label">LAST OPENED BOOK</div>
                    <div class="resume-title">${lastPdfTitle}</div>
                </div>
                <div class="resume-btn">Open 📚</div>
            </div>
        `;
    }

    container.innerHTML = `${resumeHtml}<div class="loading"><div class="spinner"></div><p>Loading Surah...</p></div>`;

    try {
        const [arabicRes, transRes] = await Promise.all([
            fetch(`${API_BASE}/surah/${number}`),
            fetch(`${API_BASE}/surah/${number}/${state.currentTranslation}`)
        ]);

        const arabic = await arabicRes.json();
        const trans = await transRes.json();

        renderSurah(arabic.data, trans.data);
    } catch (e) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Error Loading</h3>
                <p>Check connection and try again</p>
            </div>
        `;
    }
}

function renderSurah(arabicSurah, transSurah) {
    const container = document.getElementById('dynamicContent');

    const verses = arabicSurah.ayahs.map((ayah, idx) => {
        const transAyah = transSurah.ayahs[idx];
        const isBookmarked = state.bookmarks.some(b => b.id === `${arabicSurah.number}:${ayah.numberInSurah}`);

        return `
        <div class="verse-item" id="verse-${ayah.numberInSurah}">
            <div class="verse-header">
                <span class="verse-badge">${ayah.numberInSurah}</span>
                <div class="verse-actions-row">
                    <button class="verse-action-btn ${isBookmarked ? 'bookmarked' : ''}" 
                            onclick="toggleBookmark('${arabicSurah.number}:${ayah.numberInSurah}', '${arabicSurah.englishName}', ${ayah.numberInSurah})">
                        🔖
                    </button>
                    <button class="verse-action-btn" onclick="playVerse(${arabicSurah.number}, ${ayah.numberInSurah}, '${arabicSurah.englishName}', ${ayah.number})">
                        ▶️
                    </button>
                    <button class="verse-action-btn" onclick="copyText('${ayah.text.replace(/'/g, "\\'")}', '${transAyah.text.replace(/'/g, "\\'")}')">
                        📋
                    </button>
                </div>
            </div>
            <div class="arabic-text">${ayah.text}</div>
            <div class="translation-text">${transAyah.text}</div>
        </div>
    `}).join('');

    container.innerHTML = `
        <div class="content-card">
            <div class="card-header">
                <div>
                    <div class="card-title">${arabicSurah.englishName}</div>
                    <div class="card-subtitle">${arabicSurah.englishNameTranslation} • ${arabicSurah.revelationType} • ${arabicSurah.numberOfAyahs} Verses</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="toggle-reading-btn" onclick="toggleReadingMode()">
                        ${state.isReadingMode ? '📖 Normal Mode' : '📜 Reading Mode'}
                    </button>
                    <button class="verse-action-btn" onclick="playFullSurah(${arabicSurah.number}, '${arabicSurah.englishName}')" style="width: 44px; height: 44px;">
                        🎵
                    </button>
                </div>
            </div>
            ${state.isReadingMode ? renderReadingMode(arabicSurah) : verses}
        </div>
    `;
}

function toggleReadingMode() {
    const savedPage = localStorage.getItem('mushaf_last_page');
    if (savedPage) {
        openMushaf(savedPage, 'page');
    } else {
        openMushaf(state.currentSurah || 1, 'surah');
    }
}

// ── MUSHAF VIEWER LOGIC (PNG FLIPBOOK) ───────────────────
let mushafFlipBook = null;

const surahStartPages = {
    1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187, 10: 208,
    11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293, 19: 305, 20: 312,
    21: 322, 22: 332, 23: 342, 24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404,
    31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458, 40: 467,
    41: 477, 42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518,
    51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542, 59: 545, 60: 549,
    61: 551, 62: 553, 63: 554, 64: 556, 65: 558, 66: 560, 67: 562, 68: 564, 69: 566, 70: 568,
    71: 570, 72: 572, 73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585,
    81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593, 90: 594,
    91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599,
    101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602, 107: 602, 108: 602, 109: 603, 110: 603,
    111: 603, 112: 604, 113: 604, 114: 604
};

async function openMushaf(id, type = 'surah') {
    const overlay = document.getElementById('mushafOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Initialize flipbook if not already done
    if (!mushafFlipBook) {
        await initMushafFlipBook();
    }

    let targetPage = 1;
    if (type === 'page') {
        targetPage = parseInt(id) || 1;
    } else if (type === 'surah') {
        targetPage = surahStartPages[id] || 1;
    } else if (type === 'juz') {
        const juzPages = [1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
        targetPage = juzPages[id - 1] || 1;
    } else {
        targetPage = id;
    }

    // Map Quran Page (1-604) to Flipbook Index (0-603)
    // Page 1 is Index 603, Page 604 is Index 0
    const flipIndex = 604 - targetPage;

    // Small delay to ensure library readiness and layout calculation
    setTimeout(() => {
        if (mushafFlipBook) {
            mushafFlipBook.turnToPage(flipIndex);
            // Save last session
            localStorage.setItem('mushaf_last_page', targetPage);
            localStorage.setItem('mushaf_last_surah', type === 'surah' ? id : 1);
        }
    }, 200);
}

async function initMushafFlipBook() {
    const container = document.getElementById('flipBook');
    if (!container) return;

    if (typeof St === 'undefined' || !St.PageFlip) {
        console.error("PageFlip library not loaded. Check connection or CSP.");
        return Promise.reject("Library not loaded");
    }

    container.innerHTML = '';
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';

    // Fixed pixel dimensions for absolute control
    const bookW = 450;
    const bookH = 650;

    container.style.width = `${bookW}px`;
    container.style.height = `${bookH}px`;
    container.style.margin = '0 auto';
    container.style.display = 'block';

    // Create 604 pages (604 to 1) in REVERSE index
    const fragment = document.createDocumentFragment();
    const lastPage = parseInt(localStorage.getItem('mushaf_last_page') || '1');

    for (let i = 604; i >= 1; i--) {
        const pageNum = i.toString().padStart(3, '0');
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';

        // Only set src for the current target page, others use data-src for lazy loading
        const isInitial = (i === lastPage);
        const srcAttr = isInitial ? `src="pages/${pageNum}.png"` : '';
        const dataSrcAttr = `data-src="pages/${pageNum}.png"`;

        pageDiv.innerHTML = `
            <div class="page-content">
                <div class="page-loading"><div class="spinner-small"></div></div>
                <img ${srcAttr} ${dataSrcAttr} class="mushaf-img" alt="Page ${i}" 
                     onload="if(this.previousElementSibling)this.previousElementSibling.remove()"
                     onerror="this.src='pages/001.png';">
            </div>
        `;
        fragment.appendChild(pageDiv);
    }
    container.appendChild(fragment);

    mushafFlipBook = new St.PageFlip(container, {
        width: bookW,
        height: bookH,
        size: "fixed", // CRITICAL: Disable auto-stretching
        showCover: false,
        usePortrait: true,
        mode: 'portrait',
        flippingTime: 1000,
        startPage: 0,
        drawShadow: true,
        maxShadowOpacity: 0.5,
        showPageCorners: true,
        clickEventForward: false,
        useMouseEvents: true
    });

    return new Promise((resolve) => {
        setTimeout(() => {
            mushafFlipBook.loadFromHTML(container.querySelectorAll(".page"));

            mushafFlipBook.on('flip', (e) => {
                const libraryIndex = e.data;
                const targetPage = 604 - libraryIndex;
                updateMushafUI(targetPage);
                loadMushafSurroundingPages(libraryIndex);
            });

            // Initial UI and Lazy Loading
            const initialLibraryIndex = 604 - lastPage;
            updateMushafUI(lastPage);
            loadMushafSurroundingPages(initialLibraryIndex);
            mushafFlipBook.turnToPage(initialLibraryIndex);

            resolve();
        }, 150);
    });
}

function mushafNext() {
    // Corrected: Moving forward in reading order (1->2) means decreasing the reversed index (603->602)
    if (mushafFlipBook) mushafFlipBook.flipPrev();
}

function mushafPrev() {
    // Corrected: Moving backward in reading order (2->1) means increasing the reversed index (602->603)
    if (mushafFlipBook) mushafFlipBook.flipNext();
}

function updateMushafUI(quranPage) {
    const pageInfo = document.getElementById('mushafPageInfo');
    if (pageInfo) pageInfo.textContent = `Page ${quranPage} / 604`;

    const juzPages = [1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];

    // Find Current Juz
    let currentJuz = 1;
    for (let i = 0; i < juzPages.length; i++) {
        if (quranPage >= juzPages[i]) {
            currentJuz = i + 1;
        } else {
            break;
        }
    }

    // Calculate Juz Progress
    const juzStart = juzPages[currentJuz - 1];
    const juzEnd = juzPages[currentJuz] || 605;
    const juzProgress = ((quranPage - juzStart) / (juzEnd - juzStart)) * 100;

    const progressBar = document.getElementById('juzProgressBar');
    if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, juzProgress))}%`;

    // Find Surah Name
    let highestStarted = 1;
    for (let sId in surahStartPages) {
        if (surahStartPages[sId] <= quranPage) {
            highestStarted = sId;
        } else {
            break;
        }
    }

    const sData = state.surahData.find(s => s.number == highestStarted);
    if (sData) {
        document.getElementById('mushafTitle').textContent = sData.englishName;
        document.getElementById('mushafJuzInfo').textContent = `Juz ${currentJuz} • ${juzEnd - quranPage} pages left in Juz`;
        localStorage.setItem('mushaf_last_title', sData.englishName);
    }
}

function closeMushaf() {
    document.getElementById('mushafOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function mushafNext() {
    if (mushafFlipBook) mushafFlipBook.flipNext();
}

function mushafPrev() {
    if (mushafFlipBook) mushafFlipBook.flipPrev();
}

function selectSurahInMushaf(num) {
    toggleMushafSelector();
    openMushaf(num, 'surah');
}

function selectJuzInMushaf(num) {
    toggleMushafSelector();
    openMushaf(num, 'juz');
}

function toggleMushafSelector() {
    const sel = document.getElementById('mushafSelector');
    sel.classList.toggle('active');
    if (sel.classList.contains('active')) renderMushafSelector('surah');
}

function renderMushafSelector(type) {
    const list = document.getElementById('mushafSelectorList');
    const tabSurah = document.getElementById('tabMushafSurah');
    const tabJuz = document.getElementById('tabMushafJuz');

    if (!tabSurah || !tabJuz || !list) return;

    tabSurah.classList.toggle('active', type === 'surah');
    tabJuz.classList.toggle('active', type === 'juz');

    if (type === 'surah') {
        list.innerHTML = state.surahData.map(s => `
            <div class="sidebar-item" onclick="selectSurahInMushaf(${s.number})">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div>
                        <div style="font-weight: 600;">${s.number}. ${s.englishName}</div>
                        <div style="font-family: 'Amiri', serif;">${s.name}</div>
                    </div>
                    <button class="juz-download-btn" onclick="event.stopPropagation(); downloadMushafSurah(${s.number})" title="Download Surah for offline">📥</button>
                </div>
            </div>
        `).join('');
    } else {
        let juzHtml = '';
        for (let i = 1; i <= 30; i++) {
            juzHtml += `
                <div class="sidebar-item" onclick="selectJuzInMushaf(${i})">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <div>
                            <div style="font-weight: 600;">Juz (Para) ${i}</div>
                            <div style="font-size: 0.8rem; opacity: 0.7;">Go to Para ${i}</div>
                        </div>
                        <button class="juz-download-btn" onclick="event.stopPropagation(); downloadMushafJuz(${i})" title="Download Juz for offline">📥</button>
                    </div>
                </div>
            `;
        }
        list.innerHTML = juzHtml;
    }
}

// Lazy load images surrounding the current library index
function loadMushafSurroundingPages(libraryIndex) {
    const container = document.getElementById('flipBook');
    if (!container) return;
    const range = 3;
    const start = Math.max(0, libraryIndex - range);
    const end = Math.min(603, libraryIndex + range);
    const pages = container.querySelectorAll('.page');
    for (let i = start; i <= end; i++) {
        const img = pages[i]?.querySelector('.mushaf-img');
        if (img && !img.src && img.dataset.src) {
            img.src = img.dataset.src;
        }
    }
}

// Offline Download helpers
async function downloadMushafSurah(surahNum) {
    const startPage = surahStartPages[surahNum];
    const endPage = (surahNum < 114) ? surahStartPages[surahNum + 1] - 1 : 604;
    await downloadPageRange(`Surah ${surahNum}`, startPage, endPage);
}

async function downloadMushafJuz(juzNum) {
    const juzPages = [1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582, 605];
    const startPage = juzPages[juzNum - 1];
    const endPage = juzPages[juzNum] - 1;
    await downloadPageRange(`Juz ${juzNum}`, startPage, endPage);
}

async function downloadPageRange(label, start, end) {
    if (typeof showToast === 'function') showToast(`Downloading ${label}...`);
    let successCount = 0;
    const total = end - start + 1;
    for (let p = start; p <= end; p++) {
        const url = `pages/${p.toString().padStart(3, '0')}.png`;
        try {
            await fetch(url);
            successCount++;
        } catch (e) { console.warn(`Failed: ${url}`); }
    }
    if (typeof showToast === 'function') showToast(`✅ ${label} ready offline (${successCount}/${total} pages)`);
}
function renderMushafSelector(type) {
    const list = document.getElementById('mushafSelectorList');
    const tabSurah = document.getElementById('tabMushafSurah');
    const tabJuz = document.getElementById('tabMushafJuz');

    if (!tabSurah || !tabJuz || !list) return;

    tabSurah.classList.toggle('active', type === 'surah');
    tabJuz.classList.toggle('active', type === 'juz');

    if (type === 'surah') {
        list.innerHTML = state.surahData.map(s => `
            <div class="sidebar-item" onclick="selectSurahInMushaf(${s.number})">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div>
                        <div style="font-weight: 600;">${s.number}. ${s.englishName}</div>
                        <div style="font-family: 'Amiri', serif;">${s.name}</div>
                    </div>
                    <button class="juz-download-btn" onclick="event.stopPropagation(); downloadMushafSurah(${s.number})" title="Download Surah for offline">📥</button>
                </div>
            </div>
        `).join('');
    } else {
        let juzHtml = '';
        for (let i = 1; i <= 30; i++) {
            juzHtml += `
                <div class="sidebar-item" onclick="selectJuzInMushaf(${i})">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <div>
                            <div style="font-weight: 600;">Juz (Para) ${i}</div>
                            <div style="font-size: 0.8rem; opacity: 0.7;">Go to Para ${i}</div>
                        </div>
                        <button class="juz-download-btn" onclick="event.stopPropagation(); downloadMushafJuz(${i})" title="Download Juz for offline">📥</button>
                    </div>
                </div>
            `;
        }
        list.innerHTML = juzHtml;
    }
}

// Audio Functions
function playVerse(surah, verseInSurah, surahName, globalAyah) {
    const reciter = state.currentReciter;
    const globalNum = globalAyah || getGlobalAyahNumber(surah, verseInSurah);
    const url = `https://cdn.islamic.network/quran/audio/128/${reciter}/${globalNum}.mp3`;
    playAudio(url, `${surahName}`, `Verse ${verseInSurah}`);
}

function playFullSurah(surah, surahName) {
    const reciter = state.currentReciter;
    const url = `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${surah}.mp3`;
    playAudio(url, `${surahName}`, `Full Surah`);
}

function playAudio(url, surah, verse) {
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio = null;
    }

    state.currentAudio = new Audio(url);
    document.getElementById('audioSurah').textContent = surah;
    document.getElementById('audioVerse').textContent = verse;

    state.currentAudio.addEventListener('timeupdate', () => {
        if (state.currentAudio.duration) {
            const pct = (state.currentAudio.currentTime / state.currentAudio.duration) * 100;
            document.getElementById('audioProgress').style.width = pct + '%';
        }
    });

    state.currentAudio.addEventListener('ended', () => {
        state.isPlaying = false;
        updatePlayBtn();
        document.getElementById('audioFab').classList.remove('playing');
    });

    state.currentAudio.addEventListener('error', () => {
        showToast('Audio failed to load');
        state.isPlaying = false;
        updatePlayBtn();
    });

    state.currentAudio.play().then(() => {
        state.isPlaying = true;
        updatePlayBtn();
        showAudioSheet();
        document.getElementById('audioFab').classList.add('playing');
    }).catch(() => showToast('Playback failed'));
}

function togglePlay() {
    if (!state.currentAudio) return;
    if (state.isPlaying) {
        state.currentAudio.pause();
        state.isPlaying = false;
    } else {
        state.currentAudio.play();
        state.isPlaying = true;
    }
    updatePlayBtn();
}

function stopAudio() {
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio.currentTime = 0;
    }
    state.isPlaying = false;
    updatePlayBtn();
    document.getElementById('audioProgress').style.width = '0%';
    document.getElementById('audioFab').classList.remove('playing');
}

function closeAudio() {
    stopAudio();
    document.getElementById('audioSheet').classList.remove('active');
    state.audioVisible = false;
}

function toggleAudioSheet() {
    const sheet = document.getElementById('audioSheet');
    if (state.audioVisible) {
        sheet.classList.remove('active');
        state.audioVisible = false;
    } else {
        showAudioSheet();
    }
}

function showAudioSheet() {
    document.getElementById('audioSheet').classList.add('active');
    state.audioVisible = true;
}

function updatePlayBtn() {
    document.getElementById('playBtn').textContent = state.isPlaying ? '⏸️' : '▶️';
}

// Bookmarks
function toggleBookmark(id, title, verse) {
    const idx = state.bookmarks.findIndex(b => b.id === id);
    if (idx > -1) {
        state.bookmarks.splice(idx, 1);
        showToast('Removed from saved');
    } else {
        state.bookmarks.push({ id, title, verse, time: new Date().toISOString() });
        showToast('Saved for later');
    }
    localStorage.setItem('quran_bookmarks', JSON.stringify(state.bookmarks));
    if (state.currentTab === 'quran') loadSurah(state.currentSurah);
    if (state.currentTab === 'bookmarks') renderBookmarks();
}

function renderBookmarks() {
    const container = document.getElementById('dynamicContent');
    if (!state.bookmarks.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔖</div>
                <h3>No Saved Verses</h3>
                <p>Tap the bookmark icon on any verse to save it here</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">Saved Verses</div>
                <button class="verse-action-btn" onclick="clearBookmarks()" style="background: #fee2e2; color: #991b1b;">🗑️</button>
            </div>
            ${state.bookmarks.map(b => `
                <div class="verse-item" onclick="loadSurah(${b.id.split(':')[0]}); setTimeout(() => document.getElementById('verse-${b.verse}')?.scrollIntoView({behavior: 'smooth', block: 'center'}), 1000)" style="cursor: pointer;">
                    <div class="verse-header">
                        <div>
                            <span class="verse-badge">${b.verse}</span>
                            <span style="margin-left: 8px; font-weight: 600;">${b.title}</span>
                        </div>
                        <button class="verse-action-btn bookmarked" onclick="event.stopPropagation(); toggleBookmark('${b.id}', '${b.title}', ${b.verse})">
                            🔖
                        </button>
                    </div>
                    <div style="color: #64748b; font-size: 0.8rem; margin-top: 8px;">
                        Saved ${new Date(b.time).toLocaleDateString()}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function clearBookmarks() {
    if (confirm('Clear all saved verses?')) {
        state.bookmarks = [];
        localStorage.removeItem('quran_bookmarks');
        renderBookmarks();
        showToast('All saved verses cleared');
    }
}

// Hadith
function renderHadithBooks() {
    const container = document.getElementById('dynamicContent');
    container.innerHTML = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">Six Authentic Books</div>
                <div class="card-subtitle">Kutub al-Sittah</div>
            </div>
            <div class="hadith-grid">
                ${state.hadithBooks.map(book => `
                    <div class="hadith-tile ${state.currentHadithBook === book.id ? 'active' : ''}" 
                         onclick="loadHadithBook('${book.id}')">
                        <div class="hadith-icon">${book.icon}</div>
                        <div class="hadith-name">${book.name}</div>
                        <div class="hadith-author">${book.author}</div>
                    </div>
                `).join('')}
            </div>
            <div id="hadithContent"></div>

            <div class="card-header" style="margin-top: 24px; border-top: 1px solid var(--border); padding-top: 20px;">
                <div class="card-title">Islamic Library</div>
                <div class="card-subtitle">Supplications & Books</div>
            </div>
            <div class="hadith-grid">
                <div class="hadith-tile" onclick="openPdf('https://drive.google.com/file/d/12zmktVCfoAJhrfjl-R33aBnVkWz7kTJV/preview', 'Al-Quran Al Kareem (13 Lined)')">
                    <div class="hadith-icon">📖</div>
                    <div class="hadith-name">Al-Quran Al Kareem (13 Lined)</div>
                    <div class="hadith-author">Indo-Pak Script</div>
                </div>
                <div class="hadith-tile" onclick="openPdf('https://quran.com.pk/Books/Munajat-e-Maqbool.pdf', 'Munajat-e-Maqbool')">
                    <div class="hadith-icon">🤲</div>
                    <div class="hadith-name">Munajat-e-Maqbool</div>
                    <div class="hadith-author">Maulana Ashraf Ali Thanwi</div>
                </div>
            </div>
        </div>
    `;
}

async function loadHadithBook(bookId) {
    state.currentHadithBook = bookId;
    renderHadithBooks();

    const content = document.getElementById('hadithContent');
    content.innerHTML = '<div class="loading" style="padding: 20px;"><div class="spinner"></div><p>Loading Hadith...</p></div>';

    try {
        const res = await fetch(`${HADITH_API}/${bookId}.json`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        state.hadithData[bookId] = data;
        renderHadithList(bookId, data.hadiths.slice(0, 25));
    } catch (e) {
        // Try minified fallback
        try {
            const res2 = await fetch(`${HADITH_API}/${bookId}.min.json`);
            const data2 = await res2.json();
            state.hadithData[bookId] = data2;
            renderHadithList(bookId, data2.hadiths.slice(0, 25));
        } catch (e2) {
            loadSampleHadith(bookId);
        }
    }
}

function renderHadithList(bookId, hadiths) {
    const content = document.getElementById('hadithContent');
    const book = state.hadithBooks.find(b => b.id === bookId);

    content.innerHTML = `
        <div style="padding: 12px;">
            <div style="font-weight: 700; margin-bottom: 12px; color: var(--dark);">${book.name}</div>
            ${hadiths.map((h, i) => `
                <div class="hadith-item">
                    <div class="hadith-ref-bar">
                        <span class="hadith-ref">#${h.hadithnumber || h.number || i + 1}</span>
                        ${h.grades ? `<span class="hadith-grade grade-${(h.grades[0]?.grade || '').toLowerCase().replace(/\s/g, '-')}">${h.grades[0]?.grade || 'Sahih'}</span>` : ''}
                    </div>
                    ${h.chapter ? `<div style="font-size: 0.8rem; color: #64748b; margin-bottom: 8px;">${h.chapter}</div>` : ''}
                    <div class="hadith-body">${h.text || h.hadith || h.english || 'Text unavailable'}</div>
                </div>
            `).join('')}
            ${state.hadithData[bookId]?.hadiths?.length > 25 ? `
                <button class="load-more" onclick="loadMoreHadith('${bookId}')">Load More Hadith</button>
            ` : ''}
        </div>
    `;
}

function loadMoreHadith(bookId) {
    const data = state.hadithData[bookId];
    const current = document.querySelectorAll('.hadith-item').length;
    const more = data.hadiths.slice(current, current + 25);

    const list = document.getElementById('hadithContent').querySelector('div');
    const newHtml = more.map((h, i) => `
        <div class="hadith-item">
            <div class="hadith-ref-bar">
                <span class="hadith-ref">#${h.hadithnumber || h.number || (current + i + 1)}</span>
                ${h.grades ? `<span class="hadith-grade grade-${(h.grades[0]?.grade || '').toLowerCase().replace(/\s/g, '-')}">${h.grades[0]?.grade || 'Sahih'}</span>` : ''}
            </div>
            <div class="hadith-body">${h.text || h.hadith || h.english || 'Text unavailable'}</div>
        </div>
    `).join('');

    const btn = list.querySelector('.load-more');
    if (btn) {
        btn.insertAdjacentHTML('beforebegin', newHtml);
    } else {
        list.insertAdjacentHTML('beforeend', newHtml);
    }

    if (current + 25 >= data.hadiths.length) {
        const loadBtn = list.querySelector('.load-more');
        if (loadBtn) loadBtn.remove();
    }
}

function loadSampleHadith(bookId) {
    const content = document.getElementById('hadithContent');
    const samples = {
        'eng-bukhari': [
            { ref: '1', grade: 'Sahih', text: 'Narrated Umar ibn Al-Khattab (RA): I heard the Messenger of Allah (peace be upon him) say: "Actions are but by intentions, and every person will have but that which he intended..."' },
            { ref: '2', grade: 'Sahih', text: 'Narrated Aisha (RA): The Messenger of Allah (peace be upon him) said: "Whoever innovates something in this matter of ours that is not part of it, will have it rejected."' }
        ],
        'eng-muslim': [
            { ref: '1', grade: 'Sahih', text: 'It is narrated on the authority of Umar ibn al-Khattab (RA) that he heard the Messenger of Allah (may peace be upon him) say: "Verily the reward of deeds depends upon the intentions..."' }
        ]
    };

    const book = state.hadithBooks.find(b => b.id === bookId);
    const bookSamples = samples[bookId] || samples['eng-bukhari'];

    content.innerHTML = `
        <div style="padding: 12px;">
            <div style="font-weight: 700; margin-bottom: 12px; color: var(--dark);">${book.name} (Sample)</div>
            ${bookSamples.map(h => `
                <div class="hadith-item">
                    <div class="hadith-ref-bar">
                        <span class="hadith-ref">#${h.ref}</span>
                        <span class="hadith-grade grade-sahih">${h.grade}</span>
                    </div>
                    <div class="hadith-body">${h.text}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Search
function showSearch() {
    switchTab('search');
}

async function performSearch() {
    const query = document.getElementById('searchInput')?.value.trim();
    if (!query) {
        showToast('Enter search term');
        return;
    }

    switchTab('search');
    const container = document.getElementById('dynamicContent');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Searching...</p></div>';

    try {
        const res = await fetch(`${API_BASE}/search/${encodeURIComponent(query)}/all/${state.currentTranslation}`);
        const data = await res.json();
        const matches = data.data?.matches || [];
        renderSearchResults(matches, query);
    } catch (e) {
        renderSearchResults([], query);
    }
}

function renderSearchResults(matches, query) {
    const container = document.getElementById('dynamicContent');

    if (!matches.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No Results</h3>
                <p>No matches for "${query}"</p>
            </div>
        `;
        return;
    }

    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

    container.innerHTML = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">"${query}"</div>
                <div class="card-subtitle">${matches.length} results</div>
            </div>
            <div style="padding: 12px;">
                ${matches.map(m => `
                    <div class="result-card" onclick="loadSurah(${m.surah.number}); setTimeout(() => document.getElementById('verse-${m.numberInSurah}')?.scrollIntoView({behavior: 'smooth', block: 'center'}), 800)">
                        <div class="result-meta">
                            <span class="result-tag">${m.surah.englishName}</span>
                            <span>Verse ${m.numberInSurah}</span>
                        </div>
                        <div style="font-size: 0.9rem; line-height: 1.6; margin-top: 6px;">
                            ${m.text.replace(re, '<span class="result-highlight">$1</span>')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Tab Switching
function switchTab(tab) {
    state.currentTab = tab;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tab);
    });

    const container = document.getElementById('dynamicContent');

    switch (tab) {
        case 'quran':
            loadSurah(state.currentSurah);
            break;
        case 'hadith':
            renderHadithBooks();
            break;
        case 'search':
            container.innerHTML = `
                <div class="search-card">
                    <div class="search-field">
                        <span class="search-icon">🔍</span>
                        <input type="text" class="search-input" id="searchInput" placeholder="Search Quran verses..." onkeypress="if(event.key==='Enter') performSearch()">
                    </div>
                    <div class="filter-chips">
                        <button class="chip active" onclick="setSearchSource(this, 'all')">All</button>
                        <button class="chip" onclick="setSearchSource(this, 'quran')">Quran</button>
                        <button class="chip" onclick="setSearchSource(this, 'hadith')">Hadith</button>
                    </div>
                    <button class="load-more" onclick="performSearch()" style="margin: 0;">Search</button>
                </div>
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>Search</h3>
                    <p>Find verses across Quran and Hadith</p>
                </div>
            `;
            setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
            break;
        case 'bookmarks':
            renderBookmarks();
            break;
        case 'tasbeeh':
            renderTasbeehList();
            break;
        case 'about':
            renderAboutPage();
            break;
    }
}

function renderTasbeehList() {
    const container = document.getElementById('dynamicContent');
    container.innerHTML = `
        <div class="tasbeeh-card">
            <div class="card-header">
                <div class="card-title">Tasbeeh & Dhikr</div>
                <div class="card-subtitle">Daily Mamulaat</div>
            </div>
            <div style="padding: 12px;">
                ${state.tasbeeh.map((t, idx) => `
                    <div class="tasbeeh-item" onclick="startTasbeeh(${idx})">
                        <div class="tasbeeh-info">
                            <div class="tasbeeh-title">${t.title}</div>
                            <div class="tasbeeh-target">Goal: ${t.target}</div>
                        </div>
                        <div class="tasbeeh-counter">${t.count}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function startTasbeeh(idx) {
    state.currentTasbeeh = state.tasbeeh[idx];
    const container = document.getElementById('dynamicContent');

    const updateUI = () => {
        container.innerHTML = `
            <div class="tasbeeh-card">
                <div class="reading-controls">
                    <button class="tasbeeh-btn" onclick="renderTasbeehList()">⬅ Back</button>
                    <div style="font-weight: 700;">${state.currentTasbeeh.title}</div>
                    <div style="width: 40px;"></div>
                </div>
                <div class="tasbeeh-active-area">
                    <div style="font-family: 'Amiri', serif; font-size: 1.5rem; margin-bottom: 20px; direction: rtl;">
                        ${state.currentTasbeeh.arabic}
                    </div>
                    <div class="counter-display">${state.currentTasbeeh.count}</div>
                    <div class="tap-area" id="tapArea" onclick="incrementTasbeeh()">
                        TAP
                    </div>
                    <div class="tasbeeh-controls">
                        <button class="tasbeeh-btn reset" onclick="resetTasbeeh()">Reset</button>
                    </div>
                </div>
            </div>
        `;
    };

    updateUI();

    window.incrementTasbeeh = () => {
        state.currentTasbeeh.count++;
        // Target Reached Alert (Every 100 counts)
        if (state.currentTasbeeh.count > 0 && state.currentTasbeeh.count % 100 === 0) {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
            showToast(`MashaAllah! ${state.currentTasbeeh.count} reached.`);
        } else {
            if (navigator.vibrate) navigator.vibrate(50);
        }
        updateUI();
    };

    window.resetTasbeeh = () => {
        if (confirm('Reset counter?')) {
            state.currentTasbeeh.count = 0;
            updateUI();
        }
    };
}

function renderAboutPage() {
    const container = document.getElementById('dynamicContent');
    container.innerHTML = `
        <div class="about-hero">
            <div class="about-avatar" style="overflow: hidden; background: #fff;">
                <img src="https://aaqibjeelani.github.io/ajvirus/images/transparentlogo%20aj.png" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            <div class="about-name">Aaqib Jeelani</div>
            <div class="about-role">Full Stack Developer & Digital Architect</div>
        </div>
        
        <div class="about-card">
            <h3>About Al-Noor</h3>
            <p style="font-size: 0.95rem; line-height: 1.6; color: var(--text);">
                Al-Noor is a modern, high-performance Islamic application designed to provide a seamless experience for reading the Quran, exploring Hadith collections, and tracking prayer times with pinpoint accuracy across the globe.
            </p>
            <div class="stat-grid">
                <div class="stat-box"><div class="stat-num">114</div><div class="stat-lbl">Surahs</div></div>
                <div class="stat-box"><div class="stat-num">10+</div><div class="stat-lbl">Hadith Books</div></div>
                <div class="stat-box"><div class="stat-num">50+</div><div class="stat-lbl">Reciters</div></div>
            </div>
        </div>

        <div class="about-card">
            <h3>Developer Information</h3>
            <a href="https://aaqibjeelani.github.io" target="_blank" class="about-link">
                <div class="about-link-icon" style="background:#e0f2fe; color:#0369a1;">🌐</div>
                <div class="about-link-text">
                    <div class="about-link-title">Portfolio Website</div>
                    <div class="about-link-sub">aaqibjeelani.github.io</div>
                </div>
                <span>↗️</span>
            </a>
            <a href="mailto:ajvirusofficial@gmail.com" class="about-link">
                <div class="about-link-icon" style="background:#fef3c7; color:#b45309;">✉️</div>
                <div class="about-link-text">
                    <div class="about-link-title">Email Contact</div>
                    <div class="about-link-sub">ajvirusofficial@gmail.com</div>
                </div>
            </a>
        </div>

        <div class="about-card" style="margin-bottom: 40px;">
            <h3>Technologies Used</h3>
            <div style="display: flex; flex-wrap: wrap;">
                <span class="about-badge">HTML5</span>
                <span class="about-badge">Vanilla CSS</span>
                <span class="about-badge">Modern JS</span>
                <span class="about-badge">Aladhan API</span>
                <span class="about-badge">Quran Cloud</span>
                <span class="about-badge">Glassmorphism</span>
            </div>
        </div>
    `;
}

function changeTranslation(val) {
    state.currentTranslation = val;
    localStorage.setItem('al_noor_trans', val);
    if (state.currentTab === 'quran') loadSurah(state.currentSurah);
    showToast('Translation updated');
}

function changeReciter(val) {
    state.currentReciter = val;
    localStorage.setItem('al_noor_reciter', val);
    showToast('Reciter updated');
}


function updateNavActive(tab) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tab);
    });
}

function setSearchSource(btn, source) {
    btn.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
}

// Utilities
function copyText(arabic, trans) {
    const text = `${arabic}\n\n${trans}`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied'));
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied');
    }
}

// URL params
window.addEventListener('load', () => {
    const hash = window.location.hash;
    if (hash.includes('surah=')) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const surah = parseInt(params.get('surah')) || 1;
        const verse = params.get('verse');
        state.currentSurah = surah;
        loadSurah(surah);
        if (verse) {
            setTimeout(() => {
                document.getElementById(`verse-${verse}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 1500);
        }
    }
});
// PDF Viewer
function openPdf(url, title) {
    const overlay = document.getElementById('pdfOverlay');
    const titleEl = document.getElementById('pdfViewerTitle');
    const iframe = document.getElementById('pdfViewerFrame');
    const downloadBtn = document.getElementById('pdfViewerDownload');

    if (titleEl) titleEl.textContent = title;
    if (iframe) iframe.src = url;
    if (downloadBtn) {
        // If it's a Google Drive link, provide the export/download link
        if (url.includes('drive.google.com')) {
            downloadBtn.href = url.replace('/preview', '/view');
        } else {
            downloadBtn.href = url;
        }
    }

    if (overlay) overlay.classList.add('active');

    // Save state
    localStorage.setItem('last_opened_pdf_url', url);
    localStorage.setItem('last_opened_pdf_title', title);
}

function closePdf() {
    const overlay = document.getElementById('pdfOverlay');
    if (overlay) overlay.classList.remove('active');
}
