// ===== Top bar clock (2026-11-20): the time and today's date, in Eastern time like the rest of the launcher (hgTime) =====
function clkTick() {
  var el = document.getElementById('hgclock'); if (!el) return;
  var now = new Date();
  el.querySelector('.ct').textContent = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET';
  el.querySelector('.cd').textContent = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' });
}
(function () {
  var tabs = document.getElementById('tabs'); if (!tabs) return;
  var el = document.createElement('div'); el.id = 'hgclock';
  el.innerHTML = '<b class="ct"></b><span class="cd"></span>';
  tabs.parentNode.insertBefore(el, tabs.nextSibling);
  clkTick(); setInterval(clkTick, 15000);
})();
