import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (fileId) => `notes_file_${fileId}`;
const oldKey = (fileId) => `note_file_${fileId}`;

export async function getNotes(fileId) {
  const v = await AsyncStorage.getItem(key(fileId));
  const list = v ? JSON.parse(v) : [];
  // Move the single note from the earlier version into the new list.
  const old = await AsyncStorage.getItem(oldKey(fileId));
  if (old !== null) {
    if (old.trim()) {
      list.push({ id: `old_${fileId}`, page: 1, x: 0.92, y: 0.05, text: old, createdAt: Date.now() });
      await AsyncStorage.setItem(key(fileId), JSON.stringify(list));
    }
    await AsyncStorage.removeItem(oldKey(fileId));
  }
  return list;
}

async function saveNotes(fileId, list) {
  await AsyncStorage.setItem(key(fileId), JSON.stringify(list));
}

// Where a new marker goes when the note was not placed by long-press.
export function defaultPosition(list, page) {
  const count = list.filter((n) => n.page === page).length;
  return { x: 0.92, y: Math.min(0.05 + 0.08 * count, 0.9) };
}

export async function upsertNote(fileId, note) {
  const list = await getNotes(fileId);
  const i = list.findIndex((n) => n.id === note.id);
  if (i >= 0) list[i] = note;
  else list.push(note);
  await saveNotes(fileId, list);
}

export async function deleteNote(fileId, noteId) {
  const list = await getNotes(fileId);
  await saveNotes(fileId, list.filter((n) => n.id !== noteId));
}
