import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getModelPaper, deleteModelPaper } from '../paperStore';
import { colors, shadow } from '../theme';

function QuestionCard({ q, n }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[s.card, shadow]}>
      <View style={s.head}>
        <Text style={s.qNum}>Q{n}</Text>
        {!!q.type && <Text style={s.tag}>{q.type}</Text>}
        {q.marks !== null && <Text style={s.marks}>{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</Text>}
      </View>
      <Text style={s.question}>{q.question}</Text>
      <TouchableOpacity style={s.toggle} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <Text style={s.toggleText}>{open ? 'Hide model answer' : 'Show model answer'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.answerBox}>
          {!!q.answer && <Text style={s.answer}>{q.answer}</Text>}
          {q.points.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={s.pointsTitle}>Marking points</Text>
              {q.points.map((p, i) => (
                <Text key={i} style={s.point}>• {p}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function PaperQuestionsScreen({ route, navigation }) {
  const { subject, paperId } = route.params;
  const [set, setSet] = useState(null);

  useFocusEffect(
    useCallback(() => {
      getModelPaper(subject.id, paperId).then(setSet);
    }, [subject.id, paperId])
  );

  const makeNew = () => {
    Alert.alert('Delete this paper?', 'You can make a new model paper from the Past Papers folder.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteModelPaper(subject.id, paperId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!set) return <View style={s.container}><Text style={s.empty}>Loading...</Text></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.title}>{set.title}</Text>
      <Text style={s.sub}>Try each question on paper first, then check the model answer.</Text>
      {set.questions.map((q, i) => (
        <QuestionCard key={i} q={q} n={i + 1} />
      ))}
      <TouchableOpacity style={s.newSet} onPress={makeNew}>
        <Text style={s.newSetText}>Delete this paper</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  empty: { textAlign: 'center', marginTop: 40, color: colors.sub },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  sub: { color: colors.sub, marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  qNum: { fontWeight: '800', color: colors.primary, fontSize: 16, marginRight: 10 },
  tag: { backgroundColor: '#E3EDFF', color: colors.primary, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10, overflow: 'hidden', fontSize: 12, fontWeight: '700', marginRight: 8 },
  marks: { marginLeft: 'auto', color: colors.sub, fontWeight: '700' },
  question: { fontSize: 16, lineHeight: 24, color: colors.text },
  toggle: { marginTop: 14, backgroundColor: colors.bg, paddingVertical: 11, borderRadius: 14, alignItems: 'center' },
  toggleText: { color: colors.primary, fontWeight: '800' },
  answerBox: { marginTop: 12, backgroundColor: '#F1F7F3', borderRadius: 14, padding: 14 },
  answer: { fontSize: 15, lineHeight: 22, color: colors.text },
  pointsTitle: { fontWeight: '800', color: colors.text, marginBottom: 4 },
  point: { fontSize: 14, lineHeight: 21, color: colors.text },
  newSet: { marginTop: 18, alignItems: 'center', padding: 12 },
  newSetText: { color: colors.sub },
});
