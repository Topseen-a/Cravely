const TZ = 'Africa/Lagos';

const nairaWhole = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
const nairaKobo = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });

// The API sends Naira as numbers (e.g. 3500 or 787.5).
export function naira(amount) {
  const n = Number(amount) || 0;
  return Number.isInteger(n) ? nairaWhole.format(n) : nairaKobo.format(n);
}

export function lagosTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });
}

export function lagosDateTime(date) {
  return new Date(date).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ,
  });
}

export function lagosToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
}

// "22:00" -> "10:00 PM"
export function clock(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// "+2348031234567" -> "0803 123 4567"
export function prettyPhone(p) {
  if (!p?.startsWith('+234') || p.length !== 14) return p || '';
  const local = '0' + p.slice(4);
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

export function minutesAgo(date, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - new Date(date).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
}

export function apiError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err?.response) return 'Network wahala — check your connection and try again.';
  return err.response.data?.error || fallback;
}

export function greeting() {
  const h = Number(new Date().toLocaleString('en-NG', { hour: 'numeric', hour12: false, timeZone: TZ }));
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
