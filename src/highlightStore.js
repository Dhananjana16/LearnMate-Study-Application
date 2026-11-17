import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (fileId) => `hl_file_${fileId}`;

export async function getHighlights(fileId) {
  const v = await AsyncStorage.getItem(key(fileId));
  return v ? JSON.parse(v) : [];
}

export async function addHighlight(fileId, h) {
  const list = await getHighlights(fileId);
  list.push(h);
  await AsyncStorage.setItem(key(fileId), JSON.stringify(list));
  return list;
}

export async function deleteHighlight(fileId, id) {
  const list = (await getHighlights(fileId)).filter((h) => h.id !== id);
  await AsyncStorage.setItem(key(fileId), JSON.stringify(list));
  return list;
}

export async function deleteHighlights(fileId, ids) {
  const list = (await getHighlights(fileId)).filter((h) => !ids.includes(h.id));
  await AsyncStorage.setItem(key(fileId), JSON.stringify(list));
  return list;
}
