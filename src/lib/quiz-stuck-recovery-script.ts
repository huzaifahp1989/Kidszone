import { LIVE_APP_URL } from '@/lib/app-url';
import { QUIZ_CLIENT_VERSION } from '@/lib/quiz-client-version';

/**
 * Runs before React hydrates. Recovers users stuck on cached quiz bundles that
 * block the results screen on "Submitting your answers…".
 * Also migrates WebViews still parked on the stale Vercel host.
 */
export const QUIZ_STUCK_RECOVERY_SCRIPT = `
(function () {
  try {
    var live = ${JSON.stringify(LIVE_APP_URL)}.replace(/\\/$/, '');
    var host = (location.hostname || '').toLowerCase();
    var path = location.pathname || '';

    // Kids Zone may still be parked on the stale Vercel project after old redirects.
    if (host === 'islamic-kids-platform.vercel.app') {
      location.replace(live + path + location.search + location.hash);
      return;
    }

    if (path !== '/quiz' && !path.startsWith('/quiz/')) return;

    var version = ${JSON.stringify(QUIZ_CLIENT_VERSION)};

    function clearCaches() {
      try {
        if (window.caches && caches.keys) {
          caches.keys().then(function (keys) {
            keys.forEach(function (k) { caches.delete(k); });
          });
        }
      } catch (e) {}
    }

    var stored = '';
    try { stored = localStorage.getItem('quiz-client-version') || sessionStorage.getItem('quiz-client-version') || ''; } catch (e) {}
    if (stored !== version) {
      clearCaches();
      try {
        localStorage.setItem('quiz-client-version', version);
        sessionStorage.setItem('quiz-client-version', version);
      } catch (e2) {}
      var url = new URL(location.href);
      if (url.searchParams.get('_qv') !== version) {
        url.searchParams.set('_qv', version);
        location.replace(url.toString());
        return;
      }
    }

    var stuckSince = 0;
    var reloaded = false;
    try { reloaded = sessionStorage.getItem('quiz-stuck-reload-v3') === '1'; } catch (e4) {}

    function hasBlockingSubmitCopy() {
      var text = (document.body && document.body.innerText) || '';
      return text.indexOf('Submitting your answers') !== -1;
    }

    function showRecovery() {
      var nodes = document.querySelectorAll('p, div, span');
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var copy = (node.textContent || '').trim();
        if (copy !== 'Submitting your answers...' && copy !== 'Submitting your answers…') continue;
        var panel = node.closest('.rounded-2xl') || node.parentElement;
        if (!panel) continue;
        panel.innerHTML =
          '<div style="padding:2rem 1rem;text-align:center">' +
          '<p style="font-size:1.25rem;font-weight:700;color:#1e1b4b;margin-bottom:0.75rem">Quiz finished</p>' +
          '<p style="color:#475569;margin-bottom:1rem">Updating the quiz screen… If points did not appear, open Profile and pull to refresh.</p>' +
          '<button type="button" id="quiz-stuck-retry" style="width:100%;padding:1rem;border:0;border-radius:0.75rem;background:linear-gradient(90deg,#7c3aed,#6d28d9);color:#fff;font-weight:700;font-size:1rem">Reload Quiz</button>' +
          '</div>';
        var btn = document.getElementById('quiz-stuck-retry');
        if (btn) {
          btn.addEventListener('click', function () {
            clearCaches();
            location.replace(live + '/quiz?_qv=' + encodeURIComponent(version) + '&_t=' + Date.now());
          });
        }
        return true;
      }
      return false;
    }

    function tick() {
      if (!hasBlockingSubmitCopy()) {
        stuckSince = 0;
        return;
      }
      if (!stuckSince) stuckSince = Date.now();
      var elapsed = Date.now() - stuckSince;
      if (elapsed < 2500) return;
      if (!reloaded) {
        try { sessionStorage.setItem('quiz-stuck-reload-v3', '1'); } catch (e5) {}
        clearCaches();
        location.replace(live + '/quiz?_qv=' + encodeURIComponent(version) + '&_qr=' + Date.now());
        return;
      }
      showRecovery();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setInterval(tick, 500);
      });
    } else {
      setInterval(tick, 500);
    }
  } catch (err) {}
})();
`;
