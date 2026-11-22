import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getStudySet, deleteStudySet } from '../studyStore';

function Flashcards({ cards }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!cards.length) return <Text style={s.empty}>No flashcards in this set.</Text>;
  const card = cards[i];
  const go = (d) => {
    setI((i + d + cards.length) % cards.length);
    setFlipped(false);
  };
  return (
    <View>
      <Text style={s.counter}>Card {i + 1} of {cards.length}</Text>
      <TouchableOpacity style={[s.card, flipped && s.cardBack]} activeOpacity={0.9} onPress={() => setFlipped(!flipped)}>
        <Text style={s.cardLabel}>{flipped ? 'ANSWER' : 'QUESTION'}</Text>
        <Text style={s.cardText}>{flipped ? card.a : card.q}</Text>
        <Text style={s.tapHint}>Tap to flip</Text>
      </TouchableOpacity>
      <View style={s.navRow}>
        <TouchableOpacity style={s.navButton} onPress={() => go(-1)}><Text style={s.navText}>◀ Back</Text></TouchableOpacity>
        <TouchableOpacity style={s.navButton} onPress={() => go(1)}><Text style={s.navText}>Next ▶</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function Quiz({ questions }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  if (!questions.length) return <Text style={s.empty}>No multiple-choice questions in this set.</Text>;

  const restart = () => {
    setI(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    return (
      <View style={s.resultBox}>
        <Text style={s.resultTitle}>Quiz finished</Text>
        <Text style={s.resultScore}>{score} / {questions.length}</Text>
        <TouchableOpacity style={s.primary} onPress={restart}><Text style={s.primaryText}>Try again</Text></TouchableOpacity>
      </View>
    );
  }

  const q = questions[i];
  const choose = (n) => {
    if (picked !== null) return;
    setPicked(n);
    if (n === q.answer) setScore(score + 1);
  };
  const next = () => {
    if (i + 1 >= questions.length) setDone(true);
    else {
      setI(i + 1);
      setPicked(null);
    }
  };

  return (
    <View>
      <Text style={s.counter}>Question {i + 1} of {questions.length}</Text>
      <Text style={s.question}>{q.question}</Text>
      {q.options.map((opt, n) => {
        let style = s.option;
        if (picked !== null) {
          if (n === q.answer) style = [s.option, s.optionRight];
          else if (n === picked) style = [s.option, s.optionWrong];
        }
        return (
          <TouchableOpacity key={n} style={style} onPress={() => choose(n)} activeOpacity={0.8}>
            <Text style={s.optionText}>{String.fromCharCode(65 + n)}. {opt}</Text>
          </TouchableOpacity>
        );
      })}
      {picked !== null && (
        <View>
          <Text style={s.explain}>
            {picked === q.answer ? '✅ Correct. ' : '❌ Not quite. '}
            {q.explanation}
          </Text>
          <TouchableOpacity style={s.primary} onPress={next}>
            <Text style={s.primaryText}>{i + 1 >= questions.length ? 'See score' : 'Next question'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function StudyScreen({ route, navigation }) {
  const { file } = route.params;
  const [set, setSet] = useState(null);
  const [tab, setTab] = useState('cards');

  useFocusEffect(
    useCallback(() => {
      getStudySet(file.id).then(setSet);
    }, [file.id])
  );

  const makeNew = () => {
    Alert.alert('Make a new set?', 'This deletes the current questions. Then tap 🧠 on the file again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteStudySet(file.id);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!set) return <View style={s.container}><Text style={s.empty}>Loading...</Text></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'cards' && s.tabOn]} onPress={() => setTab('cards')}>
          <Text style={[s.tabText, tab === 'cards' && s.tabTextOn]}>Flashcards ({set.flashcards.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'mcq' && s.tabOn]} onPress={() => setTab('mcq')}>
          <Text style={[s.tabText, tab === 'mcq' && s.tabTextOn]}>MCQ ({set.mcq.length})</Text>
        </TouchableOpacity>
      </View>
      {tab === 'cards' ? <Flashcards cards={set.flashcards} /> : <Quiz questions={set.mcq} />}
      <TouchableOpacity style={s.newSet} onPress={makeNew}>
        <Text style={s.newSetText}>🔄 Make a new set</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
  tabs: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 8, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  tabOn: { backgroundColor: '#4f46e5' },
  tabText: { fontWeight: 'bold', color: '#374151' },
  tabTextOn: { color: '#fff' },
  counter: { color: '#666', marginBottom: 10, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, minHeight: 240, justifyContent: 'center', elevation: 3 },
  cardBack: { backgroundColor: '#eef2ff' },
  cardLabel: { color: '#4f46e5', fontWeight: 'bold', marginBottom: 12, fontSize: 12 },
  cardText: { fontSize: 20, lineHeight: 28 },
  tapHint: { color: '#9ca3af', marginTop: 16, fontSize: 12 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  navButton: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  navText: { fontWeight: 'bold', color: '#374151' },
  question: { fontSize: 18, fontWeight: 'bold', marginBottom: 14, lineHeight: 26 },
  option: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  optionRight: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  optionWrong: { backgroundColor: '#fee2e2', borderColor: '#dc2626' },
  optionText: { fontSize: 16 },
  explain: { marginVertical: 10, fontSize: 15, lineHeight: 22 },
  primary: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  primaryText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultBox: { alignItems: 'center', paddingVertical: 30 },
  resultTitle: { fontSize: 20, fontWeight: 'bold' },
  resultScore: { fontSize: 48, fontWeight: 'bold', color: '#4f46e5', marginVertical: 16 },
  newSet: { marginTop: 28, alignItems: 'center', padding: 12 },
  newSetText: { color: '#6b7280' },
});
