import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './src/screens/MainTabs';
import SubjectScreen from './src/screens/SubjectScreen';
import FolderScreen from './src/screens/FolderScreen';
import ViewerScreen from './src/screens/ViewerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotesScreen from './src/screens/NotesScreen';
import NoteEditorScreen from './src/screens/NoteEditorScreen';
import StudyScreen from './src/screens/StudyScreen';
import PaperQuestionsScreen from './src/screens/PaperQuestionsScreen';
import TodoScreen from './src/screens/TodoScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Subject" component={SubjectScreen} options={({ route }) => ({ title: route.params.subject.name })} />
        <Stack.Screen name="Folder" component={FolderScreen} options={({ route }) => ({ title: route.params.folder })} />
        <Stack.Screen name="Viewer" component={ViewerScreen} options={({ route }) => ({ title: route.params.file.name })} />
        <Stack.Screen name="Notes" component={NotesScreen} options={{ title: 'Notes' }} />
        <Stack.Screen name="NoteEditor" component={NoteEditorScreen} options={{ title: 'Note' }} />
        <Stack.Screen name="Study" component={StudyScreen} options={{ title: 'Study' }} />
        <Stack.Screen name="PaperQuestions" component={PaperQuestionsScreen} options={{ title: 'Model paper' }} />
        <Stack.Screen name="Todo" component={TodoScreen} options={{ title: 'To-do list' }} />
        <Stack.Screen name="AllSubjects" component={SubjectsScreen} options={{ title: 'Subjects' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
