import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getSubjects, getFiles, FOLDERS } from '../storage';
import { colors, shadow, subjectTint, subjectIcon } from '../theme';
import { mascots } from '../images';
import { Blobs } from '../Decor';

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
      <Blobs />
      <View style={s.topRow}>
        <View>
          <Text style={s.title}>Library</Text>
          <Text style={s.subtitle}>
            {rows ? `${rows.length} subject${rows.length === 1 ? '' : 's'}` : ' '}
          </Text>
        </View>
      </View>
      <FlatList
        data={rows || []}
        keyExtractor={(r) => r.sub.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.sub, marginTop: 2, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 22, padding: 14, marginBottom: 12 },
  icon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  sub: { color: colors.sub, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyImg: { width: 140, height: 140, borderRadius: 32 },
  emptyText: { color: colors.sub, marginTop: 16, textAlign: 'center' },
});
