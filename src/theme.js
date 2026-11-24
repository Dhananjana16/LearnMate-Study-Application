// Colours and shared styles for the whole app.
export const colors = {
  primary: '#2E5BFF',
  blue: '#7FB3FF',
  mint: '#A7E3C0',
  yellow: '#F7D97B',
  lavender: '#D9D0F7',
  bg: '#FFF6EE',
  card: '#FFFFFF',
  text: '#1F2340',
  sub: '#6B7194',
  line: '#E8E9F3',
  danger: '#E5484D',
  success: '#22A06B',
};

// Soft background + strong colour pairs, used for subjects and folders.
export const tints = [
  { bg: '#E3EDFF', fg: '#2E5BFF' }, // blue
  { bg: '#FFF1C7', fg: '#C48A00' }, // yellow
  { bg: '#DDF5E8', fg: '#1E9E63' }, // green
  { bg: '#E9E4FB', fg: '#6B52D6' }, // purple
  { bg: '#FFE3EA', fg: '#D6456B' }, // pink
  { bg: '#DDF3F7', fg: '#1893A8' }, // teal
];

export const shadow = {
  shadowColor: '#2E3A8C',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
  return h;
}

// A steady colour for each subject, so "Maths" is always the same colour.
export function subjectTint(subject) {
  return tints[hash(subject.name.toLowerCase()) % tints.length];
}

// Picks an icon from the subject name.
export function subjectIcon(name) {
  const n = name.toLowerCase();
  if (/(math|calc|algebra|stat)/.test(n)) return 'calculator';
  if (/(phys)/.test(n)) return 'planet';
  if (/(chem)/.test(n)) return 'flask';
  if (/(bio|life|botany|zoo)/.test(n)) return 'leaf';
  if (/(engl|lang|liter|sinh|tamil)/.test(n)) return 'book';
  if (/(ict|comput|program|software|code|it |^it$|data|web)/.test(n)) return 'laptop';
  if (/(hist|politic|social)/.test(n)) return 'time-outline';
  if (/(geo|earth|environment)/.test(n)) return 'earth';
  if (/(business|account|econ|manage|market|commerce)/.test(n)) return 'business';
  return 'school';
}
