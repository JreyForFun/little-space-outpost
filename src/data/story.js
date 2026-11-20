/* STORY - mission briefings (who speaks, their expression, what they say) and wrap-up lines.
 * Speakers: astro (robot coach), coral (Rio, engineer), sage (Sage, botanist), lavender (Lumi, geologist).
 * Expressions: astro = happy | talk | wow | worried ; crew = happy | worried | tired.
 * Keep lines short (ages 7-12). Science words are explained the first time they appear. */
(function (root) {
  const BRIEFINGS = {
    m1: [
      ['astro', 'happy', 'Welcome to the Junior Astronaut Academy, Cadet! I’m ASTRO, your robot coach.'],
      ['astro', 'talk', 'Today is your first real mission: a tiny outpost on the Moon.'],
      ['coral', 'worried', 'Uh, ASTRO? Our helmets only hold a little air. There’s no air to breathe out here!'],
      ['astro', 'talk', 'That’s why we build an Oxygen Maker. It splits water into the oxygen we breathe.'],
      ['sage', 'happy', 'And Solar Panels give it power. Sunlight in, air out!'],
      ['astro', 'wow', 'Every machine needs power, and power is limited. Choose wisely, Commander!'],
    ],
    m2: [
      ['sage', 'happy', 'I brought seeds from Earth! Lettuce, tomatoes and radishes.'],
      ['astro', 'talk', 'A Greenhouse grows food and teaches us science. But it needs a lot of power.'],
      ['lavender', 'worried', 'So if the garden uses power, the Oxygen Maker might run short?'],
      ['astro', 'happy', 'Exactly! Food, air and power are all connected. Balance them, Cadet.'],
    ],
    m3: [
      ['astro', 'worried', 'Alert! NASA scientists are watching big flares on the Sun.'],
      ['astro', 'talk', 'A solar flare can send a storm of radiation, tiny invisible particles, toward the Moon.'],
      ['coral', 'happy', 'Our Radiation Shelter can block it, if we charge it before the storm arrives.'],
      ['lavender', 'tired', 'Working outside gives us more radiation too. Let’s take turns.'],
      ['astro', 'wow', 'These storms are REAL flares from NASA’s DONKI records. Some may be from this very month!'],
    ],
    m4: [
      ['astro', 'talk', 'Sunset is coming. On the Moon, night lasts about two whole Earth weeks!'],
      ['coral', 'worried', 'No sunlight means no solar power. We’ll need full batteries.'],
      ['sage', 'tired', 'Maybe the garden can rest at night to save power…'],
      ['astro', 'happy', 'Plan ahead, store power, and keep the crew warm and breathing.'],
    ],
    m5: [
      ['astro', 'wow', 'Welcome to the Moon’s south pole, where NASA’s Artemis astronauts plan to land!'],
      ['lavender', 'happy', 'There’s frozen water hiding in the dark craters. Ice!'],
      ['astro', 'talk', 'An Ice Digger gives fresh water, so the Oxygen Maker and Greenhouse work even better.'],
      ['coral', 'worried', 'But the sunny ridges and the icy shadows are in different places…'],
      ['astro', 'happy', 'Choose your landing site carefully, Commander. Every site has a trade-off.'],
    ],
    m6: [
      ['astro', 'wow', 'Cadet… you’ve earned the big one. The first outpost on MARS!'],
      ['sage', 'worried', 'Mars is so far away. Radio messages take minutes to reach Earth!'],
      ['astro', 'talk', 'So Mission Control’s advice arrives a day late. You’ll make most decisions yourself.'],
      ['lavender', 'happy', 'Good news: the radiation here is about half of the Moon’s. NASA’s Curiosity rover measured it.'],
      ['coral', 'worried', 'Bad news: dust storms can cover the solar panels. Keep the batteries charged!'],
      ['astro', 'happy', 'This is what you trained for. Let’s go, Commander!'],
    ],
  };

  const NAMES = { astro: 'ASTRO', coral: 'Rio', sage: 'Sage', lavender: 'Lumi' };

  const API = { BRIEFINGS, NAMES };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.OUTPOST_STORY = API;
})(typeof self !== 'undefined' ? self : this);
