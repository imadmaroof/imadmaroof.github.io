/* Every project on the site, in order along the map.
   Plain script rather than a module so the site also works opened from disk. */

const PROJECTS = [

  /* ---- WORLD 1 ---------------------------------------------------------- */
  {
    id:     'world-1',
    world:  '1-1',
    title:  'PROJECT TITLE',
    blurb:  'Placeholder blurb. One sentence about what this project is and why it exists.',
    page:   'worlds/world-template.html',
    locked: false,
    tech:   ['PLACEHOLDER', 'PLACEHOLDER', 'PLACEHOLDER'],
    links:  [
      { label: 'REPO',      href: '#' },
      { label: 'LIVE DEMO', href: '#' }
    ],
    abstract: 'Placeholder abstract. Two or three sentences on what this project does and the one result worth knowing about. Shown in the preview card on the map.',
    media:    ''
  },

  /* ---- WORLD 2 ---------------------------------------------------------- */
  {
    id:     'world-2',
    world:  '1-2',
    title:  'PROJECT TITLE',
    blurb:  'Placeholder blurb. Swap this out for a real one-line summary later.',
    page:   'worlds/world-template.html',
    locked: false,
    tech:   ['PLACEHOLDER', 'PLACEHOLDER', 'PLACEHOLDER'],
    links:  [
      { label: 'REPO',      href: '#' },
      { label: 'LIVE DEMO', href: '#' }
    ],
    abstract: 'Placeholder abstract. Two or three sentences on what this project does and the one result worth knowing about. Shown in the preview card on the map.',
    media:    ''
  },

  /* ---- WORLD 3 ---------------------------------------------------------- */
  {
    id:     'world-3',
    world:  '1-3',
    title:  'PROJECT TITLE',
    blurb:  'Placeholder blurb. Filler text standing in for a real description.',
    page:   'worlds/world-template.html',
    locked: false,
    tech:   ['PLACEHOLDER', 'PLACEHOLDER', 'PLACEHOLDER'],
    links:  [
      { label: 'REPO',      href: '#' },
      { label: 'LIVE DEMO', href: '#' }
    ],
    abstract: 'Placeholder abstract. Two or three sentences on what this project does and the one result worth knowing about. Shown in the preview card on the map.',
    media:    ''
  },

  /* ---- WORLD 4 — locked example ----------------------------------------- */
  {
    id:     'world-4',
    world:  '2-1',
    title:  'COMING SOON',
    blurb:  'Placeholder blurb for a project that is not published yet.',
    page:   '',
    locked: true,
    tech:   ['PLACEHOLDER', 'PLACEHOLDER'],
    links:  []
  },

  /* ---- WORLD 5 — locked example ----------------------------------------- */
  {
    id:     'world-5',
    world:  '2-2',
    title:  'COMING SOON',
    blurb:  'Placeholder blurb for a project that is not published yet.',
    page:   '',
    locked: true,
    tech:   ['PLACEHOLDER', 'PLACEHOLDER'],
    links:  []
  },

  /* ---- WORLD 6 — locked example ----------------------------------------- */
  {
    id:     'world-6',
    world:  '2-3',
    title:  'COMING SOON',
    blurb:  'Placeholder blurb for a project that is not published yet.',
    page:   '',
    locked: true,
    tech:   ['PLACEHOLDER', 'PLACEHOLDER'],
    links:  []
  }

];

/* Power-ups: a ? block on the path that opens a chest of skills. `after` is
   'start' or the id of the world it follows. A skill that appears in more
   than one chest levels up. */
const POWERUPS = [

  {
    after:  'start',
    title:  'STARTING KIT',
    skills: [
      { name: 'CODING',      gain: 1, detail: 'Placeholder: one line on where this started.' },
      { name: 'ELECTRONICS', gain: 1, detail: 'Placeholder: one line on where this started.' }
    ]
  },

  {
    after:  'world-1',
    title:  'WORLD 1-1 LOOT',
    skills: [
      { name: 'CAD',         gain: 1, detail: 'Placeholder: what this project taught you.' },
      { name: '3D PRINTING', gain: 1, detail: 'Placeholder: what this project taught you.' },
      { name: 'CODING',      gain: 1, detail: 'Placeholder: what this project taught you.' }
    ]
  },

  {
    after:  'world-2',
    title:  'WORLD 1-2 LOOT',
    skills: [
      { name: 'SOLDERING',   gain: 1, detail: 'Placeholder: what this project taught you.' },
      { name: 'ELECTRONICS', gain: 1, detail: 'Placeholder: what this project taught you.' }
    ]
  },

  {
    after:  'world-3',
    title:  'WORLD 1-3 LOOT',
    skills: [
      { name: 'CAD',         gain: 1, detail: 'Placeholder: what this project taught you.' },
      { name: 'CODING',      gain: 1, detail: 'Placeholder: what this project taught you.' }
    ]
  },

  {
    after:  'world-4',
    title:  'WORLD 2-1 LOOT',
    skills: [
      { name: '3D PRINTING', gain: 1, detail: 'Placeholder: what this project taught you.' },
      { name: 'SOLDERING',   gain: 1, detail: 'Placeholder: what this project taught you.' }
    ]
  },

  {
    after:  'world-5',
    title:  'WORLD 2-2 LOOT',
    skills: [
      { name: 'ELECTRONICS', gain: 1, detail: 'Placeholder: what this project taught you.' },
      { name: 'CODING',      gain: 1, detail: 'Placeholder: what this project taught you.' }
    ]
  }

];

window.PROJECTS = PROJECTS;
window.POWERUPS = POWERUPS;
