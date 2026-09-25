# Build Guide: a personal wine cellar PWA with AI recognition

This is the complete specification behind the app in this repository: an installable,
mobile-friendly wine cellar tracker with photo recognition, food-pairing suggestions, and
automatic research enrichment. The code you already have is a fully working wine app —
you do **not** need to build anything from scratch to use it for wine. This document is
written for **Claude Code** (or a similar agentic coding tool with file and terminal
access) so it can also explain *why* things are built the way they are, in case you want
to customize the design, add a feature, or repurpose the same pattern for a different
kind of collection (beer, whisky, books, plants, tools...).

**Just want to run it as a wine cellar app?** Skip straight to section 6
(Setup steps) — there's no data model or design work left to do.

## Starter prompt (only needed if you're customizing or repurposing the app)

If you want to change the design, add a feature, or adapt this from a wine cellar into a
different kind of collection tracker, open this project in Claude Code and paste the text
below as your first message. Adjust the bracketed placeholders to your own use case
before sending it.

```
Read docs/BUILD_GUIDE.en.md in full — that's the complete specification for the app I want
to build. Build the app step by step, in this order, and test locally in the browser
after each phase before moving on:

1. Set up the project structure and file layout (section 2)
2. Data model and state layer (section 3) — this will be an inventory app for:
   [CHANGE THIS: e.g. "beer bottles" / "whisky bottles" / "books" / "plant collection"].
   Adapt the fields from section 3 to this domain (e.g. for beer: brewery/style/ABV
   instead of estate/grape variety).
3. The render layer and event-delegation pattern (section 2), with the design system
   described there — use this color palette and these fonts: [CHANGE THIS, or leave it
   out to keep the example from the build guide]
4. Core functionality: add/edit/delete, filters, sorting, search, CSV export, a
   "ready to drink/use soon" indicator
5. The AI endpoints from section 5 (photo recognition, contextual suggestion, and
   optionally the automatic enrichment) — use the cheapest/fastest available Claude
   model throughout
6. PWA configuration: manifest, service worker with the caching strategy from section 2
7. Bake the pitfalls from section 4 into the code as you go — don't accidentally
   reintroduce them

Once built, go through the pitfalls checklist (section 4) yourself and explicitly verify
each point is covered. Only ask me for input on genuine content decisions (like the
domain in step 2, or the color palette in step 3) — handle everything else autonomously
without pausing to ask for confirmation. Once everything works locally, help me with the
deployment steps in section 6 (I'll create the Vercel and Anthropic accounts myself).
```

## 1. What the app should do

- Inventory management: add items, increase/decrease quantities, delete, mark as
  "consumed/used" (with history).
- Layered navigation: country → region → producer → item (or a similar hierarchy that
  fits the domain).
- Category/color filters on the home screen with live counts, and secondary sort options
  within a filter (A-Z, price, urgency).
- A "ripeness" or "shelf-life" indicator per item (gauge/progress bar) based on
  type/classification and age.
- Search that filters on name/producer/category, preserving input focus while typing.
- A "Recently added" tab showing the newest items first, alongside the main tabs
  (Stock, Drink soon, History) — useful for quickly checking what just got added,
  especially after a batch photo import.
- Detail screen per item: general info + structured characteristics (for wine: a flavor
  profile), fetched via a research task (see §5).
- CSV export of the full inventory.
- Photo recognition: upload one or more photos (including multiple items per photo), or
  a photo of a receipt, after which the data is automatically proposed for review before
  adding.
