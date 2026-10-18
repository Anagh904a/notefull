/* ColorNote .backup -> Notefull merger (plain JS, Web Crypto, uses global `localforage`).
 * Reads the file from <input id="colornoteFileInput" type="file" accept=".backup">.
 * Call importColorNoteBackup() from a click handler.
 * Notes are merged into localforage 'notes', checklists into 'lists'. */

const CN = {
  NOTE_PASSWORD: 'ColorNote Password', // built-in key ColorNote uses for individually locked notes
  SALT: 'ColorNote Fixed Salt',
  HEADER_BYTES: 28,                    // backup header before the AES data
};

// EDIT THESE to change the saved format. Notes and lists are built from their own template.
const NOTE_TEMPLATE = {
  id: '',
  title: 'Untitled Note',
  type: 'note',
  content: '',
  password: '',
  remainderTime: null,
  repeatType: 'once',
  remainderEnabled: false,
  notificationId: null,
  date: 0
};

const LIST_TEMPLATE = {
  id: '',
  title: 'Untitled Checklist',
  type: 'list',
  items: [], // [{ text: string, checked: boolean }]
  password: '',
  remainderTime: null,
  repeatType: 'once',
  remainderEnabled: false,
  notificationId: null,
  date: 0
};

// Shape of ONE checklist item. Edit field names here if Notefull expects different ones.
// Every item also gets a unique id (many UIs key list rows by item.id).
const ITEM_TEMPLATE = {
  id: '',
  name: '',
  checked: false
};

// Copies the template, then fills only fields the template defines.
function fromTemplate(template, fields) {
  const rec = structuredClone(template);
  for (const k of Object.keys(rec)) {
    if (fields[k] !== undefined) rec[k] = fields[k];
  }
  return rec;
}

/* ---------- logging ---------- */
const LOG = [];
function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  LOG.push(line);
  console.log(line);
}

/* ---------- crypto helpers ---------- */
const enc = new TextEncoder();
const concat = (...a) => {
  const o = new Uint8Array(a.reduce((s, x) => s + x.length, 0));
  let p = 0;
  for (const x of a) { o.set(x, p); p += x.length; }
  return o;
};
const bmp = (s) => { // UTF-16BE + 00 00 terminator (PKCS#12 password format)
  const o = new Uint8Array(s.length * 2 + 2);
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); o[2 * i] = c >> 8; o[2 * i + 1] = c & 255; }
  return o;
};

function md5(bytes) {
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const K = new Int32Array(64).map((_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0);
  const n = bytes.length, total = (((n + 8) >>> 6) + 1) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes); buf[n] = 0x80;
  const w = new Int32Array(buf.buffer);
  w[w.length - 2] = (n << 3) | 0;
  w[w.length - 1] = Math.floor(n / 536870912);
  let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
  for (let o = 0; o < w.length; o += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + w[o + g]) | 0;
      A = D; D = C; C = B;
      const s = S[(i >> 4) * 4 + (i & 3)];
      B = (B + ((F << s) | (F >>> (32 - s)))) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  return new Uint8Array(new Int32Array([a0, b0, c0, d0]).buffer);
}

// OpenSSL EVP_BytesToKey (MD5) -- 16 bytes = AES-128 key
function evpKey(pw, salt, iter) {
  let d = md5(concat(pw, salt));
  for (let i = 1; i < iter; i++) d = md5(d);
  return d;
}

// PKCS#12 key derivation with SHA-256 (BouncyCastle PBEWITHSHA256AND256BITAES-CBC-BC)
async function pkcs12Kdf(pwBmp, salt, iter, id, n) {
  const sha = async (b) => new Uint8Array(await crypto.subtle.digest('SHA-256', b));
  const v = 64, u = 32;
  const fill = (x) => {
    if (!x.length) return new Uint8Array(0);
    const o = new Uint8Array(v * Math.ceil(x.length / v));
    for (let i = 0; i < o.length; i++) o[i] = x[i % x.length];
    return o;
  };
  const toBig = (b) => BigInt('0x' + ([...b].map((x) => x.toString(16).padStart(2, '0')).join('') || '0'));
  const fromBig = (x) => Uint8Array.from(x.toString(16).padStart(v * 2, '0').match(/../g).map((h) => parseInt(h, 16)));
  const D = new Uint8Array(v).fill(id);
  let I = concat(fill(salt), fill(pwBmp));
  const out = [];
  for (let have = 0; have < n; have += u) {
    let A = await sha(concat(D, I));
    for (let i = 1; i < iter; i++) A = await sha(A);
    out.push(A);
    const B = toBig(fill(A)) + 1n;
    const parts = [];
    for (let j = 0; j < I.length; j += v) parts.push(fromBig((toBig(I.subarray(j, j + v)) + B) % (1n << 512n)));
    I = concat(...parts);
  }
  return concat(...out).subarray(0, n);
}

