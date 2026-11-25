import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'todos';

export async function getTodos() {
  const v = await AsyncStorage.getItem(KEY);
  return v ? JSON.parse(v) : [];
}

export async function saveTodos(list) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

// "6:30 PM", "6pm", "18:30" -> minutes since midnight.
// Empty text -> null (no time). Text that is not a time -> undefined.
export function parseTime(text) {
  const t = (text || '').trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return undefined;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3] ? m[3].toLowerCase() : null;
  if (min > 59) return undefined;
  if (ap) {
    if (h < 1 || h > 12) return undefined;
    if (ap === 'pm' && h !== 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
  } else if (h > 23) {
    return undefined;
  }
  return h * 60 + min;
}

// minutes since midnight -> "6:30 PM"
export function formatMinutes(mins) {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

// timestamp -> "7:45 PM"
export function formatStamp(ts) {
  const d = new Date(ts);
  return formatMinutes(d.getHours() * 60 + d.getMinutes());
}

// timestamp -> "Today" / "Yesterday" / "12 Nov"
export function dayLabel(ts) {
  const d = new Date(ts);
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
