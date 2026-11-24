import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { FOLDERS, getFiles } from '../storage';
import { colors, shadow, tints, subjectTint, subjectIcon } from '../theme';

const FOLDER_STYLE = {
  Notes: { icon: 'document-text', tint: tints[0] },
  'Past Papers': { icon: 'documents', tint: tints[1] },
  'Revision Notes': { icon: 'repeat', tint: tints[2] },
  'Quick Notes': { icon: 'flash', tint: tints[3] },
};

export default function SubjectScreen({ route, navigation }) {
  const { subject } = route.params;
  const tint = subjectTint(subject);
  const [counts, setCounts] = useState({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const c = {};
        for (const f of FOLDERS) c[f] = (await getFiles(subject.id, f)).length;
        setCounts(c);
      })();
    }, [subject.id])
  );

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
      <View style={[s.banner, { backgroundColor: tint.bg }]}>
        <View style={s.circleA} />
        <View style={s.circleB} />
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>Subject</Text>
          <Text style={[s.name, { color: tint.fg }]} numberOfLines={2}>{subject.name}</Text>
          <Text style={s.count}>{total} {total === 1 ? 'file' : 'files'}</Text>
        </View>
        <Ionicons name={subjectIcon(subject.name)} size={76} color={tint.fg} />
      </View>

      <Text style={s.heading}>Folders</Text>
      {FOLDERS.map((folder) => {
        const st = FOLDER_STYLE[folder];
        const n = counts[folder] || 0;
        return (
          <TouchableOpacity
            key={folder}
            style={[s.row, shadow]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Folder', { subject, folder })}
          >
            <View style={[s.folderIcon, { backgroundColor: st.tint.bg }]}>
              <Ionicons name={st.icon} size={26} color={st.tint.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.folderName}>{folder}</Text>
              <Text style={s.folderSub}>{n} {n === 1 ? 'file' : 'files'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.sub} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  banner: { borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', minHeight: 150 },
  circleA: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.45)', right: -30, top: -40 },
  circleB: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.35)', right: 60, bottom: -40 },
  kicker: { color: colors.sub, fontSize: 13 },
  name: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  count: { color: colors.sub, marginTop: 6 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 24, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 12 },
  folderIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  folderName: { fontSize: 17, fontWeight: '700', color: colors.text },
  folderSub: { color: colors.sub, marginTop: 2 },
});
