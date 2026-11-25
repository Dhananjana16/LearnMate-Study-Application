import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';

const SUBJECTS_KEY = 'subjects';
const filesKey = (subjectId, folder) => `files_${subjectId}_${folder}`;
export const FOLDERS = ['Notes', 'Past Papers', 'Quick Notes'];

export async function getSubjects() {
  const v = await AsyncStorage.getItem(SUBJECTS_KEY);
  return v ? JSON.parse(v) : [];
}
export async function saveSubjects(list) {
  await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(list));
}

export async function getFiles(subjectId, folder) {
  const v = await AsyncStorage.getItem(filesKey(subjectId, folder));
  return v ? JSON.parse(v) : [];
}
export async function saveFiles(subjectId, folder, list) {
  await AsyncStorage.setItem(filesKey(subjectId, folder), JSON.stringify(list));
}

// Copies a picked file into the app's own storage and returns the saved record.
export async function storeFile(subjectId, folder, picked) {
  const dir = new Directory(Paths.document, subjectId, folder.replace(/\s/g, '_'));
  dir.create({ intermediates: true, idempotent: true });
  const id = Date.now().toString();
  const safeName = picked.name.replace(/[^\w.\-]/g, '_');
  const dest = new File(dir, `${id}_${safeName}`);
  await new File(picked.uri).copy(dest);
  return { id, name: picked.name, uri: dest.uri, mimeType: picked.mimeType || '' };
}

export async function removeFile(file) {
  try {
    const f = new File(file.uri);
    if (f.exists) f.delete();
  } catch (e) {
    // file already gone, nothing to do
  }
}
