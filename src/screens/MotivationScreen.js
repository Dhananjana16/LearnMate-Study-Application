import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, Image, ActivityIndicator, Animated, Easing, AppState,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getVideos, saveVideos, resolveLink, embedUrl } from '../videoStore';
import { colors, shadow } from '../theme';
import { mascots } from '../images';
import { Blobs } from '../Decor';

const PHONE_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// Builds a small page around TikTok's official player (or YouTube's). We control the page, so the
// video always fills it the same way and swipes work everywhere.
// A video waiting off screen is loaded paused (you see its first picture). When it becomes the active
// one, a second player is started underneath with autoplay on, and the page switches to it the moment
// it is really playing, so there is no flash or blank screen while it loads.
function buildHtml(video, active, zoom) {
  const isYT = video.kind === 'youtube';
  const make = (on) =>
    isYT
      ? 'https://www.youtube.com/embed/' + video.vid + '?playsinline=1&controls=0&rel=0&modestbranding=1&loop=1&playlist=' +
        video.vid + '&enablejsapi=1&autoplay=' + (on ? 1 : 0)
      : 'https://www.tiktok.com/player/v1/' + video.vid + '?autoplay=' + (on ? 1 : 0) +
        '&loop=1&controls=0&music_info=0&description=0&rel=0&progress_bar=0&play_button=0' +
        '&volume_control=0&fullscreen_button=0&timestamp=0&native_context_menu=0&closed_caption=0';
  const srcOn = make(true);
  const srcOff = make(false);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
  iframe { position: absolute; left: 0; top: 0; width: 100%; height: 100%; border: 0; background: #000; transform-origin: center center; }
  #f { z-index: 1; }
  #g { z-index: 0; display: none; }
  #t { position: absolute; left: 0; top: 0; right: 0; bottom: 0; z-index: 2; touch-action: none; }
  #m { position: absolute; right: 12px; bottom: 14px; z-index: 3; height: 36px; padding: 0 14px; border-radius: 18px;
       background: rgba(0,0,0,0.55); color: #fff; font: bold 14px sans-serif; line-height: 36px; text-align: center; }
</style>
</head>
<body>
<iframe id="f" src="${active ? srcOn : srcOff}" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>
<iframe id="g" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>
<div id="t"></div>
<div id="m">&#128266; Sound on</div>
<script>
(function () {
  var f = document.getElementById('f'), g = document.getElementById('g');
  var t = document.getElementById('t'), m = document.getElementById('m');
  var YT = ${isYT ? 'true' : 'false'};
  var SRC_ON = ${JSON.stringify(srcOn)}, SRC_OFF = ${JSON.stringify(srcOff)};
  var active = ${active ? 'true' : 'false'};
  var aOn = active;            // is the first player loaded with autoplay on?
  var cur = f;                 // the player we are talking to
  var bUsed = false, swapped = false, swapTimer = null, offTimer = null;
  var muted = false, unmuteSent = false, lastTick = 0, ytPlaying = active;
  f.style.transform = g.style.transform = 'scale(${zoom})';

  function post(msg) { window.ReactNativeWebView.postMessage(msg); }
  function send(type, value) {
    try {
      if (YT) {
        var fn = { play: 'playVideo', pause: 'pauseVideo', mute: 'mute', unMute: 'unMute' }[type];
        cur.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: [] }), '*');
      } else {
        var msg = { type: type, 'x-tiktok-player': true };
        if (value !== undefined) msg.value = value;
        cur.contentWindow.postMessage(msg, '*');
        cur.contentWindow.postMessage(JSON.stringify(msg), '*');
      }
    } catch (e) {}
  }
  function showSound() { m.innerHTML = muted ? '&#128263; Muted' : '&#128266; Sound on'; }
  function playingNow() { return YT ? ytPlaying : (Date.now() - lastTick < 1300); }

  // Switch from the waiting picture to the player that is really playing.
  function swap() {
    if (swapped) return;
    swapped = true;
    if (swapTimer) { clearTimeout(swapTimer); swapTimer = null; }
    f.style.display = 'none';
    cur = g;
    unmuteSent = false;
  }

  // TikTok's player reports its time twice a second while it plays.
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
    if (!d || typeof d !== 'object' || !d['x-tiktok-player']) return;
    if (d.type !== 'onCurrentTime') return;
    if (bUsed && !swapped && e.source === g.contentWindow) swap();
    if (e.source === cur.contentWindow) {
      lastTick = Date.now();
      if (active && !muted && !unmuteSent) { unmuteSent = true; send('unMute'); }
    }
  });

  var sx = 0, sy = 0, st = 0;
  t.addEventListener('touchstart', function (e) {
    var p = e.touches[0]; sx = p.clientX; sy = p.clientY; st = Date.now();
  }, { passive: true });
  t.addEventListener('touchend', function (e) {
    var p = e.changedTouches[0], dx = p.clientX - sx, dy = p.clientY - sy;
    if (Math.abs(dy) > 60 && Math.abs(dx) < Math.abs(dy) * 0.7 && Date.now() - st < 900) {
      post(dy < 0 ? 'next' : 'prev');
      return;
    }
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && active) {
      if (playingNow()) { send('pause'); ytPlaying = false; lastTick = 0; }
      else { send('play'); ytPlaying = true; if (!muted) send('unMute'); }
    }
  }, { passive: true });
  m.addEventListener('click', function (e) {
    e.stopPropagation();
    muted = !muted;
    send(muted ? 'mute' : 'unMute');
    showSound();
  });

  function activate() {
    if (offTimer) { clearTimeout(offTimer); offTimer = null; }
    unmuteSent = false; ytPlaying = true; lastTick = 0;
    if (aOn || bUsed) return;          // already playing (first video, or a quick swipe back)
    bUsed = true; swapped = false;
    g.style.display = 'block';
    g.src = SRC_ON;
    swapTimer = setTimeout(swap, 6000);
  }
  function deactivate() {
    ytPlaying = false; lastTick = 0;
    if (offTimer) clearTimeout(offTimer);
    // wait a moment so the picture does not change while it is still sliding away
    offTimer = setTimeout(function () {
      offTimer = null;
      if (active) return;
      if (swapTimer) { clearTimeout(swapTimer); swapTimer = null; }
      if (bUsed) {
        g.src = 'about:blank';
        g.style.display = 'none';
        f.style.display = 'block';
        cur = f; bUsed = false; swapped = false;
      } else if (aOn) {
        f.src = SRC_OFF; aOn = false;
      }
    }, 300);
  }

  window.__setActive = function (a) {
    if (a === active) return;
    active = a;
    if (a) activate(); else deactivate();
  };
  window.__setZoom = function (z) { f.style.transform = g.style.transform = 'scale(' + z + ')'; };
})();
</script>
</body>
</html>`;
}

// One video. The page above fills the whole space; "fill" zooms in a little to remove black bars.
function VideoPlayer({ video, active, fill, onMessage }) {
  const webRef = useRef(null);
  const startActive = useRef(active);
  const startFill = useRef(fill);
  const mounted = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const html = useMemo(() => buildHtml(video, startActive.current, startFill.current ? 1.12 : 1), [video.id]);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (webRef.current) webRef.current.injectJavaScript('window.__setActive && window.__setActive(' + (active ? 'true' : 'false') + '); true;');
  }, [active]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (!webRef.current) return;
      if (st !== 'active') webRef.current.injectJavaScript('window.__setActive && window.__setActive(false); true;');
      else if (activeRef.current) webRef.current.injectJavaScript('window.__setActive && window.__setActive(true); true;');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!mounted.current) return;
    if (webRef.current) webRef.current.injectJavaScript('window.__setZoom && window.__setZoom(' + (fill ? 1.12 : 1) + '); true;');
  }, [fill]);

  return (
    <WebView
      ref={webRef}
      source={{ html, baseUrl: 'https://learnmate.local' }}
      style={{ flex: 1, backgroundColor: '#000' }}
      userAgent={PHONE_UA}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      originWhitelist={['*']}
      setSupportMultipleWindows={false}
      onMessage={onMessage}
    />
  );
}

// Slides between videos like a feed. The next video is already loaded, so swiping is quick.
function Pager({ list, index, onIndex, apiRef, onMessage, fill }) {
  const n = list.length;
  const mod = (i) => ((i % n) + n) % n;
  const [h, setH] = useState(0);
  const [abs, setAbs] = useState(index);
  const [act, setAct] = useState(index);
  const [back, setBack] = useState(false);
  const pos = useRef(new Animated.Value(index)).current;
  const busy = useRef(false);

  // The list or the position was changed from outside (for example a video was removed).
  useEffect(() => {
    if (mod(abs) !== index) {
      setAbs(index);
      setAct(index);
      pos.setValue(index);
    }
  }, [index, n]);

  const go = (d) => {
    if (busy.current || n < 2 || !h) return;
    busy.current = true;
    const target = abs + d;
    if (d < 0) setBack(true);
    setTimeout(() => setAct(target), 90);
    Animated.timing(pos, { toValue: target, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      setAct(target);
      setAbs(target);
      setBack(false);
      onIndex(mod(target));
      busy.current = false;
    });
  };

  useEffect(() => {
    apiRef.current = { go };
  });

  const slots = [abs];
  if (n > 1) slots.push(abs + 1);
  if (n > 1 && back) slots.push(abs - 1);

  return (
    <View
      style={{ flex: 1, backgroundColor: '#000', overflow: 'hidden' }}
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
    >
      {h > 0 &&
        slots.map((i) => (
          <Animated.View
            key={i}
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateY: pos.interpolate({ inputRange: [0, 1], outputRange: [i * h, (i - 1) * h] }) }] },
            ]}
          >
            <VideoPlayer video={list[mod(i)]} active={i === act} fill={fill} onMessage={onMessage} />
          </Animated.View>
        ))}
    </View>
  );
}

export default function MotivationScreen() {
  const [videos, setVideos] = useState(null);
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(false);
  const [fillMode, setFillMode] = useState(false);
  const insets = useSafeAreaInsets();
  const apiRef = useRef(null);
  const lastSwipe = useRef(0);

  useFocusEffect(
    useCallback(() => {
      getVideos().then(setVideos);
    }, [])
  );

  const list = videos || [];
  const safeIndex = Math.min(index, Math.max(list.length - 1, 0));
  const current = list[safeIndex];

  const next = () => apiRef.current && apiRef.current.go(1);
  const prev = () => apiRef.current && apiRef.current.go(-1);

  const onSwipe = (e) => {
    const msg = e.nativeEvent.data;
    if (msg === 'full') { setFull((f) => !f); return; }
    const now = Date.now();
    if (now - lastSwipe.current < 700) return;
    if (msg === 'next') { lastSwipe.current = now; next(); }
    if (msg === 'prev') { lastSwipe.current = now; prev(); }
  };

  const addVideos = async () => {
    const links = link.split(/\s+/).filter(Boolean);
    if (!links.length) return;
    setBusy(true);
    const added = [];
    let failed = 0;
    for (let i = 0; i < links.length; i++) {
      const item = await resolveLink(links[i]);
      if (item) added.push({ ...item, id: `${Date.now()}-${i}` });
      else failed += 1;
    }
    setBusy(false);
    if (added.length) {
      const updated = [...list, ...added];
      setVideos(updated);
      await saveVideos(updated);
      setIndex(updated.length - added.length);
      setLink('');
      setAdding(false);
    }
    if (failed) {
      Alert.alert(
        added.length ? `${added.length} added, ${failed} not understood` : 'Link not understood',
        'Paste TikTok video links (or YouTube / Shorts links). In TikTok tap Share, then Copy link.'
      );
    }
  };

  const removeCurrent = () => {
    if (!current) return;
    Alert.alert('Remove video', 'Remove this video from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = list.filter((v) => v.id !== current.id);
          setVideos(updated);
          await saveVideos(updated);
          setIndex(0);
        },
      },
    ]);
  };

  const loader = () => (
    <View style={s.loading}><ActivityIndicator color={colors.primary} size="large" /></View>
  );

  return (
    <View style={s.container}>
      <Blobs />
      <View style={s.topRow}>
        <View>
          <Text style={s.title}>Motivation</Text>
          <Text style={s.subtitle}>
            {videos ? `${list.length} video${list.length === 1 ? '' : 's'}` : ' '}
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setAdding(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>Add video</Text>
        </TouchableOpacity>
      </View>

      {videos && list.length === 0 && (
        <View style={s.empty}>
          <Image source={mascots.bear} style={s.emptyImg} />
          <Text style={s.emptyTitle}>No videos yet</Text>
          <Text style={s.emptySub}>Tap "Add video" and paste TikTok links{'\n'}that make you want to study.</Text>
        </View>
      )}

      {!!current && (
        <>
          <View style={s.player}>
            {!full && <Pager list={list} index={safeIndex} onIndex={setIndex} apiRef={apiRef} onMessage={onSwipe} />}
          </View>

          <View style={s.controls}>
            <TouchableOpacity style={[s.ctrl, shadow]} onPress={() => setFull(true)} activeOpacity={0.8}>
              <Ionicons name="expand" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctrl, shadow]} onPress={prev} activeOpacity={0.8}>
              <Ionicons name="chevron-up" size={24} color={colors.primary} />
            </TouchableOpacity>
            <View style={s.counter}>
              <Text style={s.counterText}>{safeIndex + 1} / {list.length}</Text>
              <Text style={s.swipeHint}>Swipe up for next</Text>
            </View>
            <TouchableOpacity style={[s.ctrl, s.ctrlMain]} onPress={next} activeOpacity={0.8}>
              <Ionicons name="chevron-down" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctrl, shadow]} onPress={removeCurrent} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </>
      )}

      <Modal visible={full} animationType="fade" statusBarTranslucent onRequestClose={() => setFull(false)}>
        <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {full && !!current && (
            <Pager fill={fillMode} list={list} index={safeIndex} onIndex={setIndex} apiRef={apiRef} onMessage={onSwipe} />
          )}
          <TouchableOpacity style={[s.fullClose, { top: insets.top + 6 }]} onPress={() => setFull(false)} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[s.fullFill, { top: insets.top + 6 }]} onPress={() => setFillMode((f) => !f)} activeOpacity={0.8}>
            <Ionicons name={fillMode ? 'contract' : 'expand'} size={16} color="#fff" />
            <Text style={s.fullFillText}>{fillMode ? 'Fit' : 'Fill'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <View style={s.backdrop}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>Add videos</Text>
            <Text style={s.dialogHint}>In TikTok tap Share, then Copy link, and paste it here. You can paste many links at once, one per line. YouTube Shorts links work too.</Text>
            <TextInput
              style={[s.input, { height: 110, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Paste the links here"
              value={link}
              onChangeText={setLink}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              autoFocus
            />
            <View style={s.dialogButtons}>
              <TouchableOpacity style={s.cancel} onPress={() => { setAdding(false); setLink(''); }}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.create} onPress={addVideos} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.createText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.sub, marginTop: 2, fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, height: 42, paddingHorizontal: 14 },
  addBtnText: { color: '#fff', fontWeight: '800', marginLeft: 3 },
  seg: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 4, marginBottom: 14 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segOn: { backgroundColor: colors.primary },
  segText: { fontWeight: '800', color: colors.sub },
  segTextOn: { color: '#fff' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyImg: { width: 140, height: 140, borderRadius: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 16 },
  emptySub: { color: colors.sub, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  player: { flex: 1, backgroundColor: '#000' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  ctrl: { height: 48, minWidth: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  ctrlMain: { backgroundColor: colors.primary },
  nextText: { color: '#fff', fontWeight: '800', marginLeft: 4 },
  counter: { alignItems: 'center', paddingHorizontal: 6 },
  counterText: { fontWeight: '800', color: colors.text },
  swipeHint: { fontSize: 10, color: colors.sub, marginTop: 2, fontWeight: '600' },
  fullFill: { position: 'absolute', right: 14, height: 42, paddingHorizontal: 14, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', alignItems: 'center' },
  fullFillText: { color: '#fff', fontWeight: '800', marginLeft: 6 },
  fullClose: { position: 'absolute', left: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  diagBtn: { marginTop: 6, backgroundColor: '#FFE3EA', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  diagText: { fontSize: 11, fontWeight: '800', color: '#D6456B' },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,35,64,0.45)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#fff', borderRadius: 24, padding: 20 },
  dialogTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  dialogHint: { color: colors.sub, marginTop: 6, marginBottom: 12, lineHeight: 19, fontSize: 13 },
  input: { backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 14, height: 48, fontSize: 15, borderWidth: 1, borderColor: colors.line },
  dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancel: { paddingVertical: 12, paddingHorizontal: 18 },
  cancelText: { color: colors.sub, fontWeight: '700' },
  create: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 26, borderRadius: 14, minWidth: 80, alignItems: 'center' },
  createText: { color: '#fff', fontWeight: '800' },
});
