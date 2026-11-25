import AsyncStorage from '@react-native-async-storage/async-storage';

// Model papers made for a subject. Each: { id, title, createdAt, questions }
const key = (subjectId) => `models_${subjectId}`;

export async function getModelPapers(subjectId) {
  const v = await AsyncStorage.getItem(key(subjectId));
  return v ? JSON.parse(v) : [];
}

export async function getModelPaper(subjectId, id) {
  const list = await getModelPapers(subjectId);
  return list.find((p) => p.id === id) || null;
}

export async function addModelPaper(subjectId, questions) {
  const list = await getModelPapers(subjectId);
  const paper = {
    id: `${Date.now()}_${list.length}`,
    title: `Model paper ${list.length + 1}`,
    createdAt: Date.now(),
    questions,
  };
  list.push(paper);
  await AsyncStorage.setItem(key(subjectId), JSON.stringify(list));
  return paper;
}

export async function deleteModelPaper(subjectId, id) {
  const list = (await getModelPapers(subjectId)).filter((p) => p.id !== id);
  await AsyncStorage.setItem(key(subjectId), JSON.stringify(list));
  return list;
}