async function aesCbcDecrypt(key, data) { // zero IV, PKCS5 padding (as in ColorNote's class j)
  const k = await crypto.subtle.importKey('raw', key, 'AES-CBC', false, ['decrypt']);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, k, data));
}

/* ---------- unlocking ---------- */
let _noteKey = null;
async function decryptNote(b64) { // individually locked note/list -> text, or null
  try {
    _noteKey ??= await pkcs12Kdf(bmp(CN.NOTE_PASSWORD), enc.encode(CN.SALT), 20, 1, 32);
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(await aesCbcDecrypt(_noteKey, bin));
  } catch { return null; }
}

async function decryptBackup(bytes, pin) { // whole .backup -> text, tries known variants
  const salt = enc.encode(CN.SALT), pw = enc.encode(pin);
  const variants = [
    ['MD5-OpenSSL x1', async () => evpKey(pw, salt, 1)],
    ['MD5-OpenSSL x20', async () => evpKey(pw, salt, 20)],
    ['PKCS12-SHA256 x20', () => pkcs12Kdf(bmp(pin), salt, 20, 1, 32)],
  ];
  for (const [label, getKey] of variants) {
    const key = await getKey();
    for (const off of [CN.HEADER_BYTES, 0]) {
      const ct = bytes.subarray(off);
      if (!ct.length || ct.length % 16) continue;
      try {
        const text = new TextDecoder('utf-8').decode(await aesCbcDecrypt(key, ct));
        if (/\{\s*"_id"\s*:/.test(text)) { log(`Backup unlocked: ${label}, header ${off}B`); return text; }
      } catch { /* wrong key/offset, try next */ }
    }
  }
  return null;
}

/* ---------- parsing ---------- */
function objectEnd(text, start) { // string-aware brace matching; -1 if truncated
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
    else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i + 1;
  }
  return -1;
}

