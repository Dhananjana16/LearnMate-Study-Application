// Helpers that make the phone's voice pronounce text more clearly.

// Which language is the text mostly written in? ('en', 'si' Sinhala or 'ta' Tamil)
export function detectLanguage(text) {
  const sinhala = (text.match(/[\u0D80-\u0DFF]/g) || []).length;
  const tamil = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (sinhala > latin * 0.3 && sinhala >= tamil && sinhala > 0) return 'si';
  if (tamil > latin * 0.3 && tamil > 0) return 'ta';
  return 'en';
}

// Options for Speech.speak. The language is always set, because otherwise the phone
// uses its own system language, which may not match the text.
export function speakOptions(text, voiceId, rate) {
  const lang = detectLanguage(text);
  const opts = { rate, pitch: 1 };
  const voiceLang = voiceId && /^[a-z]{2,3}[-_]/i.test(voiceId) ? voiceId.slice(0, 2).toLowerCase() : null;
  if (voiceId && (!voiceLang || voiceLang === lang)) opts.voice = voiceId;
  opts.language = lang;
  return opts;
}

// Removes things that sound bad when read aloud.
export function cleanForSpeech(text) {
  return text
    .replace(/https?:\/\/\S+/g, ' link ')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, ' email address ')
    .replace(/\([^()]*[A-Za-z][^()]*,\s*(19|20)\d{2}[a-z]?[^()]*\)/g, ' ')
    .replace(/\bet al\.?/gi, 'and others')
    .replace(/\be\.g\./gi, 'for example')
    .replace(/\bi\.e\./gi, 'that is')
    .replace(/\bvs\.?(?=\s)/gi, 'versus')
    .replace(/\bFigs?\.\s*/g, 'Figure ')
    .replace(/&/g, ' and ')
    .replace(/%/g, ' percent')
    .replace(/[\u2022\u25CF\u25AA\u2023\u00B7]/g, '. ')
    .replace(/[_*#^~`|<>[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
