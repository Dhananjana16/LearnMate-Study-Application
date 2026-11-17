import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import useOpenTimer from '../hooks/useOpenTimer';
import { formatTime } from '../timeStore';
import { buildPdfHtml } from '../pdfHtml';
import { getNotes } from '../notesStore';
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

function PdfView({ file, notes, highlights, highlightMode, highlightColor, highlightSize, eraser, onAddNote, onOpenNote, onPage, onAddHighlight, onOpenHighlight, onEraseHighlights }) {
  const [html, setHtml] = useState(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const ref = useRef(null);

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
        } catch (err) {}
      }}
    />
  );
}

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
        <PdfView
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
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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