import { storyIndex, storyStop, STORY_TOURS } from './regions.js'
import { translate } from '../data/i18n.js'

// Prototype names and dialogue are deliberately kept here, not inside components.
// A portrait can be a URL in public/ or an imported asset; expressions select its key.
export const STORY_CHARACTERS = {
  globe: {
    name: { en: 'Globe', 'pt-BR': 'Globo', es: 'Globo' },
    side: 'left',
    art: 'globe',
    portraits: {}
  },
  unknown: {
    name: { en: 'Unknown visitor', 'pt-BR': 'Visitante misterioso', es: 'Visitante misterioso' },
    side: 'right',
    art: 'mystery',
    portraits: {}
  },
  visitor: {
    name: { en: 'Visitor', 'pt-BR': 'Visitante', es: 'Visitante' },
    side: 'right',
    art: 'spark',
    portraits: {}
  }
}

const text = (en, pt, es) => ({ en, 'pt-BR': pt, es })
const globe = (en, pt, es) => ({ speaker: 'globe', text: text(en, pt, es) })

// Keys are "tour:region". Missing before scenes use the region briefing below;
// missing after scenes are silent. An explicit { lines: [] } disables a scene.
// Add or replace any of the 21 stops without touching routing or game logic.
export const STORY_SCENES = {
  '1:SA': {
    before: {
      lines: [
        globe(
          'The flags are all out of place! Someone has been travelling ahead of us. Let’s follow the trail.',
          'As bandeiras estão fora do lugar! Alguém passou por aqui antes de nós. Vamos seguir as pistas.',
          '¡Las banderas están fuera de lugar! Alguien ha pasado por aquí antes que nosotros. Sigamos las pistas.'
        ),
        globe(
          'Walk behind a flag to push it home. We can push, but never pull. Undo is always there if we need it.',
          'Vá para trás de uma bandeira para empurrá-la até seu destino. Não podemos puxar. ' +
          'Podemos desfazer uma jogada.',
          'Ponte detrás de una bandera para empujarla a su destino. No podemos tirar. ' +
          'Siempre podemos deshacer una jugada.'
        ),
        globe(
          'We’ll visit every region, then circle the world again. Ready for our first journey?',
          'Vamos visitar todas as regiões e depois dar outra volta ao mundo. Pronto para a primeira viagem?',
          'Visitaremos todas las regiones y después daremos otra vuelta al mundo. ¿Listos para el primer viaje?'
        )
      ]
    },
    after: {
      lines: [globe(
        'The flags are back home! The trail goes north. Let’s see what happened there.',
        'As bandeiras estão de volta ao lugar! As pistas seguem para o norte. Vamos ver o que aconteceu por lá.',
        '¡Las banderas están de vuelta a casa! Las pistas siguen hacia el norte. Veamos qué pasó allí.'
      )]
    }
  },
  '1:OC': {
    after: {
      lines: [globe(
        'Our first trip around the world is complete! But fresh tracks lead back to South America. ' +
        'Who is moving the flags?',
        'Completamos a primeira volta ao mundo! Mas novas pegadas levam à América do Sul. ' +
        'Quem está movendo as bandeiras?',
        '¡Completamos la primera vuelta al mundo! Pero hay nuevas huellas hacia Sudamérica. ¿Quién mueve las banderas?'
      )]
    }
  },
  '2:SA': {
    before: {
      lines: [globe(
        'Back where we started, with a new puzzle! This time, let’s look for clues as well as routes.',
        'Voltamos ao começo, com um novo desafio! Desta vez, vamos procurar pistas e caminhos.',
        '¡Volvemos al comienzo, con un nuevo desafío! Esta vez busquemos pistas además de caminos.'
      )]
    }
  },
  '2:AF': {
    after: {
      lines: [globe(
        'A little note says “I was trying to help.” Perhaps our mystery visitor isn’t an enemy after all.',
        'Um bilhete diz: “Eu estava tentando ajudar.” Talvez nosso visitante misterioso não seja um inimigo.',
        'Una nota dice: «Intentaba ayudar». Quizá nuestro visitante misterioso no sea un enemigo.'
      )]
    }
  },
  '2:OC': {
    after: {
      cast: ['globe', 'unknown'],
      lines: [
        { speaker: 'unknown', text: text(
          'Oh no… I’ve mixed them up again. I thought I had it right this time!',
          'Ah, não… Misturei tudo de novo. Achei que desta vez tinha acertado!',
          'Ay, no… Las he mezclado otra vez. ¡Pensé que esta vez lo había hecho bien!'
        ) },
        globe(
          'Someone is just ahead! One more trip around the world. Maybe we can help each other.',
          'Tem alguém logo adiante! Mais uma volta ao mundo. Talvez possamos nos ajudar.',
          '¡Hay alguien más adelante! Una vuelta más al mundo. Quizá podamos ayudarnos.'
        )
      ]
    }
  },
  '3:SA': {
    before: {
      lines: [globe(
        'Our third journey begins. Let’s put the flags back and find our visitor. ' +
        'Everyone needs a little help sometimes.',
        'Nossa terceira viagem começa. Vamos arrumar as bandeiras e encontrar o visitante. ' +
        'Todos precisam de ajuda às vezes.',
        'Empieza nuestro tercer viaje. Arreglemos las banderas y encontremos al visitante. ' +
        'Todos necesitamos ayuda a veces.'
      )]
    }
  },
  '3:OC': {
    after: {
      cast: ['globe', 'visitor'],
      lines: [
        { speaker: 'visitor', text: text(
          'It was me. I wanted to put the flags in the right places, but I kept getting turned around. I’m sorry.',
          'Fui eu. Queria colocar as bandeiras nos lugares certos, mas me atrapalhei. Desculpa.',
          'Fui yo. Quería poner las banderas en sus lugares, pero me confundí. Lo siento.'
        ) },
        globe(
          'Thanks for telling us. We’ve learned a lot on these three journeys. We can show you!',
          'Obrigado por contar. Aprendemos muito nestas três viagens. Podemos te mostrar!',
          'Gracias por contárnoslo. Aprendimos mucho en estos tres viajes. ¡Podemos enseñarte!'
        ),
        { speaker: 'visitor', text: text(
          'Could I come along next time? I’ll ask before moving anything.',
          'Posso ir junto da próxima vez? Vou perguntar antes de mover qualquer coisa.',
          '¿Puedo ir con ustedes la próxima vez? Preguntaré antes de mover nada.'
        ) },
        globe(
          'Of course. The world is more fun to explore with a friend.',
          'Claro. Explorar o mundo é mais divertido com um amigo.',
          'Claro. Explorar el mundo es más divertido con un amigo.'
        )
      ]
    }
  }
}

