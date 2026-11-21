import { storyIndex, storyStop, STORY_TOURS } from './regions.js'
import { storyLevel } from './story.js'
import { storyCountryGuide } from './story-guide.js'
import { translate } from '../data/i18n.js'

const text = (en, pt, es) => ({ en, 'pt-BR': pt, es })
const globe = (en, pt, es) => ({ speaker: 'globe', text: text(en, pt, es) })
const pip = (en, pt, es) => ({ speaker: 'pip', text: text(en, pt, es) })

export const STORY_CHARACTERS = {
  globe: {
    name: text('Globe', 'Globo', 'Globo'),
    side: 'left',
    art: 'globe',
    portraits: {}
  },
  pip: {
    name: text('Pip', 'Pip', 'Pip'),
    side: 'right',
    art: 'compass',
    portraits: {}
  }
}

// Pip has no portrait, voice, name or silhouette in any earlier scene.
// The three tours teach one new idea at a time; country notes follow the active board's flags.
export const STORY_SCENES = {
  '1:SA': {
    before: {
      lines: [
        globe(
          'Hello! I’m Globe. Someone has moved the flags away from their countries! Let’s put them back and find out what happened.',
          'Olá! Sou o Globo. Alguém tirou as bandeiras de seus países! Vamos colocá-las de volta e descobrir o que aconteceu.',
          '¡Hola! Soy Globo. ¡Alguien ha alejado las banderas de sus países! Vamos a devolverlas y descubrir qué pasó.'
        ),
        globe(
          'First, just one flag. Walk behind it and push it onto the matching destination. We can push flags, but we cannot pull them.',
          'Primeiro, só uma bandeira. Vá para trás dela e empurre até o destino com a mesma bandeira. Podemos empurrar, mas não puxar.',
          'Primero, una sola bandera. Ponte detrás y empújala hasta el destino con la misma bandera. Podemos empujar, pero no tirar.'
        ),
        globe(
          'Use the arrow keys or swipe to walk. There is no hurry. Undo lets us try a move again, and Restart gives us a fresh start.',
          'Use as setas ou deslize o dedo para andar. Sem pressa. Desfazer permite tentar outra jogada, e Reiniciar começa de novo.',
          'Usa las flechas o desliza el dedo para caminar. Sin prisa. Deshacer permite probar otra jugada, y Reiniciar empieza de nuevo.'
        )
      ]
    },
    after: {
      lines: [globe(
        'One flag home! There are more misplaced flags to the north. Let’s help, one stop at a time.',
        'Uma bandeira no lugar! Há mais bandeiras fora do lugar ao norte. Vamos ajudar, uma parada de cada vez.',
        '¡Una bandera en su lugar! Hay más banderas descolocadas al norte. Ayudemos, una parada a la vez.'
      )]
    }
  },
  '1:NA': {
    before: {
      lines: [
        globe(
          'Our next stop is North America. Another flag has wandered away. Whoever moved it has already gone ahead.',
          'Nossa próxima parada é a América do Norte. Outra bandeira saiu do lugar. Quem a moveu já seguiu adiante.',
          'Nuestra próxima parada es Norteamérica. Otra bandera está fuera de lugar. Quien la movió ya siguió adelante.'
        ),
        globe(
          'This flag needs a little more pushing. Stay behind it until it reaches its matching destination.',
          'Esta bandeira precisa de mais um empurrão. Fique atrás dela até chegar ao destino com a mesma bandeira.',
          'Esta bandera necesita un poco más de empuje. Quédate detrás hasta llegar al destino con la misma bandera.'
        )
      ]
    }
  },
  '1:EE': {
    before: {
      lines: [
        globe(
          'Two flags this time! Someone has been busy in Eastern Europe, too. Let’s return each flag to its own country.',
          'Duas bandeiras desta vez! Alguém também andou ocupado no Leste Europeu. Vamos devolver cada bandeira ao seu país.',
          '¡Dos banderas esta vez! Alguien también ha estado ocupado en Europa Oriental. Devolvamos cada bandera a su país.'
        ),
        globe(
          'We only move one flag at a time. You can walk around a flag to push it from another side.',
          'Movemos só uma bandeira de cada vez. Você pode dar a volta nela para empurrar de outro lado.',
          'Solo movemos una bandera a la vez. Puedes rodearla para empujar desde otro lado.'
        )
      ]
    }
  },
  '1:WE': {
    before: {
      lines: [
        globe(
          'A small mountain is in our way here in Western Europe. It is part of the landscape, not a wall we can move.',
          'Uma pequena montanha está no caminho aqui no Oeste Europeu. Ela faz parte da paisagem; não podemos movê-la.',
          'Una pequeña montaña está en el camino aquí en Europa Occidental. Forma parte del paisaje; no podemos moverla.'
        ),
        globe(
          'There is room around it. Give the flag a little detour, then walk around to make the next push.',
          'Há espaço ao redor. Faça um pequeno desvio com a bandeira e depois dê a volta para empurrar de novo.',
          'Hay espacio alrededor. Desvía un poco la bandera y luego rodéala para volver a empujar.'
        )
      ]
    }
  },
  '1:AF': {
    before: {
      lines: [
        globe(
          'We’ve reached Africa. More mixed-up flags, and still no sign of who moved them. Let’s keep helping.',
          'Chegamos à África. Mais bandeiras trocadas, e ainda não sabemos quem as moveu. Vamos continuar ajudando.',
          'Llegamos a África. Más banderas descolocadas, y aún no sabemos quién las movió. Sigamos ayudando.'
        ),
        globe(
          'Look for the open ground beside the mountain. Before pushing, check that you can still walk behind the flag.',
          'Procure o terreno livre ao lado da montanha. Antes de empurrar, veja se ainda dá para passar atrás da bandeira.',
          'Busca el terreno libre junto a la montaña. Antes de empujar, comprueba que aún puedes pasar detrás de la bandera.'
        )
      ]
    }
  },
  '1:AS': {
    before: {
      lines: [
        globe(
          'Asia is our next stop. Two little obstacles make the route bend, but we can take it one push at a time.',
          'A Ásia é nossa próxima parada. Dois pequenos obstáculos fazem o caminho virar, mas podemos ir um empurrão de cada vez.',
          'Asia es nuestra próxima parada. Dos pequeños obstáculos hacen girar el camino, pero podemos ir un empujón a la vez.'
        ),
        globe(
          'Leave room to change sides. A flag next to an edge can be tricky to move, so Undo is a useful travelling companion!',
          'Deixe espaço para mudar de lado. Uma bandeira junto à borda pode ser difícil de mover. Desfazer é um bom companheiro de viagem!',
          'Deja espacio para cambiar de lado. Una bandera junto al borde puede ser difícil de mover. ¡Deshacer es un buen compañero de viaje!'
        )
      ]
    }
  },
  '1:OC': {
    before: {
      lines: [
        globe(
          'Oceania! Here we travel on water and deliver flags to docks beside the islands. The dotted lines connect each dock to its country.',
          'Oceania! Aqui viajamos pela água e levamos bandeiras às docas perto das ilhas. As linhas pontilhadas ligam cada doca ao seu país.',
          '¡Oceanía! Aquí viajamos por el agua y llevamos banderas a los muelles junto a las islas. Las líneas de puntos unen cada muelle con su país.'
        ),
        globe(
          'Go around the little reefs, just as we went around mountains. The pushing rules are the same at sea.',
          'Desvie dos pequenos recifes, como fizemos com as montanhas. As regras de empurrar são as mesmas no mar.',
          'Rodea los pequeños arrecifes, como hicimos con las montañas. Las reglas para empujar son iguales en el mar.'
        )
      ]
    },
    after: {
      lines: [globe(
        'Our first world tour is complete! A new bundle of misplaced flags has arrived, and the destination signs have been packed away. Let’s investigate.',
        'Completamos a primeira volta ao mundo! Chegou outro conjunto de bandeiras fora do lugar, e as placas dos destinos foram guardadas. Vamos investigar.',
        '¡Terminamos la primera vuelta al mundo! Llegó otro grupo de banderas descolocadas, y guardaron las señales de los destinos. Investiguemos.'
      )]
    }
  },
  '2:SA': {
    before: {
      lines: [
        globe(
          'The countries are still here, but someone packed away their destination signs! That is why the target markers are hidden on this tour.',
          'Os países continuam aqui, mas alguém guardou suas placas! Por isso os marcadores dos destinos estão escondidos nesta volta.',
          'Los países siguen aquí, ¡pero alguien guardó sus señales! Por eso los marcadores de destino están ocultos en esta vuelta.'
        ),
        globe(
          'I’ll help with country clues. North is up on our map, south is down, east is right and west is left. The routes will stay easy while we explore.',
          'Vou ajudar com pistas dos países. No mapa, norte é para cima, sul para baixo, leste à direita e oeste à esquerda. Os caminhos serão fáceis enquanto exploramos.',
          'Te ayudaré con pistas de los países. En el mapa, norte es arriba, sur abajo, este a la derecha y oeste a la izquierda. Los caminos serán fáciles mientras exploramos.'
        ),
        globe(
          'Tap a flag or open the Travel guide to hear its clue again. Reveal destination shows its exact square whenever you need it. Asking for help is always welcome.',
          'Toque numa bandeira ou abra o Guia de viagem para rever a pista. Revelar destino mostra a casa exata quando precisar. Pedir ajuda é sempre bem-vindo.',
          'Toca una bandera o abre la Guía de viaje para ver otra vez la pista. Revelar destino muestra su casilla exacta cuando la necesites. Pedir ayuda siempre está bien.'
        )
      ]
    }
  },
  '2:NA': {
    before: {
      lines: [globe(
        'Let’s find three neighbours in North America. We can use their positions to help place the flags, and learn about music and traditions along the way.',
        'Vamos encontrar três vizinhos na América do Norte. Suas posições ajudam a colocar as bandeiras, enquanto conhecemos músicas e tradições.',
        'Busquemos tres vecinos en Norteamérica. Sus posiciones nos ayudan a colocar las banderas, mientras conocemos músicas y tradiciones.'
      )]
    }
  },
  '2:EE': {
    before: {
      lines: [globe(
        'Back in Eastern Europe! The signs are still missing, but our country clues can guide us. A tiny detour is all the terrain asks of us.',
        'De volta ao Leste Europeu! As placas ainda faltam, mas as pistas dos países podem nos guiar. O terreno só pede um pequeno desvio.',
        '¡De vuelta en Europa Oriental! Aún faltan las señales, pero las pistas de los países nos pueden guiar. El terreno solo pide un pequeño desvío.'
      )]
    }
  },
  '2:WE': {
    before: {
      lines: [globe(
        'Western Europe has more than one story to tell: bread-making, music and dance. First, let’s use our clues to find the countries.',
        'O Oeste Europeu tem muitas histórias para contar: pães, música e dança. Primeiro, vamos usar as pistas para encontrar os países.',
        'Europa Occidental tiene muchas historias que contar: pan, música y baile. Primero, usemos las pistas para encontrar los países.'
      )]
    }
  },
  '2:AF': {
    before: {
      lines: [globe(
        'Africa is full of different places and traditions. These three flags are only a small part of it. Let’s find their countries together.',
        'A África tem muitos lugares e tradições diferentes. Estas três bandeiras são só uma pequena parte. Vamos encontrar seus países juntos.',
        'África tiene muchos lugares y tradiciones diferentes. Estas tres banderas son solo una pequeña parte. Busquemos sus países juntos.'
      )]
    },
    after: {
      lines: [globe(
        'A note says, “I was trying to help. I put the signs somewhere safe.” Perhaps whoever made the mess needs our help, too.',
        'Um bilhete diz: “Eu queria ajudar. Guardei as placas num lugar seguro.” Talvez quem fez a confusão também precise de ajuda.',
        'Una nota dice: «Quería ayudar. Guardé las señales en un lugar seguro». Quizá quien hizo el lío también necesite ayuda.'
      )]
    }
  },
  '2:AS': {
    before: {
      lines: [globe(
        'In Asia, we’ll use north and south to find these neighbours. Then we can discover patterns made with colour, paper and felt.',
        'Na Ásia, vamos usar norte e sul para encontrar estes vizinhos. Depois conheceremos padrões feitos com cores, papel e feltro.',
        'En Asia, usaremos norte y sur para encontrar a estos vecinos. Después conoceremos diseños hechos con colores, papel y fieltro.'
      )]
    }
  },
  '2:OC': {
    before: {
      lines: [globe(
        'The island docks are hidden too. Look for each country first; Travel guide can reveal the exact dock and its dotted connection. There is no need to guess every water square.',
        'As docas das ilhas também estão escondidas. Procure cada país primeiro; o Guia de viagem pode revelar a doca exata e sua linha pontilhada. Não precisa adivinhar cada casa da água.',
        'Los muelles de las islas también están ocultos. Busca primero cada país; la Guía de viaje puede revelar el muelle exacto y su línea de puntos. No hace falta adivinar cada casilla de agua.'
      )]
    },
    after: {
      lines: [globe(
        'We found the missing signs in a parcel! The note says, “Please put these back. I’m still getting lost.” One last tour: return the flags and find our mixed-up traveller.',
        'Encontramos as placas num pacote! O bilhete diz: “Por favor, coloquem de volta. Ainda estou me perdendo.” Mais uma volta: devolver as bandeiras e encontrar o viajante confuso.',
        '¡Encontramos las señales en un paquete! La nota dice: «Por favor, devuélvanlas. Aún me pierdo». Una última vuelta: devolver las banderas y encontrar al viajero confundido.'
      )]
    }
  },
  '3:SA': {
    before: {
      lines: [
        globe(
          'The destination signs are back! On our final tour, a few more mountains will bend our routes. We’ll keep learning about each country as we help.',
          'As placas dos destinos voltaram! Na última volta, mais algumas montanhas farão os caminhos virar. Vamos continuar conhecendo os países enquanto ajudamos.',
          '¡Las señales de destino han vuelto! En la última vuelta, algunas montañas más harán girar los caminos. Seguiremos conociendo los países mientras ayudamos.'
        ),
        globe(
          'Before each push, look for the square where you will stand next. Leave room to walk around the flag and change sides.',
          'Antes de cada empurrão, procure a casa onde você vai ficar depois. Deixe espaço para dar a volta na bandeira e mudar de lado.',
          'Antes de cada empujón, busca la casilla donde te colocarás después. Deja espacio para rodear la bandera y cambiar de lado.'
        )
      ]
    }
  },
  '3:NA': {
    before: {
      lines: [globe(
        'Three flags and a few more rocks. Try one delivery at a time, and keep the open paths free for the other flags.',
        'Três bandeiras e mais algumas pedras. Tente uma entrega de cada vez e deixe os caminhos livres para as outras bandeiras.',
        'Tres banderas y algunas rocas más. Prueba una entrega a la vez y deja los caminos libres para las otras banderas.'
      )]
    }
  },
  '3:EE': {
    before: {
      lines: [globe(
        'This little mountain range needs a bend in our route. Plan the turn before pushing: you must be able to reach the new side of the flag.',
        'Esta pequena cadeia de montanhas pede uma curva no caminho. Planeje a curva antes de empurrar: você precisa conseguir chegar ao novo lado da bandeira.',
        'Esta pequeña cadena de montañas pide una curva en el camino. Planea el giro antes de empujar: necesitas poder llegar al nuevo lado de la bandera.'
      )]
    }
  },
  '3:WE': {
    before: {
      lines: [globe(
        'Take the open route around the ridge. Unless it is the matching destination, a corner can trap a flag. Undo is there whenever you need another try.',
        'Siga pelo caminho aberto ao redor das montanhas. Se não for o destino certo, um canto pode prender a bandeira. Desfazer está aí para tentar de novo.',
        'Sigue el camino abierto alrededor de las montañas. Si no es su destino, una esquina puede atrapar una bandera. Deshacer está ahí para volver a intentarlo.'
      )]
    }
  },
  '3:AF': {
    before: {
      lines: [globe(
        'A slightly longer detour today. Look at the destination, then imagine the last push into it. Which side will you need to stand on?',
        'Hoje o desvio é um pouco maior. Olhe o destino e imagine o último empurrão até ele. De que lado você vai precisar ficar?',
        'Hoy el desvío es un poco mayor. Mira el destino e imagina el último empujón hasta él. ¿En qué lado necesitarás colocarte?'
      )]
    }
  },
  '3:AS': {
    before: {
      lines: [globe(
        'Nearly there! Mountains can make a straight line the wrong route. A few careful turns will bring these flags home. Take your time.',
        'Estamos quase lá! Com montanhas, uma linha reta pode não ser o melhor caminho. Algumas curvas cuidadosas levarão as bandeiras ao lugar. Vá sem pressa.',
        '¡Ya casi llegamos! Con montañas, una línea recta puede no ser el mejor camino. Unos giros cuidadosos llevarán las banderas a su lugar. Sin prisa.'
      )]
    }
  },
  '3:OC': {
    before: {
      lines: [globe(
        'Our last puzzle brings the ideas together: steer around the reefs, leave room behind each flag, and deliver one at a time. It is our biggest delivery, but there is no rush. Our traveller must be close!',
        'O último desafio reúne o que aprendemos: contorne os recifes, deixe espaço atrás das bandeiras e entregue uma de cada vez. É nossa maior entrega, mas não há pressa. Nosso viajante deve estar perto!',
        'El último desafío reúne lo aprendido: rodea los arrecifes, deja espacio detrás de las banderas y entrega una a la vez. Es nuestra mayor entrega, pero no hay prisa. ¡Nuestro viajero debe estar cerca!'
      )]
    },
    after: {
      cast: ['globe', 'pip'],
      lines: [
        {
          ...pip(
            'Hello… I’m Pip, a compass. I moved the flags. I wanted to help, but every direction felt wrong. I’m sorry for all the mix-ups.',
            'Olá… Sou Pip, uma bússola. Eu movi as bandeiras. Queria ajudar, mas toda direção parecia errada. Desculpa por toda a confusão.',
            'Hola… Soy Pip, una brújula. Yo moví las banderas. Quería ayudar, pero todas las direcciones parecían equivocadas. Perdón por todo el lío.'
          ),
          stage: { pip: 'confused' }
        },
        globe(
          'Hello, Pip! Thank you for telling us. Look—there’s a little magnet stuck to your side. It is pulling your needle away from its usual direction!',
          'Olá, Pip! Obrigado por contar. Olha: tem um pequeno ímã preso do seu lado. Ele está puxando sua agulha para longe da direção de sempre!',
          '¡Hola, Pip! Gracias por contarlo. Mira: tienes un pequeño imán pegado al costado. ¡Está desviando tu aguja de su dirección habitual!'
        ),
        pip(
          'A magnet? I didn’t notice it at all! I even packed away the signs because I thought they were wrong. I’m glad you found them.',
          'Um ímã? Eu nem percebi! Até guardei as placas porque achei que estavam erradas. Que bom que vocês encontraram.',
          '¿Un imán? ¡Ni me había dado cuenta! Hasta guardé las señales porque creí que estaban equivocadas. Me alegra que las encontraran.'
        ),
        globe(
          'We put the signs and flags back. Now let’s help you. May I take the magnet off and move it well away?',
          'Colocamos as placas e as bandeiras de volta. Agora vamos ajudar você. Posso tirar o ímã e levá-lo para bem longe?',
          'Devolvimos las señales y las banderas. Ahora vamos a ayudarte. ¿Puedo quitarte el imán y llevarlo bien lejos?'
        ),
        pip(
          'Yes, please! A little help sounds much better than another trip in circles.',
          'Sim, por favor! Uma ajudinha parece bem melhor do que outra viagem em círculos.',
          '¡Sí, por favor! Un poco de ayuda suena mucho mejor que otro viaje en círculos.'
        ),
        {
          ...globe(
            'There, the magnet is off and safely away. Let your needle settle. Then we’ll compare your direction with our map, together.',
            'Pronto, tirei o ímã e deixei bem longe. Deixe sua agulha se acalmar. Depois vamos comparar sua direção com o nosso mapa, juntos.',
            'Listo, quité el imán y lo dejé bien lejos. Deja que tu aguja se calme. Después compararemos tu dirección con nuestro mapa, juntos.'
          ),
          stage: { pip: 'settling' }
        },
        {
          ...pip(
            'Oh! My needle is steady again. With your map to help, I know which way to go. Thank you, Globe!',
            'Ah! Minha agulha está firme de novo. Com a ajuda do seu mapa, sei para onde ir. Obrigado, Globo!',
            '¡Ah! Mi aguja vuelve a estar firme. Con la ayuda de tu mapa, sé hacia dónde ir. ¡Gracias, Globo!'
          ),
          stage: { pip: 'oriented' }
        },
        globe(
          'Everyone gets turned around sometimes. Next time, we can check the map and ask each other for help. Shall we explore as friends?',
          'Todo mundo se perde às vezes. Da próxima vez, podemos conferir o mapa e pedir ajuda um ao outro. Vamos explorar como amigos?',
          'Todos nos perdemos alguna vez. La próxima vez podemos revisar el mapa y pedirnos ayuda. ¿Exploramos como amigos?'
        ),
        pip(
          'I’d like that! No more moving flags without checking. Our next adventure starts with a friend—and a better sense of direction!',
          'Eu adoraria! Nada de mover bandeiras sem conferir. A próxima aventura começa com um amigo e uma direção melhor!',
          '¡Me encantaría! Nada de mover banderas sin comprobar. ¡La próxima aventura empieza con un amigo y una dirección mejor!'
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
  const definition = STORY_SCENES[slot]?.[phase]
  if (!definition?.lines.length) return null

  const params = {
    region: translate(locale, chapter.region.name),
    tour: chapter.tour,
    stop: chapter.stop
  }
  const lines = definition.lines.map(line => ({
    ...line,
    text: localizedStoryText(line.text, locale, params)
  }))
  if (phase === 'before' && chapter.tour >= 2) {
    for (const goal of storyLevel(code).goals) {
      lines.push({ speaker: 'globe', text: storyCountryGuide(goal.country, locale) })
    }
  }
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
