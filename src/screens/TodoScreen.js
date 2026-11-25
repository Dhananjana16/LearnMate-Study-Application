import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getTodos, saveTodos, parseTime, formatMinutes, formatStamp, dayLabel,
} from '../todoStore';
import { colors, shadow } from '../theme';

export default function TodoScreen() {
  const [todos, setTodos] = useState([]);
  const [view, setView] = useState('todo'); // 'todo' or 'log'
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');

  useFocusEffect(
    useCallback(() => {
      getTodos().then(setTodos);
    }, [])
  );

  const update = async (list) => {
    setTodos(list);
    await saveTodos(list);
  };

  const addTask = async () => {
    const t = title.trim();
    if (!t) return;
    const mins = parseTime(time);
    if (mins === undefined) {
      Alert.alert('Time not understood', 'Type a time like 6:30 PM or 18:30, or leave it empty.');
      return;
    }
    const task = { id: Date.now().toString(), title: t, time: mins, done: false, createdAt: Date.now(), doneAt: null };
    await update([...todos, task]);
    setTitle('');
    setTime('');
    Keyboard.dismiss();
  };

  const toggle = async (task) => {
    const list = todos.map((x) =>
      x.id === task.id ? { ...x, done: !x.done, doneAt: !x.done ? Date.now() : null } : x
    );
    await update(list);
  };

  const remove = (task) => {
    Alert.alert('Delete task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => update(todos.filter((x) => x.id !== task.id)) },
    ]);
  };

  const pending = todos
    .filter((x) => !x.done)
    .sort((a, b) => {
      if (a.time !== null && b.time !== null) return a.time - b.time;
      if (a.time !== null) return -1;
      if (b.time !== null) return 1;
      return a.createdAt - b.createdAt;
    });
  const done = todos.filter((x) => x.done).sort((a, b) => b.doneAt - a.doneAt);
  const data = view === 'todo' ? pending : done;

  const renderItem = ({ item, index }) => {
    const showDay = view === 'log' && (index === 0 || dayLabel(done[index - 1].doneAt) !== dayLabel(item.doneAt));
    return (
      <View>
        {showDay && <Text style={s.day}>{dayLabel(item.doneAt)}</Text>}
        <View style={[s.row, shadow]}>
          <TouchableOpacity onPress={() => toggle(item)} hitSlop={10}>
            <Ionicons
              name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={28}
              color={item.done ? colors.success : colors.primary}
            />
          </TouchableOpacity>
          <View style={s.rowText}>
            <Text style={[s.taskTitle, item.done && s.taskDone]}>{item.title}</Text>
            {view === 'todo' && item.time !== null && (
              <Text style={s.meta}>⏰ {formatMinutes(item.time)}</Text>
            )}
            {view === 'log' && (
              <Text style={s.meta}>
                Done at {formatStamp(item.doneAt)}
                {item.time !== null ? `  ·  planned ${formatMinutes(item.time)}` : ''}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => remove(item)} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={colors.sub} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, view === 'todo' && s.tabOn]} onPress={() => setView('todo')}>
          <Text style={[s.tabText, view === 'todo' && s.tabTextOn]}>To do ({pending.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, view === 'log' && s.tabOn]} onPress={() => setView('log')}>
          <Text style={[s.tabText, view === 'log' && s.tabTextOn]}>Log ({done.length})</Text>
        </TouchableOpacity>
      </View>

      {view === 'todo' && (
        <View style={[s.addBox, shadow]}>
          <TextInput
            style={s.input}
            placeholder="New task, e.g. Finish Maths past paper"
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={addTask}
            returnKeyType="done"
          />
          <View style={s.addRow}>
            <TextInput
              style={[s.input, s.timeInput]}
              placeholder="Time (optional) 6:30 PM"
              value={time}
              onChangeText={setTime}
              onSubmitEditing={addTask}
              returnKeyType="done"
            />
            <TouchableOpacity style={s.addBtn} onPress={addTask} activeOpacity={0.85}>
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={s.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={data}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={s.empty}>
            {view === 'todo' ? 'No tasks yet. Add your first one above.' : 'Finished tasks will show up here.'}
          </Text>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabOn: { backgroundColor: colors.primary },
  tabText: { fontWeight: '700', color: colors.sub },
  tabTextOn: { color: '#fff' },
  addBox: { backgroundColor: '#fff', borderRadius: 20, padding: 12, marginBottom: 16 },
  input: { backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 14, height: 46, fontSize: 15, borderWidth: 1, borderColor: colors.line },
  addRow: { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
  timeInput: { flex: 1, marginRight: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, height: 46, paddingHorizontal: 16 },
  addBtnText: { color: '#fff', fontWeight: '800', marginLeft: 2 },
  day: { fontSize: 14, fontWeight: '800', color: colors.sub, marginTop: 6, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10 },
  rowText: { flex: 1, marginHorizontal: 12 },
  taskTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  taskDone: { textDecorationLine: 'line-through', color: colors.sub },
  meta: { fontSize: 12, color: colors.sub, marginTop: 3 },
  empty: { textAlign: 'center', color: colors.sub, marginTop: 40 },
});
