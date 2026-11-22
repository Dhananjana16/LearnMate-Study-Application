import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ai_api_key';

export async function getApiKey() {
  return (await AsyncStorage.getItem(KEY)) || '';
}

export async function saveApiKey(key) {
  const trimmed = (key || '').trim();
  if (trimmed) await AsyncStorage.setItem(KEY, trimmed);
  else await AsyncStorage.removeItem(KEY);
}
