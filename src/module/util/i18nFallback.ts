export function i18nFallback(key: string, fallback: string): string {
  if (!game.i18n) throw new Error('GURPS | i18nFallback: game.i18n is not available.')

  const translation = game.i18n.localize(key)

  return translation === key ? fallback : translation
}
