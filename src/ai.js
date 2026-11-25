// Turns study notes into flashcards and multiple-choice questions.
// Works with a free Google Gemini key (starts with AIza) or an Anthropic Claude key (starts with sk-ant).
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-5-5';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function buildPrompt(text) {
  return `You are helping a university student study. Below are their study notes.

Write study material using ONLY facts from the notes. Do not invent facts. Skip page numbers, author names and reference lists.
Write in the same language as the notes.

Return exactly this JSON and nothing else (no explanation, no markdown fences):
{
  "flashcards": [ { "q": "question or term", "a": "short clear answer" } ],
  "mcq": [ { "question": "...", "options": ["...", "...", "...", "..."], "answer": 0, "explanation": "one sentence why" } ]
}

Rules:
- 10 flashcards and 10 multiple-choice questions.
- Each multiple-choice question has exactly 4 options. "answer" is the index (0 to 3) of the correct option.
- Spread the correct answer position across the questions.
- Wrong options must be believable but clearly wrong according to the notes.
- Cover the most important ideas in the notes.

NOTES:
"""
${text}
"""`;
}

// Finds the JSON object inside the reply, even if the model wrapped it in extra text.
export function parseStudySet(reply) {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The AI reply was not in the expected format. Try again.');
  const data = JSON.parse(reply.slice(start, end + 1));

  const flashcards = (Array.isArray(data.flashcards) ? data.flashcards : [])
    .filter((c) => c && typeof c.q === 'string' && typeof c.a === 'string' && c.q.trim() && c.a.trim())
    .map((c) => ({ q: c.q.trim(), a: c.a.trim() }));

  const mcq = (Array.isArray(data.mcq) ? data.mcq : [])
    .filter(
      (m) =>
        m &&
        typeof m.question === 'string' &&
        Array.isArray(m.options) &&
        m.options.length === 4 &&
        m.options.every((o) => typeof o === 'string') &&
        Number.isInteger(m.answer) &&
        m.answer >= 0 &&
        m.answer < 4
    )
    .map((m) => ({
      question: m.question.trim(),
      options: m.options.map((o) => o.trim()),
      answer: m.answer,
      explanation: typeof m.explanation === 'string' ? m.explanation.trim() : '',
    }));

  if (!flashcards.length && !mcq.length) throw new Error('The AI did not return any questions. Try again.');
  return { flashcards, mcq, createdAt: Date.now() };
}

async function readJson(res) {
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

function errorText(data, status) {
  return data && data.error && data.error.message ? data.error.message : `Request failed (${status})`;
}

// ----- Claude (paid key) -----
async function callClaude(prompt, apiKey) {
  const res = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2026-10-21',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await readJson(res);
  if (!res.ok) {
    if (res.status === 401) throw new Error('The AI key is not valid. Check it in Settings.');
    throw new Error(errorText(data, res.status));
  }
  return ((data && data.content) || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

// ----- Gemini (free key) -----
// Google changes model names often, so ask which ones this key can use and pick the best Flash model.
export function pickGeminiModels(list) {
  const bad = /(image|tts|audio|live|embed|robotics|computer|imagen|veo|lyria|vision|aqa)/i;
  const candidates = [];
  for (const m of list || []) {
    const name = String(m.name || '').replace(/^models\//, '');
    const methods = m.supportedGenerationMethods || [];
    const match = name.match(/^gemini-(\d+(?:\.\d+)?)-flash(-lite)?(-preview)?/i);
    if (!match || bad.test(name) || !methods.includes('generateContent')) continue;
    candidates.push({
      name,
      version: parseFloat(match[1]),
      lite: !!match[2],
      preview: !!match[3] || /preview|exp/i.test(name),
    });
  }
  candidates.sort(
    (a, b) => a.preview - b.preview || b.version - a.version || a.lite - b.lite || a.name.localeCompare(b.name)
  );
  return candidates.map((c) => c.name);
}

async function callGemini(prompt, apiKey) {
  const headers = { 'content-type': 'application/json', 'x-goog-api-key': apiKey };

  const listRes = await fetch(`${GEMINI_BASE}/models?pageSize=200`, { headers });
  const listData = await readJson(listRes);
  if (!listRes.ok) {
    const msg = errorText(listData, listRes.status);
    if (/api key/i.test(msg) || listRes.status === 400 || listRes.status === 401 || listRes.status === 403) {
      throw new Error('The AI key was not accepted. Check it in Settings. (' + msg + ')');
    }
    throw new Error(msg);
  }
  const models = pickGeminiModels(listData && listData.models).slice(0, 4);
  if (!models.length) throw new Error('This key has no Gemini Flash model available.');

  let lastError = 'No model worked.';
  let lastStatus = 0;
  for (const model of models) {
    // Busy errors are often short, so try each model twice before moving on.
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8000 },
        }),
      });
      const data = await readJson(res);
      if (res.ok) {
        const parts =
          (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
        return parts.filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('');
      }
      lastError = errorText(data, res.status);
      lastStatus = res.status;
      if (res.status === 500 || res.status === 503) {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 2500));
        continue; // retry once, then fall through to the next model
      }
      break; // other errors: go to the next model
    }
  }
  if (lastStatus === 503 || lastStatus === 500) {
    throw new Error("Google's free AI is busy right now. Wait a minute or two and tap 🧠 again.");
  }
  if (lastStatus === 429) {
    throw new Error('The free limit was reached. Wait a minute and try again. (' + lastError + ')');
  }
  throw new Error(lastError);
}

