import AsyncStorage from '@react-native-async-storage/async-storage';

const TOTAL_KEY = 'time_total';
const fileKey = (id) => `time_file_${id}`;

// Local date as YYYY-MM-DD (not UTC, so "today" matches the phone's clock).
export function dayKey(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
const dayStore = (key) => `time_day_${key}`;

// Seconds studied on each of the last `days` days, oldest first.
export async function getDailySeconds(days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    out.push({ key, label: d.toLocaleDateString('en', { weekday: 'short' }), seconds: Number(await AsyncStorage.getItem(dayStore(key))) || 0 });
  }
  return out;
}

export function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export async function getTotalSeconds() {
  return Number(await AsyncStorage.getItem(TOTAL_KEY)) || 0;
}

export async function getFileSeconds(fileId) {
  return Number(await AsyncStorage.getItem(fileKey(fileId))) || 0;
}

// Saves are queued one after another so two saves never overwrite each other.
let chain = Promise.resolve();
export function addSeconds(fileId, seconds) {
  if (seconds < 1) return chain;
  chain = chain
    .then(async () => {
      const f = await getFileSeconds(fileId);
      const t = await getTotalSeconds();
      await AsyncStorage.setItem(fileKey(fileId), String(f + seconds));
      await AsyncStorage.setItem(TOTAL_KEY, String(t + seconds));
      const today = dayStore(dayKey());
      const dsec = Number(await AsyncStorage.getItem(today)) || 0;
      await AsyncStorage.setItem(today, String(dsec + seconds));
    })
    .catch(() => {});
  return chain;
}
