import { QUIZ_CLIENT_VERSION } from '@/lib/quiz-client-version';

/**
 * Runs before React hydrates. Recovers users stuck on cached quiz bundles that
 * block the results screen on "Submitting your answers…".
 */
export const QUIZ_STUCK_RECOVERY_SCRIPT = `
(function () {
  try {
    var path = location.pathname || '';
    if (path !== '/quiz' && !path.startsWith('/quiz/')) return;

    var version = ${JSON.stringify(QUIZ_CLIENT_VERSION)};
    var stored = '';
    try { stored = sessionStorage.getItem('quiz-client-version') || ''; } catch (e) {}
    if (stored && stored !== version) {
      try { sessionStorage.setItem('quiz-client-version', version); } catch (e2) {}
      var url = new URL(location.href);
      if (!url.searchParams.has('_qv')) {
        url.searchParams.set('_qv', version);
        location.replace(url.toString());
        return;
      }
    }
    try { sessionStorage.setItem('quiz-client-version', version); } catch (e3) {}

    var stuckSince = 0;
    var reloaded = false;
    try { reloaded = sessionStorage.getItem('quiz-stuck-reload') === '1'; } catch (e4) {}

    function hasBlockingSubmitCopy() {
      var text = (document.body && document.body.innerText) || '';
      if (text.indexOf('Submitting your answers') !== -1) return true;
      if (text.indexOf('Quiz Completed') !== -1) return false;
      return text.indexOf('Saving your score') !== -1 && text.indexOf('Your Score') === -1;
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
          '<p style="color:#475569;margin-bottom:1rem">Your answers were saved on this device. Pull down to refresh your points if they have not updated yet.</p>' +
          '<button type="button" id="quiz-stuck-retry" style="width:100%;padding:1rem;border:0;border-radius:0.75rem;background:linear-gradient(90deg,#7c3aed,#6d28d9);color:#fff;font-weight:700;font-size:1rem">Return to Quiz Menu</button>' +
          '</div>';
        var btn = document.getElementById('quiz-stuck-retry');
        if (btn) {
          btn.addEventListener('click', function () {
            location.href = '/quiz';
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
      if (elapsed < 6000) return;
      if (!reloaded) {
        try { sessionStorage.setItem('quiz-stuck-reload', '1'); } catch (e5) {}
        var next = new URL(location.href);
        next.searchParams.set('_qr', String(Date.now()));
        location.replace(next.toString());
        return;
      }
      showRecovery();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setInterval(tick, 1000);
      });
    } else {
      setInterval(tick, 1000);
    }
  } catch (err) {}
})();
`;
