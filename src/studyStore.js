import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (fileId) => `study_file_${fileId}`;

export async function getStudySet(fileId) {
  const v = await AsyncStorage.getItem(key(fileId));
  return v ? JSON.parse(v) : null;
}

export async function saveStudySet(fileId, set) {
  await AsyncStorage.setItem(key(fileId), JSON.stringify(set));
}

export async function deleteStudySet(fileId) {
  await AsyncStorage.removeItem(key(fileId));
}
