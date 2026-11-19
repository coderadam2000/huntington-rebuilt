// This file also runs when index.html is pasted into another page or opened on its own.
(function () {
  var repo = 'coderadam2000/huntington-rebuilt';
  var runtime = 'launcher/runtime.html';
  var version = /^[\w.-]+$/.test(window.HG_VERSION || '') ? window.HG_VERSION : 'main';
  var hosts = ['cdn', 'fastly', 'gcore', 'testingcf'];
  var boot = document.getElementById('boot'), message = document.getElementById('msg'), tip = boot.querySelector('.bt-tip');
  var saved, offlineTimer, started = false, failed = false, mirror = 0;

  function status(progress, text, detail) {
    boot.style.setProperty('--p', progress);
    message.textContent = text;
    tip.textContent = detail || '';
  }

  function isRuntime(html) {
    // Also recognizes full hub HTML cached or published before the entry file was split out.
    return typeof html === 'string' && /<div\s+id="view-games"/.test(html);
  }

  function start(html, ref) {
    if (started) return;
    started = true;
    clearTimeout(offlineTimer);
    status(.72, 'Starting');
    window.HG_VERSION = ref || undefined;
    window.HG_LOAD_P = .72;
    window.HG_BOOT_RUNTIME = html;
    document.open();
    document.write(html);
    document.close();
  }

  function useSaved() {
    if (!saved) return false;
    start(saved.text, saved.rel || version);
    return true;
  }

  function readSaved() {
    try {
      var request = indexedDB.open('hg-offline:' + repo, 1);
      request.onupgradeneeded = function () { request.result.createObjectStore('files'); };
      request.onsuccess = function () {
        var db = request.result;
        try {
          var lookup = db.transaction('files').objectStore('files').get('hub');
          lookup.onsuccess = function () {
            if (lookup.result && isRuntime(lookup.result.text)) saved = lookup.result;
            if (failed && !started) useSaved();
          };
        } catch (error) {}
        finally { db.close(); }
      };
    } catch (error) {}
  }

  async function download(url, timeout) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeout);
    try {
      var response = await fetch(url, { cache: 'no-cache', signal: controller.signal });
      if (!response.ok) return { status: response.status };
      return { html: await response.text() };
    } finally { clearTimeout(timer); }
  }

  async function load() {
    // Direct visits to the served checkout keep using its local games and account files.
    var host = location.hostname;
    if (!window.HG_VERSION && (/\.github\.io$/.test(host) || host === 'localhost' || host === '127.0.0.1')) {
      try {
        var nearby = await download(runtime, 3500);
        if (isRuntime(nearby.html)) return start(nearby.html);
      } catch (error) {}
    }

    while (!started && mirror < hosts.length) {
      var base = 'https://' + hosts[mirror++] + '.jsdelivr.net/gh/' + repo + '@' + version + '/';
      status(.3 + mirror * .08, mirror > 1 ? 'Trying another mirror' : 'Downloading the launcher');
      try {
        var result = await download(base + runtime, 10000);
        // A copied entry can also boot against a release that still ships the full hub at index.html.
        if (!started && result.status === 404) result = await download(base + 'index.html', 10000);
        if (isRuntime(result.html)) return start(result.html, version);
      } catch (error) {}
    }
    if (started) return;
    failed = true;
    if (!useSaved()) status(1, 'Could not download the launcher', 'Check your connection and reload to try again.');
  }

  readSaved();
  offlineTimer = setTimeout(function () { if (!started) useSaved(); }, 8000);
  load();
})();
