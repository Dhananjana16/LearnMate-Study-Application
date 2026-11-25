import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, Switch, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  COLORS, getEvents, saveEvents, dateKey, parseKey, addDays, shiftKey, mondayOf, eventsOn, textColorFor,
} from '../calendarStore';
import { formatMinutes } from '../todoStore';
import { colors, shadow } from '../theme';
import { Blobs } from '../Decor';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const HOUR_H = 54;
const TIME_W = 40;
const HEAD_H = 58;
const SOFT = '#F1F4FF';
const NAVY = '#2C4A6B';
const MON_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (n) => String(n).padStart(2, '0');

// Put events that overlap side by side
function layoutDay(list) {
  const sorted = [...list].sort((a, b) => a.start - b.start || a.end - b.end);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    if (!cluster.length) return;
    const lanes = [];
    const placed = cluster.map((ev) => {
      let l = lanes.findIndex((end) => end <= ev.start);
      if (l === -1) { lanes.push(ev.end); l = lanes.length - 1; } else lanes[l] = ev.end;
      return { ev, lane: l };
    });
    placed.forEach((p) => out.push({ ev: p.ev, lane: p.lane, lanes: lanes.length }));
    cluster = [];
  };
  sorted.forEach((ev) => {
    if (cluster.length && ev.start >= clusterEnd) { flush(); clusterEnd = -1; }
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.end);
  });
  flush();
  return out;
}

