# imadmaroof.github.io

A 16-bit, Super Mario World style portfolio site. The homepage is an
overworld map: each node is a project, clicking one walks a sprite over to
it, the sprite enters the pipe, and the page warps to that project's own
"level" page.

**This repository is a template.** Every project, metric and paragraph in it
is a placeholder. Nothing here needs a build step — no bundler, no framework,
no npm install. It is plain HTML, CSS and vanilla JS served straight off
GitHub Pages from the repository root.

---

## Preview it locally

The site is static, so any local web server works. From the repo root:

```bash
# Python (already on macOS and most Linux boxes)
python3 -m http.server 8000

# or Node
npx serve .

# or PHP
php -S localhost:8000
```

Then open <http://localhost:8000>.

Opening `index.html` directly off the filesystem (`file://`) also works —
the scripts are deliberately plain scripts rather than ES modules so there
are no CORS errors — but a server is closer to how GitHub Pages will serve
it, so prefer one of the commands above.

---

## File structure

```
.
├── index.html                  the overworld map (homepage)
├── css/
│   └── style.css               all styling; palette lives at the very top
├── js/
│   ├── projects.js             ← THE ONLY FILE YOU EDIT TO ADD A PROJECT
│   ├── map.js                  builds and drives the overworld
│   └── site.js                 shared: page transitions, sound, coin counter
├── worlds/
│   └── world-template.html     duplicate this per project
├── pages/
│   ├── about.html              about + resume
│   └── contact.html            the castle at the end of the map
├── .nojekyll                   tells GitHub Pages to serve the files as-is
└── README.md
```

---

## Adding a project

Three steps. You never touch the layout or the CSS.

### 1. Copy the template

```bash
cp worlds/world-template.html worlds/my-project.html
```

### 2. Fill in the copy

Open the new file. Every place that needs your words is marked with an
`EDIT` comment: the page title, the `WORLD 1-1` banner, Overview, The Goal,
Tech Stack, What I Built, the LEVEL COMPLETE scorecard, and the Links row.
Delete any section you do not need — they are independent panels.

### 3. Register it on the map

Add one object to the `PROJECTS` array in `js/projects.js`:

```js
{
  id:     'my-project',                 // unique slug
  world:  '2-1',                        // level number shown on the sign
  title:  'MY PROJECT',                 // short name on the sign
  blurb:  'One sentence about it.',     // used on mobile + as a tooltip
  page:   'worlds/my-project.html',     // path from the site root
  locked: false                         // true = greyed-out "?" block
}
```

That is the whole job. The map grows to fit, the path re-routes through the
new node, the coins re-scatter, and the mobile level-select list picks it up
automatically. Order in the array is the order along the path.

Set `locked: true` (and leave `page` empty) to tease something unfinished —
it renders as a grey `?` block that bumps and goes nowhere.

---

## Customising

### The palette

Every colour on the site is a CSS custom property in the `:root` block at the
top of `css/style.css` — sky, clouds, grass, dirt, pipes, gold, stone, panels,
text. Change them there and the whole site, including the inline SVG sprites,
recolours. Nothing below `:root` hard-codes a colour.

### The map shape

The constants at the top of `js/map.js` control the layout:

| Constant | What it does |
| --- | --- |
| `NODE_GAP` | horizontal px between world nodes |
| `NODE_Y` | list of heights (as a fraction of the map) that the nodes cycle through — this is what makes the path zig-zag |
| `WALK_SPEED` | sprite speed in px/second |
| `LAND_TOP` | where the ground starts |
| `CASTLE_GAP` | distance from the last world to the castle |

### Your name and links

`YOUR NAME` appears in the HUD of every page, and the nav links point at
`pages/about.html`, `pages/about.html#resume` and `pages/contact.html`.
Search for `YOUR <span>NAME</span>` and `EDIT` across the HTML files.

For a resume, drop a PDF in the repo root and point the `DOWNLOAD CV` button
in `pages/about.html` at it.

---

## How it works

* **Art** — everything is inline SVG or CSS. There are no image files at all
  (the favicon is a data URI), and no third-party sprites or logos. The
  character, coins, castle, clouds and hills are original pixel shapes.
  `image-rendering: pixelated` keeps them crisp at any scale.
* **Fonts** — [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)
  from Google Fonts for headings and UI only; body copy uses the system sans
  stack so paragraphs stay readable. Note that Press Start 2P has no arrow
  glyphs (`→`, `←`), so UI text uses ASCII (`>>`) instead.
* **Navigation** — click a node, or use the arrow keys to walk between
  adjacent worlds and <kbd>Enter</kbd> to go down the pipe. You can also
  drag the map to pan it, and `index.html#world-<id>` deep-links to a node.
* **Sound** — optional and off by default. Every effect is synthesised at
  runtime with the Web Audio API; there are no audio files. The toggle sits
  in the HUD and the choice is remembered in `localStorage`.
* **Responsive** — below 768px the map is replaced by a plain vertical
  level-select list. It keeps the pixel aesthetic but drops the pathfinding
  animation, so on a phone it is a normal, readable, single-column page.
* **Reduced motion** — with `prefers-reduced-motion: reduce`, the walk
  animation, the pipe dive and the screen wipe are all skipped and clicks
  navigate straight to the page.

---

## Deploying

The site is served from the repository root, so pushing to the default
branch is the deploy. In **Settings → Pages**, set the source to
*Deploy from a branch* and pick the default branch with the `/ (root)`
folder.
