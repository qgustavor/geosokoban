import { storyIndex, storyStop, STORY_TOURS } from './regions.js'
import { storyLevel } from './story.js'
import facts from './story-facts.json' with { type: 'json' }
import { translate } from '../data/i18n.js'

const text = (en, pt, es) => ({ en, 'pt-BR': pt, es })
const globe = (en, pt, es, stage) => ({ speaker: 'globe', text: text(en, pt, es), stage })
const compass = (en, pt, es, stage) => ({ speaker: 'compass', text: text(en, pt, es), stage })

const STORY_CHARACTERS = {
  globe: {
    name: text('Little Globe', 'Globinho', 'Globito'),
    side: 'left',
    art: 'globe'
  },
  silhouette: { side: 'right', art: 'silhouette' },
  compass: {
    name: text('Compass', 'Bússola', 'Brújula'),
    side: 'right',
    art: 'compass'
  }
}

const alone = { globe: 'neutral' }
const sighting = { globe: 'neutral', silhouette: 'running' }
const magnetized = { globe: 'neutral', compass: 'magnetized' }
const relieved = { globe: 'neutral', compass: 'relieved' }
const friends = { globe: 'neutral', compass: 'friendly' }

// Each stage replaces the visible cast and stays in effect until another is supplied.
// Scenes are keyed by tour:region; levels remain independently editable in Tiled.
const STORY_SCENES = {
  '1:SA': {
    before: {
      lines: [
        globe(
          'Oh! These flags are in the wrong places. It looks like flags have been mixed up all around the world!',
          'Oh! Estas bandeiras estão nos lugares errados. Parece que misturaram bandeiras pelo mundo inteiro!',
          '¡Oh! Estas banderas están en los lugares equivocados. ¡Parece que mezclaron banderas por todo el mundo!'
        ),
        globe(
          'I’m Little Globe. Will you help me put them back? We can travel together and learn about each country.',
          'Sou o Globinho. Você me ajuda a arrumá-las? Podemos viajar juntos e aprender sobre cada país.',
          'Soy Globito. ¿Me ayudas a ordenarlas? Podemos viajar juntos y aprender sobre cada país.'
        ),
        globe(
          'Push each flag to the matching destination. We can push, but not pull. ' +
          'Take your time—we can always undo a move.',
          'Empurre cada bandeira até o destino com a mesma bandeira. Podemos empurrar, mas não puxar. ' +
          'Sem pressa: sempre podemos desfazer uma jogada.',
          'Empuja cada bandera hasta el destino con la misma bandera. Podemos empujar, pero no tirar. ' +
          'Sin prisa: siempre podemos deshacer un movimiento.'
        )
      ]
    },
    after: {
      lines: [globe(
        'Our first flags are home! Let’s head north and help with the next ones.',
        'Nossas primeiras bandeiras estão no lugar! Vamos para o norte ajudar com as próximas.',
        '¡Nuestras primeras banderas están en su sitio! Vayamos al norte para ayudar con las siguientes.'
      )]
    }
  },
  '1:OC': {
    after: {
      lines: [globe(
        'We’ve been all around the world! Let’s return to South America, where our journey began.',
        'Demos a volta ao mundo! Vamos voltar à América do Sul, onde nossa viagem começou.',
        '¡Dimos la vuelta al mundo! Volvamos a Sudamérica, donde empezó nuestro viaje.'
      )]
    }
  },
  '2:SA': {
    before: {
      lines: [
        globe(
          'We’re back! Wait… these flags are mixed up again. We just put them in the right places!',
          'Voltamos! Espere… estas bandeiras estão misturadas de novo. Acabamos de colocá-las nos lugares certos!',
          '¡Volvimos! Espera… estas banderas están mezcladas otra vez. ¡Acabamos de ponerlas en su sitio!'
        ),
        globe(
          'Look! A little round shadow is running away in the distance. It’s too far away to see who it is.',
          'Olhe! Uma pequena sombra redonda está correndo ao longe. Está longe demais para ver quem é.',
          '¡Mira! Una pequeña sombra redonda corre a lo lejos. Está demasiado lejos para ver quién es.',
          sighting
        ),
        globe(
          'And the destinations all show “?” now! Let’s use what we remember about the countries. ' +
          'We can still ask for help.',
          'E agora todos os destinos mostram “?”! Vamos usar o que lembramos sobre os países. ' +
          'Ainda podemos pedir ajuda.',
          '¡Y ahora todos los destinos muestran “?”! Usemos lo que recordamos de los países. ' +
          'Todavía podemos pedir ayuda.',
          alone
        ),
        globe(
          'Another trip around the world, together. Let’s get these flags home again!',
          'Outra volta ao mundo, juntos. Vamos colocar estas bandeiras no lugar de novo!',
          'Otra vuelta al mundo, juntos. ¡Pongamos estas banderas en su sitio otra vez!'
        )
      ]
    }
  },
  '2:OC': {
    after: {
      lines: [globe(
        'That’s our second trip complete! Let’s go back to the starting point and see how things look.',
        'Completamos nossa segunda volta! Vamos voltar ao ponto de partida e ver como estão as coisas.',
        '¡Completamos nuestra segunda vuelta! Volvamos al punto de partida para ver cómo está todo.'
      )]
    }
  },
  '3:SA': {
    before: {
      lines: [
        globe(
          'Oh no, more flags are out of place! And the destinations still show “?”.',
          'Ah, não, mais bandeiras fora do lugar! E os destinos ainda mostram “?”.',
          '¡Oh, no, hay más banderas fuera de lugar! Y los destinos todavía muestran “?”.'
        ),
        globe(
          'There’s that round shadow again! Who could it be? We still can’t see clearly.',
          'Lá está aquela sombra redonda de novo! Quem será? Ainda não conseguimos ver direito.',
          '¡Ahí está esa sombra redonda otra vez! ¿Quién será? Aún no podemos verla bien.',
          sighting
        ),
        globe(
          'Let’s help with the flags and find out what’s happening. We’ll make this third journey together.',
          'Vamos ajudar com as bandeiras e descobrir o que está acontecendo. Faremos esta terceira viagem juntos.',
          'Ayudemos con las banderas y descubramos qué ocurre. Haremos este tercer viaje juntos.',
          alone
        )
      ]
    }
  },
  '3:OC': {
    after: {
      lines: [
        globe(
          'There you are! You’re a compass! Your needle is turning every which way. What happened?',
          'Aí está você! É uma bússola! Sua agulha está girando para todo lado. O que aconteceu?',
          '¡Ahí estás! ¡Eres una brújula! Tu aguja gira para todos lados. ¿Qué pasó?',
          magnetized
        ),
        compass(
          'I was walking along when I felt something strange. Suddenly I couldn’t tell which way to go!',
          'Eu estava passeando quando senti algo estranho. De repente, não sabia mais para que lado ir!',
          'Estaba paseando cuando sentí algo extraño. ¡De pronto, ya no sabía hacia dónde ir!'
        ),
        compass(
          'I kept turning around and bumping into the flags, again and again. ' +
          'I didn’t mean to move them. I’m sorry!',
          'Eu não parava de dar voltas e esbarrar nas bandeiras, uma vez após outra. ' +
          'Não queria tirá-las do lugar. Desculpem!',
          'No paraba de dar vueltas y chocar con las banderas, una y otra vez. ' +
          'No quería moverlas. ¡Lo siento!'
        ),
        globe(
          'Look, there’s a magnet stuck to your case! That’s what’s confusing your needle.',
          'Olhe, há um ímã grudado em você! É isso que está confundindo sua agulha.',
          '¡Mira, tienes un imán pegado! Eso es lo que está confundiendo tu aguja.'
        ),
        {
          ...globe(
            'We can help. Let’s take that magnet off together!',
            'Podemos ajudar. Vamos tirar esse ímã juntos!',
            'Podemos ayudar. ¡Quitemos ese imán juntos!'
          ),
          action: 'removeMagnet'
        },
        compass(
          'It’s off! My needle has settled. I can find my way again. Thank you both!',
          'Saiu! Minha agulha se acalmou. Consigo me orientar de novo. Valeu pela ajuda!',
          '¡Ya no está! Mi aguja se ha calmado. Puedo orientarme otra vez. ¡Gracias a los dos!',
          relieved
        ),
        globe(
          'You weren’t trying to mix up the flags—you needed help! We’re glad we found you.',
          'Você não queria misturar as bandeiras: precisava de ajuda! Que bom que encontramos você.',
          'No querías mezclar las banderas: ¡necesitabas ayuda! Nos alegra haberte encontrado.'
        ),
        compass(
          'Could I explore with you both? I’d like to learn about the countries too.',
          'Posso explorar com vocês? Também quero aprender sobre os países.',
          '¿Puedo explorar con ustedes? También quiero aprender sobre los países.',
          friends
        ),
        globe(
          'Of course! You, me, and our new friend. The flags are home, and our friendship is just beginning!',
          'Claro! Agora somos três amigos. As bandeiras estão no lugar, e nossa amizade está só começando!',
          '¡Claro! Ahora somos tres amigos. ¡Las banderas están en su sitio y nuestra amistad acaba de empezar!'
        )
      ]
    }
  }
}

