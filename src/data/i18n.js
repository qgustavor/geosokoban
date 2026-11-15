import countries from './countries.json' with { type: 'json' }
import messages from './messages.json' with { type: 'json' }

export { messages }

export function countryName (code, locale) {
  return countries[code]?.names[locale] ?? countries[code]?.names.en ?? code
}

export function translate (locale, key, params = {}) {
  let text = messages[locale]?.[key] ?? messages.en[key] ?? key
  for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value))
  return text
}
