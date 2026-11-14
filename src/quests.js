// Side quests from the neighbors. Each quest builds its steps when accepted.
// Step types:
//   goto    { pos, text, r?, timer?, item? }   reach a spot (item: show a pickup there)
//   collect { points:[{x,z}], text }           grab every item
//   chase   { count, text }                    chase squirrels up trees
import { PLACES, PARK, FELD } from './world.js';

export const QUESTS = [
  {
    id: 'schmidt', name: 'Frau Schmidt', coat: 0x9b6fa8, hair: 0xe6e2dc,
    title: 'The Missing Tagesspiegel',
    intro: 'Ach, mein Kleiner! My newspaper is still lying at the Späti. Would you fetch it for me?',
    done: 'Danke schön! Here, a Leckerli for my favourite postman.',
    xp: 40, treats: 3,
    steps: () => [
      { type: 'goto', pos: PLACES.spaeti, item: true, text: 'Fetch the newspaper at the Späti' },
      { type: 'goto', pos: PLACES.schmidt, text: 'Bring it back to Frau Schmidt' },
    ],
  },
  {
    id: 'mehmet', name: 'Mehmet', coat: 0x3f7f6a, hair: 0x221a16,
    title: 'Club-Mate Express',
    intro: 'Hey Boston! The Freiluftkino crew ordered Club-Mate. Can you run this crate over to them?',
    done: 'The film crew says cheers. Good dog!',
    xp: 35, treats: 2,
    steps: () => [{ type: 'goto', pos: PLACES.kino, text: 'Carry the crate to the Freiluftkino' }],
  },
  {
    id: 'lina', name: 'Lina', coat: 0xf2a03c, hair: 0x8a4b22, scale: 0.95,
    title: 'Runaway Ball',
    intro: 'My ball rolled away somewhere in the park! Can you find it? Pleeease?',
    done: 'You found it! You are the best dog in all of Berlin!',
    xp: 45, treats: 3,
    steps: (ctx) => [
      { type: 'goto', pos: ctx.near(PLACES.lina, 25, 60, PARK), item: true, color: 0xe94f64, text: "Find Lina's ball in the park" },
      { type: 'goto', pos: PLACES.lina, text: 'Bring the ball back to Lina' },
    ],
  },
  {
    id: 'horst', name: 'Opa Horst', coat: 0x7a6a52, hair: 0xd8d8d8,
    title: 'Streuselkuchen Defence',
    intro: 'Those cheeky squirrels are after my Streuselkuchen! Chase three of them up a tree, will you?',
    done: 'Ha! That showed them. A crumb for the hero.',
    xp: 50, treats: 3,
    steps: () => [{ type: 'chase', count: 3, text: 'Chase squirrels up a tree' }],
  },
  {
    id: 'ayse', name: 'Ayşe', coat: 0xe0527a, hair: 0x2a1c14,
    title: 'Race to Rixdorfer Höhe',
    intro: 'Morning run! Bet you cannot beat me to the top of Rixdorfer Höhe. 35 seconds. Go!',
    done: 'Okay, okay, four legs win. Well run!',
    fail: 'Too slow this time! Try me again later.',
    xp: 60, treats: 4,
    steps: () => [{ type: 'goto', pos: PLACES.hilltop, r: 5, timer: 35, text: 'Reach the top of Rixdorfer Höhe' }],
  },
  {
    id: 'jonas', name: 'Jonas', coat: 0x4aa3df, hair: 0xd9b25a,
    title: 'Socks in the Wind',
    intro: 'The wind on the Feld stole my three lucky kite-flying socks. Could you sniff them out?',
    done: 'All three! My kite and my feet thank you.',
    xp: 60, treats: 4,
    steps: (ctx) => [
      { type: 'collect', points: [0, 1, 2].map(() => ctx.near(PLACES.jonas, 20, 90, FELD)), color: 0x4aa3df, text: 'Find the lucky socks on the Feld' },
      { type: 'goto', pos: PLACES.jonas, text: 'Bring the socks back to Jonas' },
    ],
  },
];
