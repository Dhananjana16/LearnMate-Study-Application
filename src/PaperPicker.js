import React, { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from './theme';

const MAX_PAPERS = 3;
const MAX_NOTES = 8;

function Section({ title, hint, files, picked, onToggle }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={s.section}>{title}</Text>
      <Text style={s.hint}>{hint}</Text>
      {files.map((f) => {
        const on = picked.includes(f.id);
        return (
          <TouchableOpacity key={f.id} style={[s.row, shadow, on && s.rowOn]} onPress={() => onToggle(f.id)} activeOpacity={0.85}>
            <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.primary : colors.sub} />
            <Text style={s.name} numberOfLines={2}>{f.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Choose which past papers (for the style) and which notes (for the content) to use.
export default function PaperPicker({ visible, papers, notes, onClose, onConfirm }) {
  const [pickedPapers, setPickedPapers] = useState([]);
  const [pickedNotes, setPickedNotes] = useState([]);

  useEffect(() => {
    if (visible) {
      setPickedPapers(papers.slice(0, MAX_PAPERS).map((f) => f.id));
      setPickedNotes(notes.slice(0, MAX_NOTES).map((f) => f.id));
    }
  }, [visible]);

  const toggle = (list, setList, max) => (id) => {
    if (list.includes(id)) setList(list.filter((x) => x !== id));
    else if (list.length < max) setList([...list, id]);
  };

  const ready = pickedPapers.length > 0 && pickedNotes.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <Text style={s.title}>Make a model paper</Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
          <Section
            title="Past papers (the style)"
            hint={`Pick up to ${MAX_PAPERS}. The questions will copy their style and marks.`}
            files={papers}
            picked={pickedPapers}
            onToggle={toggle(pickedPapers, setPickedPapers, MAX_PAPERS)}
          />
          <Section
            title="Notes (the content)"
            hint={`Pick up to ${MAX_NOTES} of this subject's notes. The questions will be about them.`}
            files={notes}
            picked={pickedNotes}
            onToggle={toggle(pickedNotes, setPickedNotes, MAX_NOTES)}
          />
        </ScrollView>
        <TouchableOpacity
          style={[s.go, !ready && { opacity: 0.4 }]}
          disabled={!ready}
          onPress={() => onConfirm({
            papers: papers.filter((f) => pickedPapers.includes(f.id)),
            notes: notes.filter((f) => pickedNotes.includes(f.id)),
          })}
        >
          <Text style={s.goText}>Make model paper</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancel} onPress={onClose}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12 },
  section: { fontSize: 17, fontWeight: '800', color: colors.text },
  hint: { color: colors.sub, marginTop: 2, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  rowOn: { borderColor: colors.primary },
  name: { flex: 1, marginLeft: 12, fontSize: 15, color: colors.text },
  go: { backgroundColor: colors.primary, padding: 15, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  goText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancel: { padding: 14, alignItems: 'center' },
  cancelText: { color: colors.sub, fontWeight: '700' },
});