async function callAI(prompt, apiKey) {
  const key = (apiKey || '').trim();
  if (key.startsWith('sk-ant')) return callClaude(prompt, key);
  return callGemini(prompt, key);
}

export async function generateStudySet(text, apiKey) {
  return parseStudySet(await callAI(buildPrompt(text), apiKey));
}

// ----- questions in the style of past papers -----
function buildPaperPrompt(notes, papers) {
  const paperText = papers.map((p, i) => `--- Past paper ${i + 1} (${p.name}) ---\n${p.text}`).join('\n\n');
  return `You are helping a university student prepare for exams.

Below are PAST PAPERS and the student's STUDY NOTES for one subject (the notes come from several files).
Write a NEW model paper about the content of the STUDY NOTES, in the same style as the PAST PAPERS: the same question types, wording, command words (such as "Explain", "Discuss", "Identify"), difficulty and typical marks. Do not copy any past-paper question. Use only facts that appear in the notes for the answers.
Write in the same language as the past papers.

Return exactly this JSON and nothing else (no explanation, no markdown fences):
{ "questions": [ { "question": "full question text", "type": "short answer, structured, essay, mcq or calculation", "marks": 5, "answer": "a model answer", "points": ["key marking point", "another marking point"] } ] }

Rules:
- 10 questions, ordered from easier to harder, like a real paper.
- Spread the questions across the different topics found in the notes.
- If the past papers show marks, use similar marks. Otherwise "marks" may be null.
- If a question is multiple choice, put the options inside the question text and name the correct option in the answer.
- "points" lists what a marker would look for.

PAST PAPERS:
"""
${paperText}
"""

STUDY NOTES:
"""
${notes}
"""`;
}

export function parsePaperSet(reply) {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The AI reply was not in the expected format. Try again.');
  const data = JSON.parse(reply.slice(start, end + 1));
  const questions = (Array.isArray(data.questions) ? data.questions : [])
    .filter((q) => q && typeof q.question === 'string' && q.question.trim())
    .map((q) => ({
      question: q.question.trim(),
      type: typeof q.type === 'string' ? q.type.trim() : '',
      marks: Number.isFinite(q.marks) ? q.marks : null,
      answer: typeof q.answer === 'string' ? q.answer.trim() : '',
      points: Array.isArray(q.points) ? q.points.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : [],
    }));
  if (!questions.length) throw new Error('The AI did not return any questions. Try again.');
  return { questions, createdAt: Date.now() };
}

export async function generatePaperQuestions(notes, papers, apiKey) {
  return parsePaperSet(await callAI(buildPaperPrompt(notes, papers), apiKey));
}
