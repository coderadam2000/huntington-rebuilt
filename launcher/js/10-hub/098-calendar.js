// Personal calendar. Dates and optional times are stored as entered in the browser.
var openCalendar = (function () {
  const byId = id => document.getElementById(id);
  const view = byId('view-cal');
  const grid = byId('cal-grid');
  const agenda = byId('cal-events');
  const dialog = byId('cal-dialog');
  const form = byId('cal-form');
  const titleField = byId('cal-title');
  const dateField = byId('cal-date');
  const timeField = byId('cal-time');
  const typeField = byId('cal-type');
  const guestKey = 'hg:calendar-local';
  const categories = new Map(Array.from(typeField.options, option => [option.value, option.textContent]));
  const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
  const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
  let month;
  let selected;
  let renderedKey;
  let renderedValue;
  let editor;
  let syncTimer;
  let attached;

  function dateKey(date) {
    return [String(date.getFullYear()).padStart(4, '0'), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function dateFromKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setFullYear(year, month - 1, day);
    return date;
  }

  function validDate(key) {
    return /^\d{4}-\d{2}-\d{2}$/.test(key) && key >= '0001-01-01' && dateKey(dateFromKey(key)) === key;
  }

  function formatTime(value) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return 'All day';
    const [hour, minute] = value.split(':').map(Number);
    return timeFormat.format(new Date(Date.UTC(2000, 0, 1, hour, minute)));
  }

  function get(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function read(value) {
    try { return Object.assign(Object.create(null), JSON.parse(value)); }
    catch (error) { return Object.create(null); }
  }

  function calendarKey() {
    const uid = get('hgv:uid');
    const account = window.HGGrapevine && window.HGGrapevine.me();
    if (uid && (account ? account.userId === uid : get('hgv:key'))) return 'gv:set:calendar:' + uid;
    return guestKey;
  }

  function importLegacy() {
    if (get(guestKey) !== null) return;
    const legacy = read(get('calendarEvents'));
    const events = Object.create(null);
    for (const [date, entries] of Object.entries(legacy)) {
      if (!validDate(date) || !Array.isArray(entries)) continue;
      entries.forEach((entry, index) => {
        if (!entry || typeof entry.title !== 'string' || !entry.title.trim()) return;
        const id = 'legacy-' + date + '-' + (entry.id || index);
        events[id] = { date, title: entry.title, type: categories.has(entry.type) ? entry.type : 'Homework', time: '', changedAt: 0 };
      });
    }
    if (Object.keys(events).length) {
      try { localStorage.setItem(guestKey, JSON.stringify(events)); }
      catch (error) { byId('cal-message').textContent = 'Could not import events from this browser.'; }
    }
  }

  function importable(events) {
    return Object.entries(read(get(guestKey))).filter(([id, event]) => event && !event.deleted && !events[id]);
  }

  function updateAccount(key, events) {
    const guest = key === guestKey;
    const link = window.HGGrapevine;
    byId('cal-signin').hidden = !guest || !!BUNDLE;
    byId('cal-import').hidden = guest || !importable(events).length;
    let status = 'Saved on this device';
    if (!guest) {
      if (!link || !link.online()) status = 'Offline · Changes sync when you reconnect';
      else if (link.sync.status().state === 'error') status = 'Sync unavailable · Changes saved on this device';
      else if (link.sync.status().state === 'syncing') status = 'Syncing with Grapevine…';
      else status = 'Syncs with your Grapevine account';
    }
    byId('cal-sync').textContent = status;
  }

  function scheduleSync(key) {
    const link = window.HGGrapevine;
    if (key === guestKey || !link || !link.online()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async function () {
      try {
        if (link.sync.status().state === 'syncing') await link.sync.run();
        if (calendarKey() === key && link.online()) await link.sync.run();
      } catch (error) { refresh(); }
    }, 450);
  }

  function save(key, events) {
    const value = JSON.stringify(events);
    if (key !== guestKey && value.length > 400000) throw new Error('Your calendar is too large to sync.');
    try { localStorage.setItem(key, value); }
    catch (error) { throw new Error('Could not save the calendar on this device.'); }
    scheduleSync(key);
  }

  function button(className, label) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.textContent = label;
    return element;
  }

  function eventButton(id, event, allDetails) {
    const time = formatTime(event.time);
    const label = event.time ? time + ' · ' + event.title : event.title;
    const element = button(allDetails ? 'cal-entry' : 'cal-chip', allDetails ? event.title : label);
    element.dataset.calType = event.type;
    if (allDetails) {
      const meta = document.createElement('small');
      meta.textContent = time + ' · ' + (categories.get(event.type) || 'Event');
      element.appendChild(meta);
    } else {
      element.title = label;
    }
    element.addEventListener('click', () => editEvent(event.date, id, event));
    return element;
  }

  function render(events) {
    const days = new Map();
    const sorted = Object.entries(events).filter(([, event]) => event && !event.deleted && typeof event.title === 'string' && validDate(event.date));
    sorted.sort(([, a], [, b]) => (a.time || '').localeCompare(b.time || '') || a.title.localeCompare(b.title));
    for (const item of sorted) {
      const date = item[1].date;
      if (!days.has(date)) days.set(date, []);
      days.get(date).push(item);
    }
    const date = new Date(month);
    const today = dateKey(new Date());
    const cells = document.createDocumentFragment();
    const start = date.getDay();
    for (let i = 0; i < 42; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      cells.appendChild(cell);
      if (i < start || date.getMonth() !== month.getMonth()) {
        cell.classList.add('cal-pad');
        cell.setAttribute('aria-hidden', 'true');
        if (i >= start && i % 7 === 6) break;
        continue;
      }
      const key = dateKey(date);
      const entries = days.get(key) || [];
      const day = button('cal-day', '');
      day.dataset.date = key;
      day.setAttribute('aria-label', dayFormat.format(date) + ', ' + entries.length + (entries.length === 1 ? ' event' : ' events'));
      day.setAttribute('aria-pressed', String(key === selected));
      if (key === today) day.setAttribute('aria-current', 'date');
      const number = document.createElement('span');
      number.textContent = date.getDate();
      day.appendChild(number);
      if (entries.length) {
        const count = document.createElement('span');
        count.className = 'cal-count';
        count.textContent = entries.length;
        count.setAttribute('aria-hidden', 'true');
        day.appendChild(count);
      }
      day.addEventListener('click', () => selectDay(key));
      cell.classList.toggle('cal-selected', key === selected);
      cell.appendChild(day);
      for (const [id, event] of entries.slice(0, 2)) cell.appendChild(eventButton(id, event, false));
      if (entries.length > 2) {
        const more = button('cal-more', '+' + (entries.length - 2) + ' more');
        more.addEventListener('click', () => { selectDay(key); agenda.querySelector('button').focus(); });
        cell.appendChild(more);
      }
      date.setDate(date.getDate() + 1);
      if (date.getMonth() !== month.getMonth() && i % 7 === 6) break;
    }
    grid.replaceChildren(cells);
    byId('cal-month').textContent = monthFormat.format(month);
    byId('cal-day').textContent = dayFormat.format(dateFromKey(selected));
    const entries = days.get(selected) || [];
    agenda.replaceChildren(...entries.map(([id, event]) => eventButton(id, event, true)));
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'cal-empty';
      empty.textContent = 'No events scheduled.';
      agenda.appendChild(empty);
    }
  }

  function refresh(repaint = false) {
    if (view.hidden || !selected) return;
    const key = calendarKey();
    const value = get(key);
    const events = read(value);
    if (editor && editor.key !== key) dialog.close();
    updateAccount(key, events);
    if (repaint || key !== renderedKey || value !== renderedValue) {
      renderedKey = key;
      renderedValue = value;
      render(events);
    }
  }

  function selectDay(key, focus = true) {
    selected = key;
    month = dateFromKey(selected);
    month.setDate(1);
    refresh(true);
    if (focus) grid.querySelector('[data-date="' + selected + '"]').focus();
  }

  function moveMonth(offset) {
    const next = new Date(month);
    next.setMonth(next.getMonth() + offset);
    if (next.getFullYear() < 1 || next.getFullYear() > 9999) return;
    selectDay(dateKey(next), false);
  }

  function editEvent(date, id, event) {
    editor = { key: calendarKey(), id, event };
    form.reset();
    titleField.setCustomValidity('');
    byId('cal-error').textContent = '';
    byId('cal-dialog-heading').textContent = id ? 'Edit event' : 'Add event';
    byId('cal-delete').hidden = !id;
    dateField.value = date;
    titleField.value = event ? event.title : '';
    typeField.value = event && categories.has(event.type) ? event.type : 'Homework';
    timeField.value = event ? event.time || '' : '';
    dialog.showModal();
  }

  function applyEdit(deleted) {
    if (!editor) return;
    const key = calendarKey();
    if (key !== editor.key) { dialog.close(); return; }
    const events = read(get(key));
    const id = editor.id || Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
    const current = events[id];
    if (editor.id && JSON.stringify(current) !== JSON.stringify(editor.event)) {
      byId('cal-error').textContent = 'This event changed on another device. Reopen it to make changes.';
      return;
    }
    const changedAt = Math.max(Date.now(), current ? current.changedAt + 1 : 0);
    events[id] = deleted ? { changedAt, deleted: true } : {
      date: dateField.value, title: titleField.value.trim(), type: typeField.value, time: timeField.value, changedAt
    };
    if (deleted && key === guestKey) delete events[id];
    try { save(key, events); }
    catch (error) { byId('cal-error').textContent = error.message; return; }
    dialog.close();
    byId('cal-message').textContent = deleted ? 'Event deleted.' : 'Event saved.';
    selectDay(deleted ? current.date : dateField.value);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!titleField.value.trim()) {
      titleField.setCustomValidity('Enter an event title.');
      titleField.reportValidity();
      return;
    }
    if (validDate(dateField.value)) applyEdit(false);
  });
  titleField.addEventListener('input', () => titleField.setCustomValidity(''));
  dialog.addEventListener('close', () => { editor = null; });
  byId('cal-delete').addEventListener('click', () => applyEdit(true));
  byId('cal-cancel').addEventListener('click', () => dialog.close());
  byId('cal-add').addEventListener('click', () => editEvent(selected));
  byId('cal-prev').addEventListener('click', () => moveMonth(-1));
  byId('cal-next').addEventListener('click', () => moveMonth(1));
  byId('cal-today').addEventListener('click', () => selectDay(dateKey(new Date()), false));
  byId('cal-signin').addEventListener('click', () => showTab('acct'));
  byId('cal-import').addEventListener('click', function () {
    const key = calendarKey();
    if (key === guestKey) return;
    const events = read(get(key));
    const entries = importable(events);
    if (!entries.length) return;
    for (const [id, event] of entries) events[id] = event;
    try {
      save(key, events);
      byId('cal-message').textContent = 'Local events imported.';
      refresh();
    } catch (error) { byId('cal-message').textContent = error.message; }
  });
  byId('tab-cal').addEventListener('click', () => showTab('cal'));
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === renderedKey || event.key === 'hgv:uid' || event.key === guestKey) refresh();
  });

  return function () {
    importLegacy();
    byId('cal-message').textContent = '';
    if (selected) refresh();
    else selectDay(dateKey(new Date()), false);
    if (!BUNDLE && !attached) loadGV().then(link => {
      if (!attached) {
        attached = true;
        link.on('change', () => refresh());
        link.on('sync', () => refresh());
      }
      refresh();
    }, () => refresh());
  };
})();
