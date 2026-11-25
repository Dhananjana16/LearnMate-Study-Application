import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, Image, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getSubjects, saveSubjects } from '../storage';
import { getDailySeconds } from '../timeStore';
import { getTodos } from '../todoStore';
import { colors, shadow, subjectTint } from '../theme';
import { mascots } from '../images';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning!';
  if (h < 17) return 'Good Afternoon!';
  return 'Good Evening!';
}

function hm(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function HomeScreen({ navigation, onSeeAll }) {
  const { width } = useWindowDimensions();
  const [subjects, setSubjects] = useState([]);
  const [days, setDays] = useState([]);
  const [todoInfo, setTodoInfo] = useState({ left: 0, total: 0 });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  useFocusEffect(
    useCallback(() => {
      getSubjects().then(setSubjects);
      getDailySeconds(7).then(setDays);
      getTodos().then((l) => setTodoInfo({ left: l.filter((x) => !x.done).length, total: l.length }));
    }, [])
  );

  const today = days.length ? days[days.length - 1].seconds : 0;
  const max = Math.max(1, ...days.map((d) => d.seconds));
  const tileW = (width - 32 - 24) / 3;

  const addSubject = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = [...subjects, { id: Date.now().toString(), name: trimmed }];
    setSubjects(updated);
    await saveSubjects(updated);
    setName('');
    setAdding(false);
  };

  const deleteSubject = (subject) => {
    Alert.alert('Delete subject', `Delete "${subject.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = subjects.filter((x) => x.id !== subject.id);
          setSubjects(updated);
          await saveSubjects(updated);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.blobA} />
      <View style={s.blobB} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.topRow}>
          <View style={s.logoRow}>
            <Ionicons name="school" size={26} color={colors.primary} />
            <Text style={s.logo}>Learn Mate</Text>
          </View>
          <TouchableOpacity style={[s.gear, shadow]} onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={s.hero}>
          <View style={s.heroCircle} />
          <Image source={mascots.readingCut} style={s.bunny} resizeMode="contain" />
          <View style={s.heroText}>
            <Text style={s.greeting}>{greeting()}</Text>
            <Text style={s.keepGoing}>Keep going, you're doing great! ✨</Text>
          </View>
        </View>

        <View style={[s.card, shadow]}>
          <View style={s.cardLeft}>
            <View style={s.clock}>
              <Ionicons name="time-outline" size={24} color={colors.text} />
            </View>
            <View>
              <Text style={s.cardLabel}>Study Time Today</Text>
              <Text style={s.cardValue}>{hm(today)}</Text>
            </View>
          </View>
          <View style={s.bars}>
            {days.map((d, i) => (
              <View key={d.key} style={s.barCol}>
                <View
                  style={[
                    s.bar,
                    {
                      height: 8 + (d.seconds / max) * 34,
                      backgroundColor: i === days.length - 1 ? colors.primary : '#BBD3FF',
                    },
                  ]}
                />
                <Text style={s.barLabel}>{d.label.slice(0, 1)}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[s.todoCard, shadow]} onPress={() => navigation.navigate('Todo')} activeOpacity={0.85}>
          <View style={s.todoIcon}>
            <Ionicons name="checkbox-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.todoTitle}>To-do list</Text>
            <Text style={s.todoSub}>
              {todoInfo.total === 0 ? 'Add your first task' : todoInfo.left === 0 ? 'All done 🎉' : `${todoInfo.left} task${todoInfo.left === 1 ? '' : 's'} left`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.sub} />
        </TouchableOpacity>

        <View style={s.sectionRow}>
          <Text style={s.section}>Subjects</Text>
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={s.seeAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        <View style={s.grid}>
          {subjects.map((sub) => {
            const tint = subjectTint(sub);
            return (
              <TouchableOpacity
                key={sub.id}
                style={[s.tile, shadow, { width: tileW, backgroundColor: tint.bg }]}
                onPress={() => navigation.navigate('Subject', { subject: sub })}
                onLongPress={() => deleteSubject(sub)}
                activeOpacity={0.85}
              >
                <Ionicons name="folder" size={40} color={tint.fg} />
                <Text style={s.tileText} numberOfLines={1}>{sub.name}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[s.tile, s.addTile, { width: tileW }]} onPress={() => setAdding(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={34} color={colors.primary} />
            <Text style={[s.tileText, { color: colors.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>
        {subjects.length > 0 && <Text style={s.hint}>Long-press a subject to delete it.</Text>}

      </ScrollView>

      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <View style={s.backdrop}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>New subject</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Mathematics"
              value={name}
              onChangeText={setName}
              autoFocus
              onSubmitEditing={addSubject}
            />
            <View style={s.dialogButtons}>
              <TouchableOpacity style={s.cancel} onPress={() => { setAdding(false); setName(''); }}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.create} onPress={addSubject}>
                <Text style={s.createText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  blobA: { position: 'absolute', top: -60, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: '#FFE3D3', opacity: 0.8 },
  blobB: { position: 'absolute', top: 260, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: '#E5ECFF', opacity: 0.7 },
  content: { padding: 16, paddingBottom: 28 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { fontSize: 20, fontWeight: '800', color: colors.primary, marginLeft: 8 },
  gear: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  hero: { height: 210, marginTop: 6 },
  heroCircle: { position: 'absolute', right: -10, top: 18, width: 190, height: 190, borderRadius: 95, backgroundColor: '#FFD9D9', opacity: 0.85 },
  bunny: { position: 'absolute', right: -16, bottom: 0, width: 215, height: 215 },
  heroText: { position: 'absolute', left: 0, top: 36, width: '58%' },
  greeting: { fontSize: 32, fontWeight: '800', color: colors.text, lineHeight: 38 },
  keepGoing: { color: colors.sub, marginTop: 8, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: '#FFF3D6', borderRadius: 24, padding: 16, marginTop: -26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  clock: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardLabel: { color: colors.sub, fontSize: 13 },
  cardValue: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { alignItems: 'center', marginLeft: 6 },
  bar: { width: 9, borderRadius: 5 },
  barLabel: { fontSize: 9, color: colors.sub, marginTop: 4 },
  todoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 14, marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  todoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3EDFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  todoTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  todoSub: { fontSize: 12, color: colors.sub, marginTop: 2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  section: { fontSize: 22, fontWeight: '800', color: colors.text },
  seeAll: { color: colors.text, fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { height: 104, borderRadius: 22, padding: 12, justifyContent: 'space-between', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  tileText: { fontWeight: '700', fontSize: 13, color: colors.text },
  addTile: { backgroundColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed', borderColor: '#B9C8FF' },
  hint: { textAlign: 'center', color: colors.sub, fontSize: 12, marginTop: 12 },
  bannerWrap: { marginTop: 34, flexDirection: 'row', alignItems: 'flex-end' },
  bear: { width: 130, height: 130, marginRight: -14, marginBottom: -6, zIndex: 2 },
  banner: { flex: 1, backgroundColor: '#FFE9B8', borderRadius: 24, paddingVertical: 20, paddingHorizontal: 20, paddingLeft: 26 },
  bannerText: { fontSize: 17, fontWeight: '800', color: colors.text, lineHeight: 24 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,35,64,0.45)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#fff', borderRadius: 22, padding: 20 },
  dialogTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12 },
  input: { backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 14, height: 48, fontSize: 16, borderWidth: 1, borderColor: colors.line },
  dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancel: { paddingVertical: 12, paddingHorizontal: 18 },
  cancelText: { color: colors.sub, fontWeight: '700' },
  create: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14 },
  createText: { color: '#fff', fontWeight: '800' },
});
