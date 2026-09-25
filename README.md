# Wine Cellar — a personal wine inventory app with AI recognition

An installable, mobile-friendly app for keeping track of your own wine collection: add
bottles by snapping a photo, let AI recognize the label, filter and sort by color and
region, track ripeness, and ask "what goes with this dish?" and get a suggestion pulled
from your own stock — never a bottle you don't actually own.

This isn't a generic inventory template with wine as a placeholder — it's built around
how wine collectors actually think about their cellar: country → region → estate, red/
white/rosé/sparkling split, drink-by windows, classifications (DOCG, AOC, Kabinett, and
so on).

## What's included

- Full source code (vanilla JS, no build step required)
- 8 sample wines to start with — replace with your own cellar
- Ready-to-use AI features: photo recognition, receipt recognition, "what pairs with
  this?" suggestions, and automatic background research enrichment for new bottles
- PWA: installable on the home screen, works offline
- `docs/BUILD_GUIDE.en.md` / `docs/BUILD_GUIDE.nl.md` — full architecture and design
  documentation (English and Dutch), including a list of bugs that have already been
  fixed for you, and a ready-to-paste starter prompt for Claude Code

## Setup (~15 minutes) — no coding experience required

You don't need to be a developer to get this running. Every step below is something
Claude Code can do for you if you paste in the starter prompt from
`docs/BUILD_GUIDE.en.md` — you just create the two free accounts and copy in two keys.

1. **Push the code to your own GitHub repo** and connect it to a new project on
   [vercel.com](https://vercel.com) (a free account is enough).
2. **Add a database**: in your Vercel project → Storage → create a KV database (or
   Upstash Redis via the marketplace). The correct environment variables are set
   automatically.
3. **Set two environment variables** in Vercel → Settings → Environment Variables:
   - `APP_PIN` — an access code of your choosing for the app (e.g. `1234`). Leave it
     empty and the app is open to anyone with the link.
   - `ANTHROPIC_API_KEY` — your own key from
     [console.anthropic.com](https://console.anthropic.com) (Console → API Keys). Add a
     small balance (from $5) under Billing. This is a separate, paid balance — unrelated
     to any Claude.ai subscription. Under normal use (a few photos a week) this
     typically costs a few cents a month.
4. **Deploy** (happens automatically on every push to the main branch).
5. Open the app, enter your PIN, and start replacing the sample data with your own
   cellar — by hand, or just by taking photos of the bottles you already own.

## Not a wine collector? It still adapts.

The data model (country/region/estate/grape variety, classification, vintage) happens to
map cleanly onto other collections too — beer, whisky, books — with a handful of text
changes. See `docs/BUILD_GUIDE.en.md` section 3 for the data model and section 5 for the
AI prompts you'd adjust, or hand the whole guide to Claude Code and let it do the
adaptation for you.

## License / usage

For personal use or modification. Not intended to be resold as-is, in raw source form,
as a template itself.
