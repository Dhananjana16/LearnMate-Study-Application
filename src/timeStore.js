import AsyncStorage from '@react-native-async-storage/async-storage';

const TOTAL_KEY = 'time_total';
const fileKey = (id) => `time_file_${id}`;

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
    })
    .catch(() => {});
  return chain;
}
