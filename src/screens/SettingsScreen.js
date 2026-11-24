import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getTotalSeconds, formatTime } from '../timeStore';
import VoicePicker from '../VoicePicker';
import { getVoice, saveVoice } from '../ttsStore';
import { getApiKey, saveApiKey } from '../aiKeyStore';
import { colors, shadow } from '../theme';

export default function SettingsScreen() {
  const [total, setTotal] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [voiceId, setVoiceId] = useState(null);
  const [keyInput, setKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState('');

  useEffect(() => {
    getVoice().then(setVoiceId);
    getApiKey().then(setSavedKey);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getTotalSeconds().then(setTotal);
    }, [])
  );

  const saveKey = async () => {
    if (!keyInput.trim()) return;
    await saveApiKey(keyInput);
    setSavedKey(keyInput.trim());
    setKeyInput('');
    Alert.alert('Saved', 'Your AI key is saved on this phone.');
  };
  const removeKey = async () => {
    await saveApiKey('');
    setSavedKey('');
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={[s.profile, shadow]}>
        <View style={s.statIcon}><Ionicons name="time-outline" size={30} color={colors.primary} /></View>
        <View>
          <Text style={s.label}>Total study time</Text>
          <Text style={s.value}>{formatTime(total)}</Text>
        </View>
      </View>

      <TouchableOpacity style={[s.row, shadow]} onPress={() => setPickerOpen(true)} activeOpacity={0.85}>
        <View style={[s.rowIcon, { backgroundColor: '#E9E4FB' }]}>
          <Ionicons name="volume-high" size={22} color="#6B52D6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>Reading voice</Text>
          <Text style={s.rowSub} numberOfLines={1}>{voiceId ? voiceId : 'Phone default'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.sub} />
      </TouchableOpacity>

      <View style={[s.keyCard, shadow]}>
        <View style={s.keyHead}>
          <View style={[s.rowIcon, { backgroundColor: '#FFF1C7' }]}>
            <Ionicons name="key" size={22} color="#C48A00" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>AI key</Text>
            <Text style={s.rowSub}>
              {savedKey ? `Saved (ends with ${savedKey.slice(-4)})` : 'A free Google Gemini key works. Stored only on this phone.'}
            </Text>
          </View>
        </View>
        <TextInput
          style={s.keyInput}
          placeholder="Paste your key here"
          value={keyInput}
          onChangeText={setKeyInput}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={s.keyButtons}>
          <TouchableOpacity style={s.keySave} onPress={saveKey}><Text style={s.keySaveText}>Save key</Text></TouchableOpacity>
          {!!savedKey && (
            <TouchableOpacity style={s.keyRemove} onPress={removeKey}><Text style={s.keyRemoveText}>Remove</Text></TouchableOpacity>
          )}
        </View>
      </View>

      <VoicePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={voiceId}
        onPick={(id) => {
          setVoiceId(id);
          saveVoice(id);
        }}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 16 },
  profile: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 14 },
  statIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E3EDFF', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  label: { color: colors.sub, fontSize: 13 },
  value: { fontSize: 30, fontWeight: '800', color: colors.primary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 14 },
  rowIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowSub: { color: colors.sub, marginTop: 2, fontSize: 12 },
  keyCard: { backgroundColor: colors.card, borderRadius: 18, padding: 14 },
  keyHead: { flexDirection: 'row', alignItems: 'center' },
  keyInput: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, marginTop: 12, fontSize: 15 },
  keyButtons: { flexDirection: 'row', marginTop: 12 },
  keySave: { backgroundColor: colors.primary, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12, marginRight: 10 },
  keySaveText: { color: '#fff', fontWeight: '800' },
  keyRemove: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: colors.danger },
  keyRemoveText: { color: colors.danger, fontWeight: '800' },
});
