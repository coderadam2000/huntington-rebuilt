(function () {
  var date = document.getElementById('hub-date'), clock = document.getElementById('hub-clock');
  var dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  var timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  function tick() {
    var now = new Date();
    date.textContent = dateFormat.format(now);
    date.dateTime = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    clock.textContent = timeFormat.format(now);
    clock.dateTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }
  tick();
  setInterval(tick, 10000);
  document.addEventListener('visibilitychange', tick);
  if (!BUNDLE) {
    var schedule = local ? fetch('latest.json').then(function (r) {
      if (r.ok) return r.json();
    }) : fetchRepo('latest.json').then(function (r) { return JSON.parse(r.html); });
    schedule.then(function (metadata) {
      var value = metadata && metadata.nextUpdate;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
      var day = new Date(value + 'T00:00:00Z');
      if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value) return;
      var target = document.getElementById('hub-update');
      target.dateTime = value;
      target.textContent = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(day);
    }).catch(function () {});
  }
  var group = document.getElementById('game-rating');
  var buttons = group.querySelectorAll('button');
  function key(game) { return 'hgq:rate:' + game.dir; }
  function rating(game) {
    try {
      var value = localStorage.getItem(key(game));
      return value === 'like' || value === '1' ? 1 : value === 'dislike' || value === '-1' ? -1 : 0;
    } catch (_) { return 0; }
  }
  function paint(game) {
    if (!game) return;
    var value = rating(game);
    buttons.forEach(function (button) { button.setAttribute('aria-pressed', String(Number(button.dataset.rate) === value)); });
  }
  group.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-rate]'), game = current && current.game;
    if (!button || !game) return;
    var value = Number(button.dataset.rate);
    try { localStorage.setItem(key(game), value === rating(game) ? 'none' : value === 1 ? 'like' : 'dislike'); }
    catch (_) { hubToast('Could not save your rating.'); return; }
    paint(game);
    var L = window.HGGrapevine;
    if (L && L.online()) L.sync.run().catch(function () {});
  });
  window.addEventListener('storage', function (event) {
    if (current && (!event.key || event.key === key(current.game))) paint(current.game);
  });
  var start = playNow;
  playNow = function (game) {
    paint(game);
    return start.apply(this, arguments);
  };
})();
