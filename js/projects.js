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

/* Publish for index.html. (See the note above about why this is a global
   and not an ES module export.) */
window.PROJECTS = PROJECTS;