function TimePicker({ label, value, onChange }) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  const hours = [];
  for (let i = 5; i <= 23; i++) hours.push(i);
  const minutes = [];
  for (let i = 0; i < 60; i += 5) minutes.push(i);
  return (
    <View style={s.timeBox}>
      <View style={s.timeHead}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.timeValue}>{formatMinutes(value)}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        {hours.map((hh) => (
          <TouchableOpacity key={hh} style={[s.chip, hh === h && s.chipOn]} onPress={() => onChange(hh * 60 + m)}>
            <Text style={[s.chipText, hh === h && s.chipTextOn]}>{formatMinutes(hh * 60).replace(':00 ', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
        {minutes.map((mm) => (
          <TouchableOpacity key={mm} style={[s.chip, mm === m && s.chipOn]} onPress={() => onChange(h * 60 + mm)}>
            <Text style={[s.chipText, mm === m && s.chipTextOn]}>:{pad(mm)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const now = new Date();
  const todayKey = dateKey(now);
  const [mode, setMode] = useState('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(todayKey);
  const [weekOffset, setWeekOffset] = useState(0);
  const [fit, setFit] = useState(true);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(null);

  useFocusEffect(
    useCallback(() => {
      getEvents().then(setEvents);
    }, [])
  );

  const persist = async (list) => {
    setEvents(list);
    await saveEvents(list);
  };

  /* ---------- week dates (needed by the form too) ---------- */
  const monday = addDays(mondayOf(now), weekOffset * 7);
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i));

  /* ---------- add / edit form ---------- */
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const openNew = () => {
    if (mode === 'month') {
      setForm({
        id: null, view: 'month', title: '', place: '', date: selected, repeat: false, days: [],
        hasTime: false, start: 9 * 60, end: 10 * 60, color: COLORS[9],
      });
    } else {
      const selInWeek = weekDays.some((d) => dateKey(d) === selected);
      const todayInWeek = weekDays.some((d) => dateKey(d) === todayKey);
      const startDate = selInWeek ? selected : todayInWeek ? todayKey : dateKey(monday);
      setForm({
        id: null, view: 'week', title: '', place: '', date: startDate, repeat: true, days: [parseKey(startDate).getDay()],
        hasTime: true, start: 8 * 60, end: 8 * 60 + 55, color: COLORS[0],
      });
    }
  };

  const openEdit = (ev) => {
    setForm({
      ...ev, place: ev.place || '', hasTime: ev.start != null,
      start: ev.start != null ? ev.start : 9 * 60, end: ev.end != null ? ev.end : 10 * 60,
      date: ev.date || todayKey,
    });
  };

  const changeStart = (v) => {
    setForm((f) => ({ ...f, start: v, end: f.end <= v ? Math.min(v + 60, 1439) : f.end }));
  };

  const toggleDay = (d) => {
    setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));
  };

  const saveForm = async () => {
    const title = form.title.trim();
    if (!title) { Alert.alert('Title needed', 'Please type a name for the event.'); return; }
    if (form.hasTime && form.end <= form.start) { Alert.alert('Check the time', 'The end time must be after the start time.'); return; }
    if (form.repeat && form.days.length === 0) { Alert.alert('Choose days', 'Tap at least one day for the weekly event.'); return; }
    const item = {
      id: form.id || Date.now().toString(),
      view: form.view, title, place: form.place.trim(),
      start: form.hasTime ? form.start : null, end: form.hasTime ? form.end : null,
      color: form.color, repeat: form.repeat, days: form.repeat ? form.days : [], date: form.repeat ? null : form.date,
    };
    const list = form.id ? events.map((e) => (e.id === form.id ? item : e)) : [...events, item];
    await persist(list);
    setForm(null);
  };

  const deleteForm = () => {
    Alert.alert('Delete event', form.repeat ? 'This removes it from every week. Delete?' : 'Delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await persist(events.filter((e) => e.id !== form.id)); setForm(null); },
      },
    ]);
  };

  /* ---------- month view ---------- */
  const goMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const openWeek = () => {
    const diff = mondayOf(parseKey(selected)).getTime() - mondayOf(new Date()).getTime();
    setWeekOffset(Math.round(diff / (7 * 86400000)));
    setMode('week');
  };

  const goToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(dateKey(d));
    setWeekOffset(0);
  };

  const monthCell = (width - 32 - 32) / 7;
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) cells.push(new Date(year, month, 1 - lead + i));

  const selectedDate = parseKey(selected);
  const dayEvents = eventsOn(events, selectedDate, 'month');

  const pickDate = (date) => {
    setSelected(dateKey(date));
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      setMonth(date.getMonth());
      setYear(date.getFullYear());
    }
  };

  const renderMonth = () => (
    <>
      <View style={[s.sheet2, shadow]}>
        <View style={s.pillNav}>
          <TouchableOpacity style={s.pillBtn} onPress={() => goMonth(-1)} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={NAVY} />
          </TouchableOpacity>
          <View style={s.pillCenter}>
            <Text style={s.pillText}>{MONTHS[month]} {year}</Text>
          </View>
          <TouchableOpacity style={s.pillBtn} onPress={() => goMonth(1)} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={NAVY} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 18 }}>
          {MON_NAMES.map((w) => (
            <Text key={w} style={s.weekday2}>{w}</Text>
          ))}
        </View>

        <View style={{ marginTop: 4 }}>
          {Array.from({ length: cells.length / 7 }, (_, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {cells.slice(r * 7, r * 7 + 7).map((date, i) => {
                const k = dateKey(date);
                const inMonth = date.getMonth() === month;
                const isSel = k === selected;
                const isToday = k === todayKey;
                const dots = [...new Set(eventsOn(events, date, 'month').map((e) => e.color))].slice(0, 3);
                return (
                  <TouchableOpacity
                    key={`${k}-${i}`}
                    style={{ flex: 1, height: 54, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => pickDate(date)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.dayCircle, isToday && s.todayCircle, isSel && s.selCircle]}>
                      <Text style={[s.dayText, !inMonth && s.fadedNum, isToday && s.todayNum, isSel && s.selNum]}>{date.getDate()}</Text>
                    </View>
                    <View style={s.dots}>
                      {dots.map((c) => <View key={c} style={[s.dot, { backgroundColor: c }]} />)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={s.agendaHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.agendaDay}>{selected === todayKey ? 'Today' : selectedDate.toLocaleDateString('en-GB', { weekday: 'long' })}</Text>
          <Text style={s.agendaDate}>
            {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {dayEvents.length > 0 ? `  ·  ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openNew} activeOpacity={0.85}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>Add event</Text>
        </TouchableOpacity>
      </View>

      {dayEvents.map((ev) => (
        <TouchableOpacity key={ev.id} style={[s.eventCard, { backgroundColor: ev.color + '22' }]} onPress={() => openEdit(ev)} activeOpacity={0.8}>
          <View style={[s.eventBar, { backgroundColor: ev.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.eventTitle}>{ev.title}</Text>
            <View style={s.eventMetaRow}>
              <Ionicons name="time-outline" size={14} color={colors.sub} />
              <Text style={s.eventMeta}>{ev.start == null ? 'All day' : `${formatMinutes(ev.start)} – ${formatMinutes(ev.end)}`}</Text>
            </View>
            {!!ev.place && (
              <View style={s.eventMetaRow}>
                <Ionicons name="location-outline" size={14} color={colors.sub} />
                <Text style={s.eventMeta}>{ev.place}</Text>
              </View>
            )}
          </View>
          <View style={[s.eventDot, { backgroundColor: ev.color }]}>
            <Ionicons name="create-outline" size={16} color={textColorFor(ev.color)} />
          </View>
        </TouchableOpacity>
      ))}

      {dayEvents.length === 0 && (
        <View style={s.emptyBox}>
          <Text style={s.emptyTitle}>Nothing planned</Text>
          <Text style={s.emptySub}>Tap "Add event" to plan this day.</Text>
        </View>
      )}
    </>
  );

  /* ---------- week view ---------- */
  const dayLists = weekDays.map((d) => layoutDay(eventsOn(events, d, 'week')));

  let startH = 7;
  let endH = 20;
  dayLists.forEach((list) => list.forEach(({ ev }) => {
    startH = Math.min(startH, Math.floor(ev.start / 60));
    endH = Math.max(endH, Math.ceil(ev.end / 60));
  }));
  endH = Math.min(endH, 24);
  const bodyH = (endH - startH) * HOUR_H;

  const availW = width - 32 - 16 - TIME_W;
  const colW = fit ? Math.floor(availW / 7) : 92;
  const gridW = colW * 7;
  const fs = fit ? 9 : 11;

  const w0 = weekDays[0];
  const w6 = weekDays[6];
  const weekLabel = w0.getMonth() === w6.getMonth()
    ? `${w0.getDate()} – ${w6.getDate()} ${MONTHS[w6.getMonth()]}`
    : `${w0.getDate()} ${MONTHS[w0.getMonth()].slice(0, 3)} – ${w6.getDate()} ${MONTHS[w6.getMonth()].slice(0, 3)}`;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMin - startH * 60) / 60) * HOUR_H;
  const todayIndex = weekDays.findIndex((d) => dateKey(d) === todayKey);

  const selIndex = weekDays.findIndex((d) => dateKey(d) === selected);

  const moveWeek = (delta) => {
    setWeekOffset(weekOffset + delta);
    pickDate(addDays(selectedDate, delta * 7));
  };

  const renderWeek = () => (
    <>
      <View style={[s.card, shadow, { padding: 8 }]}>
        <View style={[s.pillNav, { marginTop: 2 }]}>
          <TouchableOpacity style={s.pillBtn} onPress={() => moveWeek(-1)} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={NAVY} />
          </TouchableOpacity>
          <View style={s.pillCenter}>
            <Text style={s.pillText}>{weekLabel}</Text>
          </View>
          <TouchableOpacity style={s.pillBtn} onPress={() => moveWeek(1)} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={NAVY} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <View style={{ width: TIME_W }}>
            <View style={{ height: HEAD_H }} />
            <View style={{ height: bodyH }}>
              {Array.from({ length: endH - startH }, (_, i) => (
                <Text key={i} style={[s.hourLabel, { top: i * HOUR_H - 6 }]}>{pad(startH + i)}:00</Text>
              ))}
            </View>
          </View>

          <ScrollView horizontal scrollEnabled={!fit} showsHorizontalScrollIndicator={false}>
            <View style={{ width: gridW }}>
              <View style={{ flexDirection: 'row', height: HEAD_H }}>
                {weekDays.map((d, i) => {
                  const k = dateKey(d);
                  const isToday = k === todayKey;
                  const isSel = k === selected;
                  return (
                    <TouchableOpacity key={i} activeOpacity={0.7} onPress={() => pickDate(d)} style={[s.colHead, { width: colW }]}>
                      <Text style={s.colName}>{DAY_NAMES[d.getDay()]}</Text>
                      <View style={[s.colDateWrap, isToday && s.colDateRing, isSel && s.colDateToday]}>
                        <Text style={[s.colDate, isToday && { color: NAVY }, isSel && { color: '#fff' }]}>{d.getDate()}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ height: bodyH }}>
                {selIndex >= 0 && (
                  <View style={[s.todayBg, { left: selIndex * colW, width: colW, height: bodyH }]} />
                )}
                {Array.from({ length: endH - startH }, (_, i) => (
                  <View key={i} style={[s.hourLine, { top: i * HOUR_H, width: gridW }]} />
                ))}
                {weekDays.map((d, i) => (
                  <View key={i} style={[s.colLine, { left: i * colW, height: bodyH }]} />
                ))}
                {weekDays.map((d, i) => (
                  <TouchableOpacity
                    key={`tap${i}`}
                    activeOpacity={1}
                    onPress={() => pickDate(d)}
                    style={{ position: 'absolute', top: 0, left: i * colW, width: colW, height: bodyH }}
                  />
                ))}
                {dayLists.map((list, di) =>
                  list.map(({ ev, lane, lanes }) => {
                    const laneW = (colW - 3) / lanes;
                    const top = ((ev.start - startH * 60) / 60) * HOUR_H + 1;
                    const height = Math.max(((ev.end - ev.start) / 60) * HOUR_H - 2, 20);
                    const tc = textColorFor(ev.color);
                    return (
                      <TouchableOpacity
                        key={`${ev.id}-${di}`}
                        activeOpacity={0.8}
                        onPress={() => openEdit(ev)}
                        style={[s.block, { left: di * colW + 1.5 + lane * laneW, width: laneW - 1.5, top, height, backgroundColor: ev.color }]}
                      >
                        <Text style={{ color: tc, fontSize: fs, fontWeight: '800', textAlign: 'center' }} numberOfLines={3}>{ev.title}</Text>
                        {!!ev.place && (
                          <Text style={{ color: tc, fontSize: fs - 1, textAlign: 'center', opacity: 0.9 }} numberOfLines={2}>{ev.place}</Text>
                        )}
                        {!fit && height >= 56 && (
                          <Text style={{ color: tc, fontSize: 9, marginTop: 2, opacity: 0.85 }}>{formatMinutes(ev.start)}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
                {todayIndex >= 0 && nowTop >= 0 && nowTop <= bodyH && (
                  <View pointerEvents="none" style={[s.nowLine, { top: nowTop, left: todayIndex * colW, width: colW }]}>
                    <View style={s.nowDot} />
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
      <View style={[s.weekActions, { marginTop: 14, marginBottom: 0 }]}>
        <TouchableOpacity style={s.smallBtn} onPress={() => setFit(!fit)}>
          <Ionicons name={fit ? 'expand-outline' : 'contract-outline'} size={18} color={colors.primary} />
          <Text style={s.smallBtnText}>{fit ? 'Wide view' : 'Fit week'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={openNew} activeOpacity={0.85}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>Add event</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.hint}>Tap a day to select it, and tap a block to edit it. Events added here show only in Week view.</Text>
    </>
  );

  /* ---------- form pieces ---------- */
  const formWeekDays = form && form.view === 'week' && !form.repeat
    ? [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(mondayOf(parseKey(form.date)), i))
    : [];

  /* ---------- screen ---------- */
  return (
    <View style={{ flex: 1 }}>
      <Blobs />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.topRow}>
          <View>
            <Text style={s.title}>Calendar</Text>
            <Text style={s.subtitle}>{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={s.todayBtn} onPress={goToday}>
              <Ionicons name="today-outline" size={18} color={NAVY} />
              <Text style={s.todayText}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.seg}>
          <TouchableOpacity style={[s.segBtn, mode === 'month' && s.segOn]} onPress={() => setMode('month')}>
            <Ionicons name="calendar-outline" size={17} color={mode === 'month' ? '#fff' : colors.sub} />
            <Text style={[s.segText, mode === 'month' && s.segTextOn]}>Month</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.segBtn, mode === 'week' && s.segOn]} onPress={openWeek}>
            <Ionicons name="grid-outline" size={17} color={mode === 'week' ? '#fff' : colors.sub} />
            <Text style={[s.segText, mode === 'week' && s.segTextOn]}>Week</Text>
          </TouchableOpacity>
        </View>

        {mode === 'month' ? renderMonth() : renderWeek()}
      </ScrollView>

      <Modal visible={!!form} animationType="slide" transparent onRequestClose={() => setForm(null)}>
        <View style={s.backdrop}>
          {form && (
            <View style={s.sheet}>
              <View style={s.handle} />
              <View style={s.sheetHead}>
                <View>
                  <Text style={s.sheetTitle}>{form.id ? 'Edit event' : 'New event'}</Text>
                  <Text style={s.sheetSub}>{form.view === 'week' ? 'Shows in Week view only' : 'Shows in Month view only'}</Text>
                </View>
                <TouchableOpacity style={s.navBtn} onPress={() => setForm(null)} hitSlop={10}>
                  <Ionicons name="close" size={20} color={colors.sub} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <TextInput style={s.input} placeholder={form.view === 'week' ? 'Title, e.g. CTEC 31013' : 'Title, e.g. Maths exam'} placeholderTextColor="#9AA0C0" value={form.title} onChangeText={(t) => set({ title: t })} />
                <TextInput style={[s.input, { marginTop: 10 }]} placeholder={form.view === 'week' ? 'Place (optional), e.g. AB-LCH-04-1' : 'Note or place (optional)'} placeholderTextColor="#9AA0C0" value={form.place} onChangeText={(t) => set({ place: t })} />

                {form.view === 'month' && (
                  <>
                    <View style={s.dateRow}>
                      <TouchableOpacity style={s.navBtn} onPress={() => set({ date: shiftKey(form.date, -1) })} hitSlop={8}>
                        <Ionicons name="chevron-back" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <Text style={s.dateText}>
                        {parseKey(form.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                      </Text>
                      <TouchableOpacity style={s.navBtn} onPress={() => set({ date: shiftKey(form.date, 1) })} hitSlop={8}>
                        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                    <View style={s.repeatRow}>
                      <Text style={s.label}>Set a time</Text>
                      <Switch value={form.hasTime} onValueChange={(v) => set({ hasTime: v })} trackColor={{ true: colors.primary }} />
                    </View>
                  </>
                )}

                {form.hasTime && (
                  <>
                    <TimePicker label="Starts" value={form.start} onChange={changeStart} />
                    <TimePicker label="Ends" value={form.end} onChange={(v) => set({ end: v })} />
                  </>
                )}

                <Text style={[s.label, { marginTop: 18 }]}>Colour</Text>
                <View style={s.colorRow}>
                  {COLORS.map((c) => (
                    <TouchableOpacity key={c} onPress={() => set({ color: c })} style={[s.swatch, { backgroundColor: c }, form.color === c && s.swatchOn]}>
                      {form.color === c && <Ionicons name="checkmark" size={18} color={textColorFor(c)} />}
                    </TouchableOpacity>
                  ))}
                </View>

                {form.view === 'week' && (
                  <>
                    <View style={s.miniSeg}>
                      <TouchableOpacity style={[s.miniBtn, form.repeat && s.miniOn]} onPress={() => set({ repeat: true })}>
                        <Text style={[s.miniText, form.repeat && s.miniTextOn]}>Every week</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.miniBtn, !form.repeat && s.miniOn]} onPress={() => set({ repeat: false })}>
                        <Text style={[s.miniText, !form.repeat && s.miniTextOn]}>This week only</Text>
                      </TouchableOpacity>
                    </View>

                    {form.repeat ? (
                      <View style={s.daysRow}>
                        {WEEK_ORDER.map((d) => (
                          <TouchableOpacity key={d} style={[s.dayChip, form.days.includes(d) && s.chipOn]} onPress={() => toggleDay(d)}>
                            <Text style={[s.chipText, form.days.includes(d) && s.chipTextOn]}>{DAY_NAMES[d]}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <View style={s.daysRow}>
                        {formWeekDays.map((d) => {
                          const k = dateKey(d);
                          const on = form.date === k;
                          return (
                            <TouchableOpacity key={k} style={[s.dayChip, on && s.chipOn]} onPress={() => set({ date: k })}>
                              <Text style={[s.chipText, on && s.chipTextOn]}>{DAY_NAMES[d.getDay()]} {d.getDate()}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}

                <TouchableOpacity style={s.saveBtn} onPress={saveForm} activeOpacity={0.85}>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={s.saveText}>Save event</Text>
                </TouchableOpacity>
                {!!form.id && (
                  <TouchableOpacity style={s.delBtn} onPress={deleteForm}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={s.delText}>Delete event</Text>
                  </TouchableOpacity>
                )}
                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  sheet2: { backgroundColor: '#fff', borderRadius: 34, padding: 16, overflow: 'hidden' },
  pillNav: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pillBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow },
  pillCenter: { flex: 1, marginHorizontal: 10, height: 40, borderRadius: 20, backgroundColor: '#EEF0F6', alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 16, fontWeight: '800', color: NAVY },
  weekday2: { flex: 1, textAlign: 'center', color: NAVY, fontWeight: '800', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.sub, marginTop: 2, fontWeight: '600' },
  todayBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 16, ...shadow },
  todayText: { color: NAVY, fontWeight: '800', marginLeft: 6 },
  seg: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 4, marginBottom: 16, ...shadow },
  segBtn: { flex: 1, flexDirection: 'row', paddingVertical: 11, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: NAVY },
  segText: { fontWeight: '800', color: colors.sub, marginLeft: 7 },
  segTextOn: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 28, padding: 12 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: SOFT, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  navSub: { fontSize: 12, fontWeight: '700', color: colors.sub, marginTop: 1 },
  weekday: { textAlign: 'center', color: colors.sub, fontWeight: '800', fontSize: 10, letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { borderWidth: 2, borderColor: NAVY },
  selCircle: { backgroundColor: NAVY, borderWidth: 0, shadowColor: NAVY, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  dayText: { fontSize: 17, fontWeight: '700', color: NAVY },
  fadedNum: { color: '#BCC0CC', fontWeight: '600' },
  todayNum: { color: NAVY, fontWeight: '800' },
  selNum: { color: '#fff', fontWeight: '800' },
  dots: { flexDirection: 'row', height: 7, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 1.5 },

  agendaHead: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  agendaDay: { fontSize: 24, fontWeight: '800', color: colors.text },
  agendaDate: { fontSize: 12, fontWeight: '700', color: colors.sub, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, height: 42, paddingHorizontal: 14, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  addBtnText: { color: '#fff', fontWeight: '800', marginLeft: 3 },
  eventCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, padding: 14, marginBottom: 10 },
  eventBar: { width: 6, alignSelf: 'stretch', borderRadius: 3, marginRight: 14 },
  eventTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  eventMeta: { fontSize: 12.5, color: colors.sub, fontWeight: '600', marginLeft: 5 },
  eventDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  emptyBox: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, paddingVertical: 28, ...shadow },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 8 },
  emptySub: { fontSize: 13, color: colors.sub, marginTop: 3 },

  weekActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, height: 42, paddingHorizontal: 14, ...shadow },
  smallBtnText: { color: colors.primary, fontWeight: '800', marginLeft: 7, fontSize: 13 },
  hourLabel: { position: 'absolute', left: 0, width: TIME_W - 6, fontSize: 10, fontWeight: '700', color: colors.sub, textAlign: 'right' },
  colHead: { alignItems: 'center', justifyContent: 'center' },
  colName: { fontSize: 11, fontWeight: '800', color: NAVY },
  colDateWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  colDateToday: { backgroundColor: NAVY },
  colDateRing: { borderWidth: 2, borderColor: NAVY },
  colDate: { fontSize: 14, fontWeight: '800', color: colors.text },
  hourLine: { position: 'absolute', left: 0, borderTopWidth: 1, borderColor: colors.line },
  colLine: { position: 'absolute', top: 0, width: 0, borderLeftWidth: 1, borderColor: colors.line },
  todayBg: { position: 'absolute', top: 0, backgroundColor: 'rgba(44,74,107,0.07)', borderRadius: 8 },
  block: { position: 'absolute', borderRadius: 8, padding: 3, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  nowLine: { position: 'absolute', height: 2, backgroundColor: colors.danger, justifyContent: 'center' },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, marginLeft: -3 },
  hint: { textAlign: 'center', color: colors.sub, fontSize: 12, marginTop: 12, paddingHorizontal: 20 },

  backdrop: { flex: 1, backgroundColor: 'rgba(20,24,60,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 10, maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#D9DCEB', marginBottom: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  sheetSub: { fontSize: 12, fontWeight: '700', color: colors.primary, marginTop: 2 },
  input: { backgroundColor: SOFT, borderRadius: 16, paddingHorizontal: 16, height: 50, fontSize: 15, color: colors.text },
  label: { fontSize: 14, fontWeight: '800', color: colors.text },
  timeBox: { backgroundColor: '#F8F9FF', borderRadius: 18, padding: 14, marginTop: 14 },
  timeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
  chip: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '700', color: colors.text, fontSize: 13 },
  chipTextOn: { color: '#fff' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  swatch: { width: 40, height: 40, borderRadius: 20, marginRight: 10, marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 5 },
  repeatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  miniSeg: { flexDirection: 'row', backgroundColor: SOFT, borderRadius: 14, padding: 4, marginTop: 8 },
  miniBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  miniOn: { backgroundColor: '#fff', shadowColor: '#2E3A8C', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  miniText: { fontWeight: '700', color: colors.sub, fontSize: 13 },
  miniTextOn: { color: colors.primary, fontWeight: '800' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  dayChip: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.line },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, backgroundColor: '#F8F9FF', borderRadius: 18, padding: 10 },
  dateText: { fontSize: 15, fontWeight: '800', color: colors.text },
  saveBtn: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 18, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 22, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 6 },
  delText: { color: colors.danger, fontWeight: '800', marginLeft: 6 },
});
