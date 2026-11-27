import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from './HomeScreen';
import MotivationScreen from './MotivationScreen';
import CalendarScreen from './CalendarScreen';
import ProfileScreen from './ProfileScreen';
import { colors, shadow } from '../theme';

const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'motivation', label: 'Motivation', icon: 'flame' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'profile', label: 'Profile', icon: 'person' },
];

export default function MainTabs({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('home');

  let content;
  if (tab === 'home') content = <HomeScreen navigation={navigation} onSeeAll={() => navigation.navigate('AllSubjects')} />;
  else if (tab === 'motivation') content = <MotivationScreen />;
  else if (tab === 'calendar') content = <CalendarScreen />;
  else content = <ProfileScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>{content}</View>
      <View style={[s.bar, shadow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={s.item} onPress={() => setTab(t.key)} activeOpacity={0.8}>
              <Ionicons
                name={active ? t.icon : `${t.icon}-outline`}
                size={24}
                color={active ? colors.primary : colors.sub}
              />
              <Text style={[s.label, active && s.labelOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10 },
  item: { flex: 1, alignItems: 'center' },
  label: { fontSize: 11, color: colors.sub, marginTop: 2 },
  labelOn: { color: colors.primary, fontWeight: '700' },
});
