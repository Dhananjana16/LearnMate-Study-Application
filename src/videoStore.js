import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'motivation_videos';

export async function getVideos() {
  const v = await AsyncStorage.getItem(KEY);
  return v ? JSON.parse(v) : [];
}

export async function saveVideos(list) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

// Finds the video in a TikTok or YouTube link. Returns { kind, vid } or null.
export function extractVideo(url) {
  const t = (url || '').trim();
  let m = t.match(/tiktok\.com\/.*?video\/(\d+)/i);
  if (m) return { kind: 'tiktok', vid: m[1] };
  m = t.match(/(?:youtube\.com\/(?:shorts|embed)\/|youtu\.be\/|[?&]v=)([\w-]{11})/i);
  if (m) return { kind: 'youtube', vid: m[1] };
  return null;
}

// Turns a pasted link into a saved video. Short TikTok links (vm.tiktok.com/...)
// are opened once to find the real video number. Returns null if it can't.
export async function resolveLink(url) {
  const link = (url || '').trim();
  if (!link) return null;
  let found = extractVideo(link);
  if (!found && /tiktok\.com/i.test(link)) {
    try {
      const res = await fetch(link, { redirect: 'follow' });
      found = extractVideo(res.url || '');
      if (!found) {
        const text = await res.text();
        const m = text.match(/tiktok\.com\/@[\w.\-]+\/video\/(\d+)/i);
        if (m) found = { kind: 'tiktok', vid: m[1] };
      }
    } catch (e) {
      found = null;
    }
  }
  if (!found) return null;
  return { id: Date.now().toString(), kind: found.kind, vid: found.vid, url: link };
}

export function embedUrl(v) {
  if (v.kind === 'youtube') {
    return `https://www.youtube.com/embed/${v.vid}?playsinline=1&autoplay=1&rel=0`;
  }
  return `https://www.tiktok.com/embed/v2/${v.vid}`;
}
