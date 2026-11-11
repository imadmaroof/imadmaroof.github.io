/* Every project on the site, in order along the map.
   Plain script rather than a module so the site also works opened from disk. */

const PROJECTS = [

  /* ---- WORLD 1-1 -------------------------------------------------------- */
  {
    id:     'windmesh',
    world:  '1-1',
    title:  'WINDMESH',
    blurb:  'Wildfire Spread Prediction Model inputting Live Data',
    page:   'worlds/windmesh.html',
    locked: false,
    tech:   ['Python', 'OpenCV', 'Rothermel model', 'Vector calculus', 'DIY anemometer'],
    links:  [
      { label: 'REPO', href: 'https://github.com/ishaan-j/Windmesh' }
    ],
    abstract: 'Software that predicts where and how a wildfire will spread, using the Rothermel surface fire spread model behind fire management systems worldwide. DIY anemometers feed live wind speed and direction into the simulation, so it stays accurate when the wind shifts suddenly.',
    media:    'worlds/media/windmesh.mp4'
  },

  /* ---- WORLD 1-2 -------------------------------------------------------- */
  {
    id:     'airframe-ae',
    world:  '1-2',
    title:  'AIRFRAME AE',
    blurb:  'Real-time impact detection for aircraft panels, using acoustic emission.',
    page:   'worlds/airframe-ae.html',
    locked: false,
    tech:   ['Python', 'Arduino Uno Q', 'MAX4466 piezo mics', 'Acoustic emission'],
    links:  [],
    abstract: 'Aircraft are only checked for structural damage on the ground, every 100 to 1,000 flight hours. Airframe AE listens for impacts as they happen: piezoelectric microphones on the panel pick up the stress waves, and the system locates each hit on a live aircraft diagram.',
    media:    'worlds/media/airframe-ae.mp4'
  },

  /* ---- WORLD 2-1 (placeholder until the next project is ready) ---------- */
  {
    id:     'world-2-next',
    world:  '2-1',
    title:  'COMING SOON',
    blurb:  'The next project is on its way.',
    page:   '',
    locked: true,
    tech:   [],
    links:  []
  }

];

/* Worlds group the projects by age: the oldest are in World 1, the newest
   in the highest world. A project's world is the first number of its
   `world` label ('2-1' is World 2). Each world here gets a name and a look:
   theme is 'grassland' or 'coast'. */
const WORLDS = [
  { number: 1, name: "SUMMER '26",           theme: 'grassland' },
  { number: 2, name: "FRESHMAN YEAR '26-27", theme: 'coast' }
];

/* Power-ups: a ? block on the path that opens a chest of skills. `after` is
   'start' or the id of the project it follows. */
const POWERUPS = [

  {
    after:  'start',
    title:  'STARTING KIT',
    skills: [
      { name: 'CODING',           detail: 'Python, building a pneumonia classifier from chest X-rays at Inspirit AI.' },
      { name: 'MACHINE LEARNING', detail: 'Trained a CNN in TensorFlow and Keras to 92% accuracy.' }
    ]
  },

  {
    after:  'windmesh',
    title:  'WINDMESH LOOT',
    skills: [
      { name: 'MORE ADVANCED CODING',     icon: 'code', detail: 'Fed live sensor data into a fire-spread simulation in Python.' },
      { name: 'INTRO TO HARDWARE DESIGN', icon: 'cad',  detail: 'Designed a DIY anemometer from scratch with limited parts.' },
      { name: 'PROFESSIONAL PITCH',                     detail: 'Made the demo video and trained the team to present. 2nd place.' }
    ]
  },

  {
    after:  'airframe-ae',
    title:  'AIRFRAME AE LOOT',
    skills: [
      { name: 'ELECTRONICS',        icon: 'chip', detail: 'Wired piezoelectric microphones to an Arduino Uno Q.' },
      { name: 'SIGNAL PROCESSING',  icon: 'chip', detail: 'Isolated impact frequencies so ordinary noise is not read as a hit.' },
      { name: 'AI-ASSISTED CODING', icon: 'code', detail: 'Built faster with Claude Code while keeping the logic my own.' }
    ]
  }

];

window.PROJECTS = PROJECTS;
window.WORLDS   = WORLDS;
window.POWERUPS = POWERUPS;
