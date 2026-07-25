/**
 * Emergency hotfix for Kids Zone WebViews stuck on stale quiz bundles.
 * Safe to load from any host — migrates to the live deployment and clears caches.
 */
(function () {
  try {
    var live = 'https://huzaifahp1989-audio.vercel.app';
    var version = '2026-07-25-quiz-submit-v4';
    var host = (location.hostname || '').toLowerCase();
    var path = location.pathname || '';

    if (host === 'islamic-kids-platform.vercel.app') {
      location.replace(live + path + location.search + location.hash);
      return;
    }

    if (path !== '/quiz' && path.indexOf('/quiz/') !== 0) return;

    var text = (document.body && document.body.innerText) || '';
    var stuck =
      text.indexOf('Submitting your answers') !== -1 ||
      text.indexOf('Saving your score') !== -1;
    if (!stuck) return;

    try {
      if (window.caches && caches.keys) {
        caches.keys().then(function (keys) {
          keys.forEach(function (k) {
            caches.delete(k);
          });
        });
      }
    } catch (e) {}

    location.replace(live + '/quiz?hotfix=1&_qv=' + encodeURIComponent(version) + '&t=' + Date.now());
  } catch (err) {}
})();
