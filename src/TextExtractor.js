import React, { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { File } from 'expo-file-system';
import { buildPdfHtml } from './pdfHtml';

// Reads the text of several PDFs, one after another, in a hidden page.
// Calls onDone([{ name, text }]) when finished, or onError(message).
export default function TextExtractor({ files, onDone, onError }) {
  const [i, setI] = useState(0);
  const [html, setHtml] = useState(null);
  const ref = useRef(null);
  const results = useRef([]);
  const finished = useRef(false);

  useEffect(() => {
    let alive = true;
    setHtml(null);
    new File(files[i].uri)
      .base64()
      .then((b64) => {
        if (alive) setHtml(buildPdfHtml(b64, { textOnly: true }));
      })
      .catch((e) => {
        if (alive && !finished.current) {
          finished.current = true;
          onError(String(e.message || e));
        }
      });
    return () => {
      alive = false;
    };
  }, [i]);

  // give up if a file never answers
  useEffect(() => {
    const t = setTimeout(() => {
      if (!finished.current) {
        finished.current = true;
        onError('Reading the past paper took too long.');
      }
    }, 60000);
    return () => clearTimeout(t);
  }, []);

  const ask = () => {
    if (ref.current) ref.current.injectJavaScript(`window.getAllText(${files[i].limit || 9000}); true;`);
  };

  const onMessage = (e) => {
    if (finished.current) return;
    let m;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch (err) {
      return;
    }
    if (m.type === 'done') ask();
    else if (m.type === 'error') {
      finished.current = true;
      onError(m.message);
    } else if (m.type === 'allText') {
      if (m.loading) {
        setTimeout(ask, 500);
        return;
      }
      results.current.push({ name: files[i].name, text: m.text || '' });
      if (i + 1 < files.length) setI(i + 1);
      else {
        finished.current = true;
        onDone(results.current);
      }
    }
  };

  if (!html) return null;
  return (
    <WebView
      key={i}
      ref={ref}
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://learnmate.local/' }}
      javaScriptEnabled
      onMessage={onMessage}
    />
  );
}