- Contextual suggestion feature: the user describes a use case ("cooking mussels
  tonight"), and the AI picks the best-matching item from the user's OWN inventory
  (never inventing something outside the actual stock).
- PWA: installable on the home screen, works offline (last-seen data), no app store
  needed.
- Shared access: multiple people (e.g. family members) work on the same inventory, with
  a simple PIN as an access gate (no full account system needed for a single-household
  use case).

## 2. Tech stack and architecture choices

**Deliberate choice: no framework, no build step.**
Vanilla JavaScript with native ES modules (`<script type="module">`), running directly in
the browser — no React/Vue, no webpack/vite. This keeps the app extremely lightweight,
fast to deploy (no build pipeline), and easy to reason about when iterating with an AI
assistant.

| Layer | Choice | Why |
|---|---|---|
| Hosting + serverless functions | Vercel | Free tier is plenty, git-push-to-deploy, native serverless functions in `/api` |
| Shared data storage | Vercel KV (Upstash Redis) | Simple key-value store, one JSON blob is enough at this scale |
| Auth | One shared PIN via an env var, checked server-side | No account system needed for a household; simple and fast |
| AI model | Claude Haiku (cheapest/fastest model) | More than enough for photo→JSON extraction and text matching; costs pennies per use |
| Offline support | Service worker, network-first with cache fallback | App stays usable without a connection, using last-known data |

**Render pattern: one central `render()` function + event delegation.**
No component framework needed: one `ui` state object in the main module, one `render()`
function that rewrites the entire `#app` container (`innerHTML =`), and **one
click/input listener on the root element** that routes to the right handler based on a
`data-action` attribute. This avoids the problem of individual `onclick` handlers
breaking on special characters (apostrophes in names, for example) — all text passes
through an `escapeHtml()` function, and actions never run through inline JS strings.

```js
appEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  switch (el.dataset.action) {
    case 'adjust': /* ... */ break;
    case 'open-modal': /* ... */ break;
    // ...
  }
});
```

**File structure:**
```
index.html              # shell, loads css/js
manifest.json           # PWA manifest
sw.js                   # service worker (bump the cache version on every change!)
css/styles.css          # all styling, CSS variables for the color palette
js/
  app.js                # state, render(), event delegation, all handlers
  state.js              # data layer: load/save, CRUD functions, sync with server
  auth.js                # PIN screen + header injection for API calls
  model.js              # domain logic (e.g. ripeness calculation)
  utils.js              # escapeHtml, formatting, etc.
  render/                # one module per view/component, each exporting a pure
                          # function that returns an HTML string
                          # (includes recentlyAdded.js for the "Recently added" tab)
api/
  inventory.js           # GET/PUT to the KV store, PIN check
  recognize.js            # photo → Claude vision → JSON
  pairing.js               # text query + inventory → Claude → recommendation
  enrich.js                # optional: automatic per-item research enrichment (see §5b)
```

**Design system** (adapt to your own taste, but this worked well for a premium feel):
- Colors as CSS custom properties on `:root` — a dark base theme, a warm gold accent,
  and burgundy red for primary actions.
- Three typefaces with clear roles: a serif display font for titles/names (e.g.
  Fraunces), a neutral sans-serif for UI text (e.g. Inter), and a monospace for
  labels/metadata (e.g. JetBrains Mono) — the latter gives a "technical/precise" feel
  that suits an inventory-tracking app well.
- Cards with subtle radial-gradient backgrounds instead of flat colors, soft shadows,
  rounded corners (14px `--radius`).
- Tab bar: once you have more than 3-4 tabs, don't shrink them to fit — give every tab
  button the **same fixed width** and put them in their own horizontally-scrollable
  strip (`overflow-x: auto`, hidden scrollbar) between the fixed home/add icon buttons.
  This keeps tabs readable and equally sized instead of squeezing text, and reads as
  "swipe for more" rather than a cramped row.

## 3. Data model

One simple state object, serialized as JSON in the KV store:

```js
{
  inventory: [
    {
      id: 'w0',                    // unique, prefix + incrementing number
      country, region, estate, name, // hierarchy fields (adapt per domain)
      vintage, grapeVariety,          // domain-specific characteristics
      color, sparkling, classification,
      quantity, price,
      notes: '',                    // free-text field: who gave it, occasion, etc.
      description: '',              // AI research: general info (optional, see §5)
      flavorProfile: [],             // AI research: short characteristics list (optional)
      addedAt: '',                   // ISO timestamp, set once on creation — powers
                                      // the "Recently added" tab (sort desc, filter
                                      // to items that have it). Never set on restock.
    },
  ],
  history: [ { id, estate, name, vintage, date } ],
  ownerName: '',
}
```

## 4. Known pitfalls — avoid these iterations

This is the single most valuable section: these are concrete bugs that only surfaced
after multiple rounds of testing. Build them in correctly from the start.

1. **The search field loses focus on every keystroke.** Because `render()` rewrites the
   entire container, an input field loses focus after every keystroke unless you
   explicitly restore it. Fix: save `document.activeElement` + `selectionStart/End`
   before the re-render, and restore it afterward if the active element was the search
   field.
2. **Apostrophes break inline `onclick` handlers.** Never use
   `onclick="doThing('${name}')"` in template strings — a name containing an apostrophe
   breaks the HTML. Use event delegation exclusively, with `data-action`/`data-id`
   attributes, and `escapeHtml()` on **every** piece of user data that ends up in HTML
   (XSS prevention comes as a free side effect of this).
3. **KV env-var naming differs by provider.** Vercel's own "KV" product and the Upstash
   marketplace integration expose different env-var names for the same REST API
   (`KV_REST_API_URL` vs. `UPSTASH_REDIS_REST_URL`). Check for **both** names in your
   serverless function, or the setup process won't work reliably for every user.
4. **An empty server response must never overwrite a populated local inventory.** When
   loading state from the server: if the server comes back empty but you already have
   local data (localStorage), push that up instead of blindly syncing down — otherwise a
   momentary KV hiccup can wipe out someone's entire inventory.
5. **`input.value = ''` can empty an already-read FileList.** If you reset a file input
   with `input.value = ''` after processing an upload, do that ALWAYS after converting
   `input.files` into a plain array (`Array.from(...)`) — in some browsers `.files` is a
   live reference that empties in place as soon as you clear `.value`, even if you had
   just "saved" it into a variable moments before.
6. **Text labels breaking mid-word.** Long labels without spaces (like dotted prefixes,
   e.g. `VDP.Ortswein`) wrap ugly inside small rounded badges. Fix: insert a space after
   the prefix with a regex before rendering, plus `overflow-wrap: anywhere` as a CSS
   safety net.
7. **Bump the service worker cache version on every change.** Use a network-first fetch
   strategy (always try to fetch live, cache only as an offline fallback) and increment
   the `CACHE_NAME` constant on every deploy — otherwise users see stale versions on
   mobile, where the cache is stickier than on desktop.
8. **Never serve API routes from the cache.** Explicitly exclude `/api/*` in the service
   worker's fetch handler, or you'll show stale inventory data after a change made by
   another household member.
9. **Never use the API key client-side.** All calls to the AI model go through a
   serverless function that reads the key from an environment variable — the key never
   reaches the browser JS.
10. **Web-search responses aren't clean JSON.** When you give the model a search tool
    (for research tasks), it often prepends an introductory sentence ("Here's the JSON
    object:") before a ```json code fence, and embeds citation tags
    (`<cite index="...">...</cite>`) inside the text itself. Handle this with (a) a
    regex that tries a code fence first and otherwise looks for the first `{...}` block
    in the text, and (b) a second regex that strips all `<cite>` tags from the final
    text fields before you save them.
11. **A re-render resets the scroll position of any horizontally-scrollable element**,
    including a scrollable tab strip. If a user scrolls the tab bar right and taps a tab
    that's near the edge, the next `render()` rebuilds the DOM from scratch and the
    scroll container snaps back to the start — so the tab they just selected can end up
    scrolled out of view, right after they picked it. Fix: after every `render()`, find
    the element with the `active` state (e.g. `.tab-btn.active`) and call
    `el.scrollIntoView({ block: 'nearest', inline: 'nearest' })` on it — cheap to call on
    every render since it's a no-op when the element is already visible.

## 5. AI integration (separate endpoints, each with one job)

Use **the cheapest/fastest model** for all three core endpoints (a, c, and the optional
b) — this is simple extraction/matching work, no heavy reasoning needed, and it keeps
costs negligible (pennies per call).

**a) Photo → structured data** (`api/recognize.js`)
The client resizes the photo client-side first (canvas, max ~1500px on the long side,
JPEG quality ~0.85) before upload — this keeps both cost and payload size down. Send one
or more images in the same call; explicitly tell the model that a single photo can
contain multiple items, and that it should prefer returning an empty result over
guessing when unsure. Respond with a JSON array even for a single recognized item — that
keeps the client-side handling consistent for photos with and without multiple items.

**b) Research enrichment** (`api/enrich.js`, optional)
To fill in background information per item (general info + characteristics), the model
can be given a search tool (e.g. `web_search_20250305`) and automatically research a new
item in the background right after it's added — no manual action needed. This costs more
per call than the other two endpoints (the model searches the web, and searches are
billed separately per use by Anthropic, on top of tokens — so weigh whether this is
worth it for your use case, or make it an explicit "enrich this item" button instead of
running automatically on every addition).

