import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'calendar_events_v2';
const OLD_KEY = 'calendar_events';

export const COLORS = [
  '#7B2D6B', '#F28B96', '#6DB36B', '#8B6B5C', '#B5B020', '#2EC27E',
  '#C2B280', '#1B5E20', '#4A5A2B', '#3B6EDC', '#E67E22', '#E74C3C',
];

// Each event belongs to one view: 'week' (timetable) or 'month'.
function normalize(e) {
  return { ...e, view: e.view || (e.repeat ? 'week' : 'month') };
}

export async function getEvents() {
  const v = await AsyncStorage.getItem(KEY);
  if (v) return JSON.parse(v).map(normalize);
  // Bring over events saved by the first version of the calendar
  const old = await AsyncStorage.getItem(OLD_KEY);
  if (old) {
    const list = JSON.parse(old).map((e) => {
      const start = e.time != null ? e.time : 9 * 60;
      return {
        id: e.id, title: e.title, place: '', date: e.date, repeat: false, days: [], view: 'month',
        start, end: Math.min(start + 60, 1439), color: COLORS[9],
      };
    });
    await saveEvents(list);
    return list;
  }
  return [];
}

export async function saveEvents(list) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

const pad = (n) => String(n).padStart(2, '0');

// Date -> "2026-11-25"
export function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function shiftKey(key, n) {
  return dateKey(addDays(parseKey(key), n));
}

export function mondayOf(d) {
  const diff = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(d, -diff);
}

// Events of one view ('week' or 'month') that happen on a given date.
export function eventsOn(events, date, view) {
  const key = dateKey(date);
  const wd = date.getDay();
  return events
    .filter((e) => e.view === view && (e.repeat ? e.days.includes(wd) : e.date === key))
    .sort((a, b) => (a.start == null ? -1 : a.start) - (b.start == null ? -1 : b.start));
}

// White or dark text, depending on how light the colour is
export function textColorFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? '#222222' : '#FFFFFF';
}
