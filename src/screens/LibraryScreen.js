import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getSubjects, getFiles, FOLDERS } from '../storage';
import { colors, shadow, subjectTint, subjectIcon } from '../theme';
import { mascots } from '../images';

export default function LibraryScreen({ navigation }) {
  const [rows, setRows] = useState(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const subjects = await getSubjects();
        const out = [];
        for (const sub of subjects) {
          let total = 0;
          for (const f of FOLDERS) total += (await getFiles(sub.id, f)).length;
          out.push({ sub, total });
        }
        setRows(out);
      })();
    }, [])
  );

  return (
    <View style={s.container}>
      <Text style={s.title}>Library</Text>
      <FlatList
        data={rows || []}
        keyExtractor={(r) => r.sub.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={
          rows ? (
            <View style={s.empty}>
              <Image source={mascots.bear} style={s.emptyImg} />
              <Text style={s.emptyText}>No subjects yet. Add one on the Home tab.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const tint = subjectTint(item.sub);
          return (
            <TouchableOpacity
              style={[s.row, shadow]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Subject', { subject: item.sub })}
            >
              <View style={[s.icon, { backgroundColor: tint.bg }]}>
                <Ionicons name={subjectIcon(item.sub.name)} size={26} color={tint.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{item.sub.name}</Text>
                <Text style={s.sub}>{item.total} {item.total === 1 ? 'file' : 'files'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.sub} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 12 },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  sub: { color: colors.sub, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyImg: { width: 140, height: 140, borderRadius: 32 },
  emptyText: { color: colors.sub, marginTop: 16, textAlign: 'center' },
});