Note: a response from a model with a search tool is **not clean JSON** — it often
includes text before a code fence, and `<cite>` tags embedded inside the text fields
themselves (see pitfall 10 in §4). Explicitly instruct the prompt to return ONLY JSON as
the final message, with no preamble and no citation markers in the text, and always parse
the response defensively (fence first, then brace-matching, then strip cite tags) — don't
blindly trust the model to comply. Also explicitly ask for empty fields instead of
fabricated information when nothing can be found online.

This same endpoint is also a good place to **correct fields a photo-recognition pass got
wrong**. A label photo often misreads (or simply can't read) the grape variety or the
exact sub-region, and never has a price on it at all. Since the model is already
searching the web for this specific item, have it also (a) verify/correct the grape
variety and region if it can determine them with confidence — returning an empty string
rather than a guess when it can't — and (b) estimate a realistic average retail price
when the item's price is still unset. On the client, only apply the price when the
existing value is empty/zero (never overwrite a real price the user entered, e.g. from a
receipt), but apply a corrected grape variety/region whenever the model returns a
non-empty value — the point of asking is to fix an unreliable initial reading, not just to
fill gaps.

**c) Contextual recommendation** (`api/pairing.js`)
Send the user's question along with a compact summary of their **own inventory** (only
in-stock items), and ask for 1-3 recommendations using **only IDs that are literally
present in the supplied list** — validate this server-side by checking the returned IDs
against a `Set` of valid IDs, and filter out any invalid matches. This prevents the model
from recommending an item that doesn't actually exist.

## 6. Setup steps for a new deployment

1. Create a GitHub repo with this codebase, connect it to a new Vercel project.
2. Add a Vercel KV (or Upstash Redis) database to the project via the Vercel dashboard —
   the env vars are set automatically.
3. In Vercel → Settings → Environment Variables, set:
   - `APP_PIN` — your desired access code (leave empty = no lock).
   - `ANTHROPIC_API_KEY` — your own key from console.anthropic.com (a separate balance,
     independent of any Claude.ai/Claude Code subscription).
4. Deploy (automatic on git push). Open the app, unlock with the PIN, and the default
   sample data appears as a starting point.
5. Adapt the domain-specific data model (§3) and the seed data to your own use case.
