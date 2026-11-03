/** [AI-GENERATED][FINANCE][V342-H] Safe CSV and Indonesian IDR/date parsing for payout imports. */
export function parsePayoutCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < String(text).length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (quoted) throw new Error('CSV memiliki tanda kutip yang tidak tertutup.');
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((value) => String(value).trim()));
}

export function parsePayoutIDR(value) {
  let raw = String(value ?? '').trim().replace(/idr|rp/ig, '').replace(/[\s\u00a0]/g, '');
  if (!raw || raw.startsWith('-') || raw.startsWith('(') || raw.endsWith(')')) return null;
  if (/^\d{1,3}(?:,\d{3})+(?:\.00)?$/.test(raw)) raw = raw.replace(/,/g, '').replace(/\.00$/, '');
  else if (/^\d{1,3}(?:\.\d{3})+(?:,00)?$/.test(raw)) raw = raw.replace(/\./g, '').replace(/,00$/, '');
  else if (/^\d+(?:[.,]00)$/.test(raw)) raw = raw.replace(/[.,]00$/, '');
  else if (!/^\d+$/.test(raw)) return null;
  const amount = Number(raw);
  return Number.isSafeInteger(amount) && amount <= 1_000_000_000_000 ? amount : null;
}

export function parsePayoutDate(value, timezone = '+07:00') {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const local = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  let timestamp;
  if (local) {
    const [, day, month, year, hour = '00', minute = '00', second = '00'] = local;
    const d = Number(day), m = Number(month), h = Number(hour), min = Number(minute), sec = Number(second);
    if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59 || sec > 59) return null;
    const calendarCheck = new Date(Date.UTC(Number(year), m - 1, d));
    if (calendarCheck.getUTCFullYear() !== Number(year) || calendarCheck.getUTCMonth() !== m - 1 || calendarCheck.getUTCDate() !== d) return null;
    const iso = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}${timezone}`;
    timestamp = Date.parse(iso);
    if (!Number.isFinite(timestamp)) return null;
  } else timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