export function localizedStoryText (value, locale, params = {}) {
  let result = typeof value === 'string' ? value : value?.[locale] ?? value?.en ?? ''

  for (const [key, replacement] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, String(replacement))
  }

  return result
}

export function getStoryScene (code, phase, locale) {
  const chapter = storyStop(storyIndex(code))
  if (!chapter || !['before', 'after'].includes(phase)) return null

  const slot = `${chapter.tour}:${chapter.region.id}`
  const authored = STORY_SCENES[slot]?.[phase]
  const fallback = phase === 'before'
    ? { lines: [{ speaker: 'globe', text: translate(locale, `story${chapter.region.id}`) }] }
    : { lines: [] }
  const definition = authored ?? fallback
  if (!definition.lines.length) return null

  const params = {
    region: translate(locale, chapter.region.name),
    tour: chapter.tour,
    stop: chapter.stop
  }
  const lines = definition.lines.map(line => ({
    ...line,
    text: localizedStoryText(line.text, locale, params)
  }))
  const cast = definition.cast ?? [...new Set(lines.map(line => line.speaker))]
  const characters = Object.fromEntries(cast.map(id => {
    const character = STORY_CHARACTERS[id]
    if (!character) throw new Error(`Unknown story character: ${id}`)

    return [id, { ...character, name: localizedStoryText(character.name, locale) }]
  }))

  return {
    id: `${slot}:${phase}`,
    code,
    phase,
    title: translate(locale, 'worldTour', { n: chapter.tour, total: STORY_TOURS }),
    region: params.region,
    characters,
    lines
  }
}
