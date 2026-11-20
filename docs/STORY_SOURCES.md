# Story references

The plot and Pip are fictional. Country notes are short original summaries,
translated into English, Brazilian Portuguese, and Spanish. Each is one example
of a living tradition, not a claim that everybody in a country practices it.
The `source` beside each note in `src/content/story-countries.json` keeps the
reference next to the editable copy. No source illustrations were imported.

## Cultural notes

| Country | Reference |
| --- | --- |
| Peru | https://ich.unesco.org/en/RL/taquile-and-its-textile-art-00166 |
| Bolivia | https://ich.unesco.org/en/RL/carnival-of-oruro-00003 |
| Colombia | https://ich.unesco.org/en/USL/vallenato-traditional-music-of-the-greater-magdalena-region-01095 |
| United States | https://www.nps.gov/articles/jazz.htm |
| Canada | https://parks.canada.ca/culture/designation/evenement-event/erable-maple |
| Mexico | https://ich.unesco.org/en/RL/mariachi-string-music-song-and-trumpet-00575 |
| Poland | https://ich.unesco.org/en/state/poland-PL |
| Romania | https://ich.unesco.org/en/RL/craftsmanship-of-horezu-ceramics-00610 |
| Ukraine | https://ich.unesco.org/en/RL/petrykivka-decorative-painting-as-a-phenomenon-of-the-ukrainian-ornamental-folk-art-00893 |
| France | https://ich.unesco.org/en/RL/artisanal-know-how-and-culture-of-baguette-bread-01883 |
| Germany | https://ich.unesco.org/en/RL/organ-craftsmanship-and-music-01277 |
| Spain | https://ich.unesco.org/en/RL/flamenco-00363 |
| Egypt | https://ich.unesco.org/en/USL/handmade-weaving-in-upper-egypt-sa-eed-01605 |
| Nigeria | https://www.slam.org/accessibility/aso-oke-prestige-cloth-from-nigeria/ |
| South Africa | https://www.southafrica.net/za/en/travel/article/culture-and-expression-of-identity-the-ndebele-of-south-africa |
| India | https://ignca.gov.in/walls-and-floors/ |
| China | https://ich.unesco.org/en/RL/chinese-paper-cut-00219 |
| Mongolia | https://ich.unesco.org/en/RL/traditional-craftsmanship-of-the-mongol-ger-and-its-associated-customs-00872 |
| Australia | https://kakadu.gov.au/things-do/activities/rock-art/ |
| New Zealand | https://www.tepapa.govt.nz/digital-museum/explore-digital-museum/maori/maori-weaving |
| Papua New Guinea | https://www.horniman.ac.uk/object/13.4.66/5/ |

## Compass mechanism

The University of Hawaiʻi's *Exploring Our Fluid Earth*, “Wayfinding and
Navigation,” explains compass navigation and interference from nearby magnetic
fields: https://manoa.hawaii.edu/exploringourfluidearth/physical/navigation-and-transportation/wayfinding-and-navigation

Natural Resources Canada's compass guidance describes magnetic interference and
keeping compasses away from magnetic objects:
https://geomag.nrcan.gc.ca/mag_fld/compass-en.php

The scene uses that simple mechanism: a nearby magnet disturbs the needle;
Globe removes it, moves it away, lets the needle settle, and checks the map with
Pip. This is story context, not a navigation or compass-calibration lesson.

## Geography and terrain

Directional clues reuse the project's bundled `relations.json` and localized
country names. Board containment uses the existing world geography, projection,
and rasterizer; this patch does not introduce a new boundary dataset. Offshore
Oceania docks retain nearby country anchors. The authored terrain is deliberately
schematic puzzle scenery, not instruction about actual mountain/reef locations.
