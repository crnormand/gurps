import { getCssVariable } from './get-css-value.js'

/**
 * Determine the luminescence of the provided background color, and return either a light or dark foreground color to
 * contrast with it.
 *
 * @param {string} backgroundHex - The background color as a 6-digit hex string (e.g., '#ff0000' for red).
 * @param {string} darkColor - The color to use for dark foreground elements.
 * @param {string} lightColor - The color to use for light foreground elements.
 * @returns {string} - The appropriate foreground color based on the background color's luminescence.
 */
export function contrastColor(backgroundHex: string, darkColor?: string, lightColor?: string): string {
  // If darkColor is not provided, attempt to get it from CSS variable, falling back to a default if necessary.
  // Do the same for lightColor.
  darkColor = darkColor || getCssVariable(document.body, '--ms-dark-text', '#1c1a17')
  lightColor = lightColor || getCssVariable(document.body, '--ms-light-text', '#f8f6f2')

  if (!backgroundHex || !/^#[0-9A-Fa-f]{6}$/.test(backgroundHex)) {
    console.warn(
      `Invalid background color provided to constrastColor: ${backgroundHex}. Falling back to default colors.`
    )

    return darkColor
  }

  const rgb = backgroundHex
    .replace(/^#/, '') // Remove the leading '#' if present.
    .match(/.{2}/g)! // Split the hex string into pairs of char (R, G, B).
    .map(pair => parseInt(pair, 16) / 255)

  const [red, green, blue] = rgb.map(channel =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  )
  const luminescence = 0.2126 * red + 0.7152 * green + 0.0722 * blue

  return luminescence > 0.2 ? darkColor : lightColor
}
