export function stripQuotes(text: string): string {
  // Remove quotes around name, if any.
  if (text[0] === '"' && text[text.length - 1] === '"') {
    text = text.slice(1, -1)
  } else if (text[0] === "'" && text[text.length - 1] === "'") {
    text = text.slice(1, -1)
  }
  return text
}
