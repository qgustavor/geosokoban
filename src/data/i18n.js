import countries from './countries.json' with { type: 'json' }
import messages from './messages.json' with { type: 'json' }

export function countryName (code, locale) {
  // Keep the country code visible when neither a localized nor an English name is available.
  return countries[code]?.names[locale] ?? countries[code]?.names.en ?? code
}

export function translate (locale, key, params = {}) {
  let text = messages[locale]?.[key] ?? messages.en[key] ?? key

  // Replacement order follows the supplied parameters, including placeholders inside earlier replacements.
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, String(value))
  }

  return text
}
