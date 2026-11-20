import countries from './story-countries.json' with { type: 'json' }
import relations from './relations.json' with { type: 'json' }
import { translate, countryName } from '../data/i18n.js'

export function countryClue (country, locale) {
  const relation = relations[country]
  if (!relation) return translate(locale, 'findCountry', { country: countryName(country, locale) })

  const direction = 'geo' + relation[0][0].toUpperCase() + relation[0].slice(1)
  return translate(locale, 'relation', {
    country: countryName(country, locale),
    direction: translate(locale, direction),
    other: countryName(relation[1], locale)
  })
}

export function countryCulture (country, locale) {
  const entry = countries[country]
  return entry?.culture[locale] ?? entry?.culture.en ?? ''
}

export function storyCountryGuide (country, locale) {
  return [countryClue(country, locale), countryCulture(country, locale)].filter(Boolean).join(' ')
}
