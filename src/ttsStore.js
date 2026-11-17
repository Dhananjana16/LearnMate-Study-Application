import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tts_voice';

export async function getVoice() {
  return (await AsyncStorage.getItem(KEY)) || null;
}

export async function saveVoice(id) {
  if (id) await AsyncStorage.setItem(KEY, id);
  else await AsyncStorage.removeItem(KEY);
}
