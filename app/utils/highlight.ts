export interface TextPart {
  text: string
  match: boolean
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// splits text into parts so matches can be wrapped in <mark> without v-html
export function highlight(text: string, query: string): TextPart[] {
  const words = [...new Set(
    query.toLowerCase().split(/\s+/).map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(w => w.length >= 2),
  )]
  if (!words.length) return [{ text, match: false }]

  // longest first, so "homevault" wins over "home"
  const pattern = new RegExp(`(${words.sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})`, 'gi')
  // split() with a capture group returns [text, match, text, match, ...]
  return text.split(pattern)
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))
    .filter(part => part.text !== '')
}
