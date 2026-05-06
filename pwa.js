// ── Al-Noor PWA Manager ─────────────────────────────────────────────────────
(function () {
  'use strict';

  let deferredInstallPrompt = null;
  let swRegistration = null;
  let isInstalled = false;

  // ── Service Worker Registration ─────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        swRegistration = await navigator.serviceWorker.register('./sw.js', {
          scope: './'
        });
        console.log('[PWA] Service Worker registered:', swRegistration.scope);

        // Check for updates
        swRegistration.addEventListener('updatefound', () => {
          const newWorker = swRegistration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner();
            }
          });
        });

        // Periodic update check every 30 min while app is open
        setInterval(() => swRegistration.update(), 30 * 60 * 1000);

      } catch (err) {
        console.error('[PWA] Service Worker registration failed:', err);
      }
    });

    // Reload when new SW takes over
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  // ── Update Banner ───────────────────────────────────────────────────────
  function showUpdateBanner() {
    const banner = document.getElementById('updateBanner');
    if (banner) banner.classList.add('visible');
  }

  window.reloadForUpdate = function () {
    hideUpdateBanner();
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  function hideUpdateBanner() {
    const banner = document.getElementById('updateBanner');
    if (banner) banner.classList.remove('visible');
  }

  // ── Install Prompt (Android / Desktop Chrome) ────────────────────────────
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('[PWA] Install prompt captured');

    // Don't show if already dismissed recently OR already installed
    if (isInStandaloneMode()) return;
    
    const dismissed = localStorage.getItem('al_noor_install_dismissed');
    const dismissedAt = parseInt(dismissed || '0');
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (Date.now() - dismissedAt < threeDays) return;

    // Show install banner after 3 seconds
    setTimeout(() => {
      if (!isInStandaloneMode()) showInstallBanner();
    }, 3000);

    // Show install button in settings
    const settingsBtn = document.getElementById('settingsInstallBtn');
    if (settingsBtn) settingsBtn.style.display = 'block';
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed!');
    isInstalled = true;
    hideInstallBanner();
    deferredInstallPrompt = null;
    localStorage.setItem('al_noor_installed', 'true');
    if (typeof showToast === 'function') showToast('✅ Al-Noor installed successfully!');

    // Update settings UI
    const settingsBtn = document.getElementById('settingsInstallBtn');
    const settingsInfo = document.getElementById('settingsInstallInfo');
    if (settingsBtn) settingsBtn.style.display = 'none';
    if (settingsInfo) settingsInfo.style.display = 'block';
  });

  function showInstallBanner() {
    if (isInStandaloneMode()) return;
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.add('visible');
  }

  function hideInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (banner) {
      banner.classList.remove('visible');
    }
  }

  // Install button click
  document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('installBannerBtn');
    const dismissBtn = document.getElementById('installBannerDismiss');

    installBtn?.addEventListener('click', () => triggerInstall());
    dismissBtn?.addEventListener('click', () => {
      hideInstallBanner();
      localStorage.setItem('al_noor_install_dismissed', Date.now().toString());
    });
  });

  window.triggerInstall = async function () {
    if (deferredInstallPrompt) {
      // Android/Chrome — native install
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
      deferredInstallPrompt = null;
      hideInstallBanner();
    } else if (isIOS()) {
      // iOS Safari — show guide
      showIosInstallModal();
    } else {
      if (typeof showToast === 'function') {
        showToast('Use browser menu → "Add to Home Screen"');
      }
    }
  };

  // ── iOS Detection & Guide ────────────────────────────────────────────────
  function isIOS() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      localStorage.getItem('al_noor_installed') === 'true';
  }

  function showIosInstallModal() {
    const modal = document.getElementById('iosInstallModal');
    if (modal) modal.classList.add('active');
  }

  window.closeIosModal = function (e) {
    if (!e || e.target.id === 'iosInstallModal' || e.target.tagName === 'BUTTON') {
      const modal = document.getElementById('iosInstallModal');
      if (modal) modal.classList.remove('active');
    }
  };

  // Show iOS install prompt on Safari if not installed
  document.addEventListener('DOMContentLoaded', () => {
    if (isIOS() && !isInStandaloneMode()) {
      const dismissed = localStorage.getItem('al_noor_ios_dismissed');
      const dismissedAt = parseInt(dismissed || '0');
      const threeDays = 3 * 24 * 60 * 60 * 1000;

      if (Date.now() - dismissedAt > threeDays) {
        // Show iOS install banner after 4 seconds
        setTimeout(() => {
          const banner = document.getElementById('installBanner');
          if (banner) {
            const btn = document.getElementById('installBannerBtn');
            if (btn) btn.textContent = 'How to Install';
            banner.classList.add('visible');
          }
        }, 4000);
      }
    }

    // If already installed (standalone mode)
    if (isInStandaloneMode()) {
      isInstalled = true;
      hideInstallBanner();
      const settingsBtn = document.getElementById('settingsInstallBtn');
      const settingsInfo = document.getElementById('settingsInstallInfo');
      if (settingsBtn) settingsBtn.style.display = 'none';
      if (settingsInfo) settingsInfo.style.display = 'block';
    }
  });

  // ── Offline / Online Detection ───────────────────────────────────────────
  function updateOnlineStatus() {
    const indicator = document.getElementById('offlineIndicator');
    if (!indicator) return;

    if (!navigator.onLine) {
      indicator.classList.add('visible');
    } else {
      indicator.classList.remove('visible');
    }
  }

  window.addEventListener('online', () => {
    updateOnlineStatus();
  });
  window.addEventListener('offline', updateOnlineStatus);

  document.addEventListener('DOMContentLoaded', updateOnlineStatus);

  // ── Splash Screen ────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splashScreen');
    if (!splash) return;

    // Hide splash after fonts + content load (min 1.8s for animation)
    const minTime = new Promise(r => setTimeout(r, 1800));
    const contentReady = new Promise(r => {
      if (document.readyState === 'complete') r();
      else window.addEventListener('load', r);
    });

    Promise.all([minTime, contentReady]).then(() => {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 500);
    });
  });

  // ── Cache Size Reporter ──────────────────────────────────────────────────
  window.getCacheInfo = function () {
    if (!swRegistration) return Promise.resolve({ count: 0 });
    return new Promise(resolve => {
      navigator.serviceWorker.addEventListener('message', function handler(e) {
        if (e.data.type === 'CACHE_SIZE') {
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve({ count: e.data.size });
        }
      });
      navigator.serviceWorker.controller?.postMessage({ type: 'GET_CACHE_SIZE' });
      setTimeout(() => resolve({ count: 0 }), 2000);
    });
  };

  // ── Pre-cache surah helper (call after loading a surah) ──────────────────
  window.precacheSurah = function (surahNumber, translation) {
    if (!navigator.serviceWorker.controller) return;
    const urls = [
      `https://api.alquran.cloud/v1/surah/${surahNumber}/${translation}`,
      `https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`
    ];
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_SURAH',
      urls
    });
  };

  // ── Share API ─────────────────────────────────────────────────────────────
  window.shareVerse = async function (arabic, translation, surahName, verseNum) {
    const text = `${arabic}\n\n"${translation}"\n\n— Quran, ${surahName}: ${verseNum}\n\nRead more on Al-Noor app`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Quran Verse', text });
        if (typeof showToast === 'function') showToast('Shared successfully');
      } catch (e) {
        if (e.name !== 'AbortError') {
          fallbackCopy(text);
        }
      }
    } else {
      fallbackCopy(text);
    }
  };

  function fallbackCopy(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        if (typeof showToast === 'function') showToast('Copied to clipboard');
      });
    }
  }

  // ── Vibration Helper ──────────────────────────────────────────────────────
  window.vibrateDevice = function (pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  // ── Wake Lock (keep screen on during reading) ────────────────────────────
  let wakeLock = null;

  window.requestWakeLock = async function () {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('[PWA] Wake lock acquired');
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible' && wakeLock === null) {
            wakeLock = await navigator.wakeLock.request('screen');
          }
        });
      } catch (e) {
        console.warn('[PWA] Wake lock failed:', e);
      }
    }
  };

  window.releaseWakeLock = async function () {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
      console.log('[PWA] Wake lock released');
    }
  };

  console.log('[PWA] Al-Noor PWA Manager loaded');
})();
