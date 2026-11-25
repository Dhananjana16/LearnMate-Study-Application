// Tidies text taken from a PDF: joins words split across lines and removes extra blank space.
export function tidyText(t) {
  return (t || '')
    .replace(/-\n/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
