/* ==========================================================================
   PROJECTS — the single source of truth for the whole site
   ==========================================================================

   This is the ONLY file you need to edit to add a project.

   index.html reads this array and does everything else automatically:
     * places a node on the overworld map (position is computed from the
       array index, so you never touch coordinates)
     * draws the winding path between the nodes
     * scatters the coins between them
     * builds the mobile level-select list
     * builds the plain, no-animation list at pages/all-projects.html
     * wires up mouse, keyboard and the pipe-warp transition

   --------------------------------------------------------------------------
   HOW TO ADD A PROJECT (three steps, no CSS, no layout work)
   --------------------------------------------------------------------------

   1. Copy the world template to a new file:

          cp worlds/world-template.html worlds/my-project.html

   2. Open worlds/my-project.html and fill in the placeholder copy. Every
      spot you need to edit is marked with an EDIT comment.

   3. Add ONE object to the PROJECTS array below:

          {
            id:     'my-project',
            world:  '2-1',
            title:  'MY PROJECT',
            blurb:  'One sentence about it.',
            page:   'worlds/my-project.html',
            locked: false,
            tech:   ['Python', 'PostgreSQL'],
            links:  [{ label: 'REPO', href: 'https://github.com/you/my-project' }]
          }

   That's it. The map grows, the path re-routes, the node appears.

   --------------------------------------------------------------------------
   FIELD REFERENCE
   --------------------------------------------------------------------------

   id      string   Unique slug. Used for DOM ids and deep links
                    (index.html#world-my-project focuses that node).
   world   string   The level number shown on the sign, e.g. '1-1', '2-3'.
                    Purely cosmetic — order comes from array order, not this.
   title   string   Short name on the sign. Rendered in the pixel font, so
                    keep it under ~24 characters or the sign gets tall.
   blurb   string   One line of plain-language description. Shown on the
                    mobile level-select cards and as the node's tooltip.
   page    string   Path to that project's page, RELATIVE TO THE SITE ROOT
                    (index.html lives at the root, so 'worlds/foo.html').
                    Ignored when locked is true.
   locked  boolean  true  -> renders as a greyed-out "?" block, not
                            clickable, no page needed yet. Use this to
                            tease work in progress.
                    false -> renders as a green pipe you can enter.

   ---- optional, used by pages/all-projects.html ----------------------------

   tech    string[] Tech stack, one entry per item, e.g. ['Go', 'Redis'].
                    Rendered as chips on the plain list page. Omit or leave
                    empty and the TECH line is skipped entirely.
   links   object[] External links, each { label: 'REPO', href: 'https://…' }.
                    Rendered as buttons on the plain list page. Omit or leave
                    empty and the links row is skipped entirely.

   Both are OPTIONAL. The overworld map (js/map.js) never reads them, so a
   project entry without them still works exactly as before — they exist so
   the no-animation list view can show a stack and links without you having
   to repeat yourself in the world page.

   --------------------------------------------------------------------------
   NOTES
   --------------------------------------------------------------------------
   * Order in this array == order along the path, left to right.
   * There is no practical limit on the number of projects. The map canvas
     just gets wider and stays horizontally scrollable.
   * This is a plain script, NOT an ES module, on purpose: it means the site
     also works when opened straight off the filesystem, with no server and
     no CORS errors. It publishes one global, PROJECTS.
   ========================================================================== */

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
    ]
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
    ]
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
    ]
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