function salvage(frag) { // best effort for truncated records
  const num = (k) => { const m = frag.match(new RegExp(`"${k}"\\s*:\\s*(-?\\d+)`)); return m ? +m[1] : undefined; };
  const str = (k) => {
    const m = frag.match(new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    if (!m) return undefined;
    try { return JSON.parse('"' + m[1] + '"'); } catch { return m[1]; }
  };
  let note = str('note');
  if (note === undefined) {
    const m = frag.match(/"note"\s*:\s*"([\s\S]*)$/);
    if (m) note = m[1].replace(/\\n/g, '\n').replace(/\\\//g, '/');
  }
  const _id = num('_id');
  if (_id === undefined) return null;
  return { _id, title: str('title'), note, uuid: str('uuid'), encrypted: num('encrypted'), type: num('type'),
           created_date: num('created_date'), modified_date: num('modified_date'), reminder_date: num('reminder_date') };
}

function parseChecklist(text) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => ({
    text: l.replace(/^\[[ VvXx]?\]\s*/, '').trim(),
    checked: /^\[[VvXx]\]/.test(l),
  })).filter((i) => i.text)
    .map((i) => fromTemplate(ITEM_TEMPLATE, { ...i, id: crypto.randomUUID() }));
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Converts one raw ColorNote record to a Notefull note or list.
 * `pin` is the password the user entered; it is stored ONLY on items that were locked in ColorNote. */
async function convertRecord(o, pin, stats) {
  const wasLocked = String(o.encrypted) === '1';
  let text = typeof o.note === 'string' ? o.note : '';

  if (wasLocked) {
    stats.locked++;
    const plain = await decryptNote(text);
    if (plain === null) { stats.undecryptable++; text = '[Locked Note: Unable to decrypt]'; }
    else text = plain;
  }

  const isList = o.type === 16;
  const reminder = Number(o.reminder_date) || 0;
  const hasFutureReminder = reminder > Date.now();   // past reminders are not re-armed
  const common = {
    id: o.uuid || (o._id !== undefined ? `cn_${o._id}` : crypto.randomUUID()),
    password: wasLocked ? pin : '',
    remainderTime: hasFutureReminder ? reminder : null,
    remainderEnabled: hasFutureReminder,
    date: o.modified_date || o.created_date || Date.now(),
  };

  if (isList) {
    return fromTemplate(LIST_TEMPLATE, {
      ...common,
      title: (o.title || 'Untitled Checklist').trim(),
      items: parseChecklist(text),
    });
  }
  return fromTemplate(NOTE_TEMPLATE, {
    ...common,
    title: (o.title || 'Untitled Note').trim(),
    content: escapeHtml(text).replace(/\r?\n/g, '<br>'),
  });
}

async function parseBackup(text, pin) {
  const starts = [...text.matchAll(/\{\s*"_id"\s*:/g)].map((m) => m.index);
  const stats = { locked: 0, undecryptable: 0, salvaged: 0, skipped: 0 };
  const byId = new Map();
  for (let n = 0; n < starts.length; n++) {
    const s = starts[n], e = objectEnd(text, s);
    let obj = null;
    if (e !== -1) { try { obj = JSON.parse(text.slice(s, e)); } catch { /* fall through */ } }
    if (!obj) { obj = salvage(text.slice(s, starts[n + 1] ?? text.length)); if (obj) stats.salvaged++; }
    if (!obj) { stats.skipped++; continue; }
    const rec = await convertRecord(obj, pin, stats);
    const old = byId.get(rec.id);
    if (!old || rec.date >= old.date) byId.set(rec.id, rec);   // keep the newest copy
  }
  const all = [...byId.values()];
  const notes = all.filter((r) => r.type === 'note');
  const lists = all.filter((r) => r.type === 'list');
  log(`Parsed ${notes.length} notes, ${lists.length} lists`, JSON.stringify(stats));
  return { notes, lists, stats };
}

/* ---------- main ---------- */
async function importColorNoteBackup() {
  const fileInput = document.getElementById('colornoteFileInput');
  const file = fileInput?.files?.[0];

  if (!file) {
    if (typeof showToastError === 'function') showToastError('Please select a backup file first!');
    else alert('Please select a backup file first!');
    return;
  }

  try {
    log(`Selected ${file.name} (${file.size} bytes)`);
    const bytes = new Uint8Array(await file.arrayBuffer());

    let text = null, pin = '';
    for (let attempt = 1; attempt <= 3 && text === null; attempt++) {
      pin = prompt('Enter ColorNote Master Password / PIN (default is 0000):', '0000');
      if (pin === null) { log('Cancelled at PIN prompt'); return; }
      text = await decryptBackup(bytes, pin);
      if (text === null) {
        log(`Unlock failed (attempt ${attempt})`);
        alert('Could not unlock backup. Wrong password or unsupported format.');
      }
    }
    if (text === null) return;

    const { notes: importedNotes, lists: importedLists, stats } = await parseBackup(text, pin);
    const total = importedNotes.length + importedLists.length;
    if (!total) {
      alert('No valid notes or checklists found in this file.');
      return;
    }

    let msg = `Found ${total} items (${importedNotes.length} notes, ${importedLists.length} checklists).`;
    if (stats.locked) msg += `\n${stats.locked} locked item(s) will keep the password you entered.`;
    if (stats.undecryptable) msg += `\n${stats.undecryptable} locked item(s) could not be decrypted.`;
    if (!confirm(`${msg}\n\nMerge into Notefull?`)) { log('Merge declined'); return; }

    // 1. Load current data so nothing existing is overwritten
    const existingNotes = (await localforage.getItem('notes')) || [];
    const existingLists = (await localforage.getItem('lists')) || [];

    // 2. Notes -> 'notes' (skip IDs that already exist)
    const noteIds = new Set(existingNotes.map((n) => n.id));
    let addedNotes = 0;
    for (const n of importedNotes) {
      if (noteIds.has(n.id)) continue;
      existingNotes.push(n);
      noteIds.add(n.id);
      addedNotes++;
      if (typeof notesMap !== 'undefined') notesMap[n.id] = n;
    }

    // 3. Checklists -> 'lists' (skip IDs that already exist)
    const listIds = new Set(existingLists.map((l) => l.id));
    let addedLists = 0;
    for (const l of importedLists) {
      if (listIds.has(l.id)) continue;
      existingLists.push(l);
      listIds.add(l.id);
      addedLists++;
    }

    // 4. Save
    await localforage.setItem('notes', existingNotes);
    await localforage.setItem('lists', existingLists);
    log(`Saved: +${addedNotes} notes, +${addedLists} lists (${total - addedNotes - addedLists} already existed)`);

    // 5. Sync in-memory state
    if (typeof notes !== 'undefined') notes = existingNotes;
    if (typeof lists !== 'undefined') lists = existingLists;

    // 6. Refresh UI
    if (typeof rebuildNotes === 'function') rebuildNotes();
    if (typeof renderItems === 'function') renderItems();
    if (typeof showToast === 'function') showToast(`Imported ${addedNotes + addedLists} items!`);

    alert(`Successfully imported ${addedNotes} notes and ${addedLists} checklists.` +
          (total - addedNotes - addedLists ? `\n${total - addedNotes - addedLists} were already in Notefull and were skipped.` : ''));
  } catch (err) {
    log('ERROR', (err && err.stack) || err);
    if (typeof showToastError === 'function') showToastError('Import failed: ' + (err.message || err));
    else alert('Import failed: ' + (err.message || err));
  } finally {
    if (fileInput) fileInput.value = '';
  }
}
