import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import { useFocusEffect } from '@react-navigation/native';
import useOpenTimer from '../hooks/useOpenTimer';
import { formatTime } from '../timeStore';
import { buildPdfHtml } from '../pdfHtml';
import { getNotes } from '../notesStore';
import VoicePicker from '../VoicePicker';
import { cleanForSpeech, speakOptions } from '../speechText';
import { getVoice, saveVoice } from '../ttsStore';
import { getHighlights, addHighlight, deleteHighlight, deleteHighlights } from '../highlightStore';

const COLORS = [
  { name: 'yellow', hex: '#facc15' },
  { name: 'green', hex: '#4ade80' },
  { name: 'pink', hex: '#f472b6' },
  { name: 'blue', hex: '#60a5fa' },
  { name: 'orange', hex: '#fb923c' },
];

const SIZES = [
  { label: 'Thin', px: 8 },
  { label: 'Medium', px: 12 },
  { label: 'Thick', px: 18 },
];

const PdfView = forwardRef(function PdfView({ file, notes, highlights, highlightMode, highlightColor, highlightSize, eraser, onAddNote, onOpenNote, onPage, onAddHighlight, onOpenHighlight, onEraseHighlights, onPageText }, outerRef) {
  const [html, setHtml] = useState(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const ref = useRef(null);
  useImperativeHandle(outerRef, () => ({
    run: (js) => { if (ref.current) ref.current.injectJavaScript(js + '; true;'); },
  }));

  useEffect(() => {
    let alive = true;
    new File(file.uri)
      .base64()
      .then((b64) => {
        if (alive) setHtml(buildPdfHtml(b64));
      })
      .catch((e) => {
        if (alive) setError(String(e.message || e));
      });
    return () => {
      alive = false;
    };
  }, [file.uri]);

  // Send the note markers into the PDF page whenever the notes change.
  useEffect(() => {
    if (!ready || !ref.current) return;
    const markers = notes.map((n) => ({ id: n.id, page: n.page, x: n.x, y: n.y }));
    ref.current.injectJavaScript(`window.setNotes(${JSON.stringify(markers)}); true;`);
  }, [ready, notes]);

  useEffect(() => {
    if (!ready || !ref.current) return;
    ref.current.injectJavaScript(`window.setHighlights(${JSON.stringify(highlights)}); true;`);
  }, [ready, highlights]);

  useEffect(() => {
    if (!ready || !ref.current) return;
    ref.current.injectJavaScript(`window.setHighlightMode(${highlightMode ? 'true' : 'false'}); true;`);
  }, [ready, highlightMode]);

  useEffect(() => {
    if (!ready || !ref.current) return;
    ref.current.injectJavaScript(`window.setHighlightColor('${highlightColor}'); true;`);
  }, [ready, highlightColor]);

  useEffect(() => {
    if (!ready || !ref.current) return;
    ref.current.injectJavaScript(`window.setHighlightSize(${highlightSize}); true;`);
  }, [ready, highlightSize]);

  useEffect(() => {
    if (!ready || !ref.current) return;
    ref.current.injectJavaScript(`window.setEraser(${eraser ? 'true' : 'false'}); true;`);
  }, [ready, eraser]);

  const source = useMemo(() => (html ? { html, baseUrl: 'https://learnmate.local/' } : null), [html]);

  const openOutside = async () => {
    try {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf' });
    } catch (e) {
      Alert.alert('Could not open file', String(e.message || e));
    }
  };

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.name}>Could not read this file.</Text>
        <Text style={s.note}>{error}</Text>
        <TouchableOpacity style={s.button} onPress={openOutside}><Text style={s.buttonText}>Open in another app</Text></TouchableOpacity>
      </View>
    );
  }
  if (!source) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={s.note}>Opening PDF...</Text>
      </View>
    );
  }
  return (
    <WebView
      ref={ref}
      style={{ flex: 1 }}
      originWhitelist={['*']}
      source={source}
      javaScriptEnabled
      domStorageEnabled
      onMessage={(e) => {
        try {
          const m = JSON.parse(e.nativeEvent.data);
          if (m.type === 'ready') setReady(true);
          else if (m.type === 'error') setError(m.message);
          else if (m.type === 'page') onPage(m.page);
          else if (m.type === 'addNote') onAddNote(m.page, m.x, m.y);
          else if (m.type === 'openNote') onOpenNote(m.id);
          else if (m.type === 'addHighlight') onAddHighlight(m);
          else if (m.type === 'openHighlight') onOpenHighlight(m.id);
          else if (m.type === 'eraseHighlights') onEraseHighlights(m.ids);
          else if (m.type === 'pageText') onPageText(m);
        } catch (err) {}
      }}
    />
  );
});