function localizedStoryText (value, locale, params = {}) {
  let result = typeof value === 'string' ? value : value?.[locale] ?? value?.en ?? ''

  for (const [key, replacement] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, String(replacement))
  }

  return result
}

function countryCuriosity (code, tour) {
  // Only discuss a flag actually on this authored board. A new country without a fact is simply silent.
  const countries = [...new Set(storyLevel(code)?.goals.map(goal => goal.country) ?? [])]
    .filter(country => facts[country])
  if (!countries.length) return null

  const country = countries[(tour - 1) % countries.length]

  return { speaker: 'globe', text: facts[country], country }
}

export function getStoryScene (code, phase, locale) {
  const chapter = storyStop(storyIndex(code))
  if (!chapter || !['before', 'after'].includes(phase)) return null

  const slot = `${chapter.tour}:${chapter.region.id}`
  const authored = STORY_SCENES[slot]?.[phase]
  // An explicitly empty scene stays silent, including its country curiosity.
  if (authored && !authored.lines.length) return null

  const briefing = phase === 'before'
    ? [{ speaker: 'globe', text: translate(locale, `story${chapter.region.id}`) }]
    : []
  const content = [...(authored?.lines ?? briefing)]
  const curiosity = phase === 'after' ? countryCuriosity(code, chapter.tour) : null
  if (curiosity) content.unshift(curiosity)
  if (!content.length) return null

  const params = {
    region: translate(locale, chapter.region.name),
    tour: chapter.tour,
    stop: chapter.stop
  }
  let stage = alone
  const lines = content.map(line => {
    stage = line.stage ?? stage
    if (!(line.speaker in stage)) throw new Error(`Story speaker is not on stage: ${line.speaker}`)

    return { ...line, stage: { ...stage }, text: localizedStoryText(line.text, locale, params) }
  })
  const cast = [...new Set(lines.flatMap(line => Object.keys(line.stage)))]
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