// Cuts text into pieces the phone's voice can handle, at sentence ends.
function makeChunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const chunks = [];
  let cur = '';
  for (const sen of sentences) {
    if (cur.length + sen.length > 1500 && cur) {
      chunks.push(cur);
      cur = '';
    }
    cur += sen;
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

const RATES = [0.7, 0.8, 0.9, 1, 1.25];

export default function ViewerScreen({ route, navigation }) {
  const { file } = route.params;
  const isImage = file.mimeType.startsWith('image');
  const seconds = useOpenTimer(file.id);
  const [notes, setNotes] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [tool, setTool] = useState(null); // null, 'highlight' or 'erase'
  const highlightMode = tool !== null;
  const eraser = tool === 'erase';
  const [highlightColor, setHighlightColor] = useState('yellow');
  const [highlightSize, setHighlightSize] = useState(12);
  const pageRef = useRef(1);

  // ----- listen (read the PDF aloud) -----
  const pdfRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [readPage, setReadPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rate, setRate] = useState(0.9);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [voiceId, setVoiceId] = useState(null);
  const voiceRef = useRef(null);

  useEffect(() => {
    getVoice().then((v) => {
      voiceRef.current = v;
      setVoiceId(v);
    });
  }, []);

  const pickVoice = (id) => {
    voiceRef.current = id;
    setVoiceId(id);
    saveVoice(id);
  };
  const st = useRef({ on: false, page: 1, total: 0, chunks: [], idx: 0, rate: 1, empties: 0 });

  const stopListening = useCallback(() => {
    st.current.on = false;
    Speech.stop();
    setListening(false);
  }, []);

  const requestPage = (n) => {
    st.current.page = n;
    setReadPage(n);
    if (pdfRef.current) pdfRef.current.run(`window.goToPage(${n}); window.getPageText(${n})`);
  };

  const speakNext = () => {
    const c = st.current;
    if (!c.on) return;
    if (c.idx >= c.chunks.length) {
      const next = c.page + 1;
      if (c.total && next > c.total) {
        stopListening();
        return;
      }
      requestPage(next);
      return;
    }
    const chunk = c.chunks[c.idx++];
    Speech.speak(chunk, { ...speakOptions(chunk, voiceRef.current, c.rate), onDone: speakNext, onError: stopListening });
  };

  const onPageText = (m) => {
    const c = st.current;
    if (!c.on || m.page !== c.page) return;
    if (m.loading) {
      // the PDF is still opening: try again in a moment
      setTimeout(() => { if (st.current.on && st.current.page === m.page) requestPage(m.page); }, 800);
      return;
    }
    if (m.pages) {
      c.total = m.pages;
      setTotalPages(m.pages);
    }
    const text = cleanForSpeech(
      (m.text || '')
        .replace(/-\n/g, '')
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
    if (!text) {
      c.empties += 1;
      if (c.empties >= 2 || (c.total && c.page >= c.total)) {
        stopListening();
        Alert.alert('Nothing to read', 'These pages have no readable text. Scanned pages and pictures cannot be read aloud.');
        return;
      }
      requestPage(c.page + 1);
      return;
    }
    c.empties = 0;
    c.chunks = makeChunks(text);
    c.idx = 0;
    speakNext();
  };

  const startListening = () => {
    st.current = { on: true, page: pageRef.current, total: totalPages, chunks: [], idx: 0, rate, empties: 0 };
    setListening(true);
    requestPage(pageRef.current);
  };

  const changeRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    st.current.rate = next;
  };

  useFocusEffect(
    useCallback(() => {
      return () => stopListening();
    }, [stopListening])
  );

  useFocusEffect(
    useCallback(() => {
      getNotes(file.id).then(setNotes);
      getHighlights(file.id).then(setHighlights);
    }, [file.id])
  );

  const isPdf = !isImage;
  const onAddHighlight = async (m) => {
    const list = await addHighlight(file.id, { id: Date.now().toString(), page: m.page, x: m.x, y: m.y, w: m.w, h: m.h, color: m.color || 'yellow' });
    setHighlights(list);
  };
  const onEraseHighlights = async (ids) => {
    setHighlights(await deleteHighlights(file.id, ids));
  };
  const undoHighlight = async () => {
    if (!highlights.length) return;
    setHighlights(await deleteHighlight(file.id, highlights[highlights.length - 1].id));
  };
  const onOpenHighlight = (id) => {
    Alert.alert('Remove highlight', 'Remove this highlight?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => setHighlights(await deleteHighlight(file.id, id)) },
    ]);
  };
  const addNote = (page, x, y) => navigation.navigate('NoteEditor', { file, isPdf, page, x, y });
  const openNote = (noteId) => navigation.navigate('NoteEditor', { file, isPdf, noteId });

  return (
    <View style={s.container}>
      <View style={s.timerBar}>
        <Text style={s.timerText}>⏱ {formatTime(seconds)}</Text>
        <View style={s.buttons}>
        {isPdf && (
          <>
            <TouchableOpacity
              style={[s.hlButton, tool === 'highlight' && s.hlButtonOn]}
              onPress={() => setTool(tool === 'highlight' ? null : 'highlight')}
            >
              <Text style={s.hlButtonText}>🖍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.hlButton, tool === 'erase' && s.eraseButtonOn]}
              onPress={() => setTool(tool === 'erase' ? null : 'erase')}
            >
              <Text style={s.hlButtonText}>🧽 Erase</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={s.notesButton}
          onPress={() => navigation.navigate('Notes', { file, isPdf, currentPage: pageRef.current })}
        >
          <Text style={s.notesButtonText}>📝 Notes ({notes.length})</Text>
        </TouchableOpacity>
        </View>
      </View>
      {tool === 'highlight' && (
        <View style={s.hlBanner}>
          <Text style={s.hlBannerText}>Swipe over text to highlight. Tap 🖍 again to scroll.</Text>
          <View style={s.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c.name}
                onPress={() => setHighlightColor(c.name)}
                style={[s.dot, { backgroundColor: c.hex }, highlightColor === c.name && s.dotOn]}
              />
            ))}
          </View>
          <View style={s.colorRow}>
            {SIZES.map((z) => (
              <TouchableOpacity
                key={z.label}
                onPress={() => setHighlightSize(z.px)}
                style={[s.chip, highlightSize === z.px && s.chipOn]}
              >
                <Text style={[s.chipText, highlightSize === z.px && s.chipTextOn]}>{z.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.undo} onPress={undoHighlight}>
              <Text style={s.undoText}>↩ Undo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {tool === 'erase' && (
        <View style={s.eraseBanner}>
          <Text style={s.eraseBannerText}>Eraser on: swipe over a highlight to remove it. Tap 🧽 again to scroll.</Text>
        </View>
      )}
      {isImage ? (
        <Image source={{ uri: file.uri }} style={s.image} resizeMode="contain" />
      ) : (
        <View style={{ flex: 1 }}>
        <PdfView
          ref={pdfRef}
          onPageText={onPageText}
          file={file}
          notes={notes}
          highlights={highlights}
          highlightMode={highlightMode}
          highlightColor={highlightColor}
          highlightSize={highlightSize}
          eraser={eraser}
          onEraseHighlights={onEraseHighlights}
          onAddHighlight={onAddHighlight}
          onOpenHighlight={onOpenHighlight}
          onAddNote={addNote}
          onOpenNote={openNote}
          onPage={(p) => { pageRef.current = p; }}
        />
        {!listening ? (
          <TouchableOpacity style={s.fab} onPress={startListening}>
            <Text style={s.fabText}>🔊</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.listenBar}>
            <Text style={s.listenText}>🔊 {readPage}{totalPages ? `/${totalPages}` : ''}</Text>
            <TouchableOpacity style={s.rateButton} onPress={() => setPickerOpen(true)}>
              <Text style={s.rateText}>🗣 Voice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.rateButton} onPress={changeRate}>
              <Text style={s.rateText}>{rate}x</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.stopButton} onPress={stopListening}>
              <Text style={s.stopText}>⏹ Stop</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      )}
      <VoicePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} selected={voiceId} onPick={pickVoice} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  fab: { position: 'absolute', right: 16, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { fontSize: 24 },
  listenBar: { position: 'absolute', left: 12, right: 12, bottom: 20, backgroundColor: '#111827', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 6 },
  listenText: { color: '#fff', fontWeight: 'bold', flex: 1 },
  rateButton: { backgroundColor: '#374151', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginRight: 8 },
  rateText: { color: '#fff', fontWeight: 'bold' },
  stopButton: { backgroundColor: '#dc2626', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  stopText: { color: '#fff', fontWeight: 'bold' },
  timerBar: { backgroundColor: '#eef2ff', paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerText: { color: '#4f46e5', fontWeight: 'bold' },
  buttons: { flexDirection: 'row', alignItems: 'center' },
  hlButton: { backgroundColor: '#e5e7eb', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginRight: 6 },
  hlButtonOn: { backgroundColor: '#fde047' },
  eraseButtonOn: { backgroundColor: '#fca5a5' },
  eraseBanner: { backgroundColor: '#fee2e2', paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  eraseBannerText: { color: '#991b1b', fontSize: 13, textAlign: 'center' },
  hlButtonText: { fontSize: 15, fontWeight: 'bold' },
  hlBanner: { backgroundColor: '#fef9c3', paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  colorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  dot: { width: 30, height: 30, borderRadius: 15, marginHorizontal: 6, borderWidth: 2, borderColor: 'transparent' },
  dotOn: { borderColor: '#111827' },
  chip: { paddingVertical: 6, paddingHorizontal: 12, marginHorizontal: 4, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db' },
  chipOn: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { color: '#374151', fontWeight: 'bold' },
  chipTextOn: { color: '#fff' },
  undo: { marginLeft: 14, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db' },
  undoText: { fontWeight: 'bold', color: '#374151' },
  hlBannerText: { color: '#854d0e', fontSize: 13 },
  notesButton: { backgroundColor: '#4f46e5', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  notesButtonText: { color: '#fff', fontWeight: 'bold' },
  image: { flex: 1, width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  name: { fontSize: 16, marginVertical: 12, textAlign: 'center' },
  button: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 8, marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  note: { color: '#888', marginTop: 12, textAlign: 'center' },
});
