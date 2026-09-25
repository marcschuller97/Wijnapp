# Bouwgids: een persoonlijke wijnkelder-PWA met AI-herkenning

Dit is de complete specificatie achter de app in deze repository: een installeerbare,
mobielvriendelijke wijnkelder-tracker met foto-herkenning, gerecht-suggesties en
automatische research-verrijking. De code die je al hebt is een volledig werkende
wijn-app — je hoeft **niets** vanaf nul te bouwen om 'm voor wijn te gebruiken. Dit
document is geschreven voor **Claude Code** (of een vergelijkbare agentic coding-tool
met bestands- en terminaltoegang), zodat het ook kan uitleggen *waarom* dingen zo gebouwd
zijn, voor het geval je het ontwerp wilt aanpassen, een functie wilt toevoegen, of
hetzelfde patroon voor een ander soort verzameling wilt hergebruiken (bier, whisky,
boeken, planten, gereedschap...).

**Wil je 'm gewoon als wijnkelder-app gebruiken?** Ga direct naar sectie 6
(Setup-stappen) — er is verder geen datamodel- of ontwerpwerk meer te doen.

## Startprompt (alleen nodig als je aanpast of hergebruikt)

Wil je het ontwerp veranderen, een functie toevoegen, of deze app ombouwen van een
wijnkelder naar een ander soort verzameling? Open dit project dan in Claude Code en plak
onderstaande tekst als eerste bericht. Pas de cursief gemarkeerde plekken aan naar wens
voordat je 'm verstuurt.

```
Lees docs/BUILD_GUIDE.nl.md volledig door — dat is de volledige specificatie voor de app die
ik wil bouwen. Bouw de app stap voor stap op, in deze volgorde, en test na elke fase
lokaal in de browser voordat je verdergaat:

1. Projectstructuur en bestandsindeling opzetten (sectie 2)
2. Datamodel en state-laag (sectie 3) — dit wordt een voorraad-app voor: [WIJZIG DIT: bv.
   "bierflesjes" / "whiskyflessen" / "boeken" / "plantenverzameling"]. Pas de velden uit
   sectie 3 aan naar dit domein (bv. bij bier: brouwerij/stijl/alcoholpercentage in plaats
   van domein/druivenras).
3. De render-laag en event-delegation-patroon (sectie 2), met het beschreven designsysteem
   — gebruik dit kleurenpalet en deze lettertypes: [WIJZIG DIT, of laat het weg om het
   voorbeeld uit de bouwgids aan te houden]
4. Basisfunctionaliteit: toevoegen/bewerken/verwijderen, filters, sortering, zoeken,
   CSV-export, "houdbaarheid/drink-binnenkort"-indicator
5. De drie AI-endpoints uit sectie 5 (foto-herkenning, contextuele suggestie, en optioneel
   de automatische verrijking) — gebruik overal het goedkoopste/snelste beschikbare
   Claude-model
6. PWA-configuratie: manifest, service worker met de cache-strategie uit sectie 2
7. Verwerk vooraf de valkuilen uit sectie 4 direct in de code — bouw ze niet per ongeluk
   opnieuw in

Loop na het bouwen zelf de valkuillenlijst (sectie 4) langs en verifieer expliciet dat elk
punt is afgedekt. Vraag mij alleen om input bij een echte inhoudelijke keuze (zoals het
domein in stap 2, of het kleurenpalet in stap 3) — werk de rest zelfstandig af zonder
tussentijds te vragen om bevestiging. Zodra alles lokaal werkt, help me met de deploy-stappen
uit sectie 6 (ik maak zelf de accounts aan bij Vercel en Anthropic).
```

## 1. Wat de app moet doen

- Voorraadbeheer: items toevoegen, aantallen ophogen/verlagen, verwijderen, "opgedronken/
  verbruikt" markeren (met historie).
- Navigatie in lagen: land → gebied → producent → item (of een vergelijkbare hiërarchie
  passend bij het domein).
- Kleur-/categoriefilters op het hoofdscherm met live tellers, en binnen een filter
  secundaire sorteeropties (A-Z, prijs, urgentie).
- Een "rijpings"- of "houdbaarheids"-indicator per item (gauge/voortgangsbalk) op basis van
  type/kwalificatie en leeftijd.
- Zoekfunctie die op naam/producent/categorie filtert, met behoud van focus tijdens typen.
- Een "Onlangs toegevoegd"-tab die de nieuwste items eerst toont, naast de hoofdtabs
  (Voorraad, Drink binnenkort, Historie) — handig om snel te checken wat er net bij is
  gekomen, vooral na een batch-foto-import.
- Detailscherm per item: algemene info + gestructureerde kenmerken (bij wijn: smaakprofiel),
  opgehaald via een research-taak (zie §5).
- CSV-export van de volledige voorraad.
- Foto-herkenning: éénof meerdere foto's uploaden (ook meerdere items per foto), of een
  foto van een aankoopbon, waarna de gegevens automatisch worden voorgesteld ter controle
  vóór toevoegen.
- Contextuele suggestiefunctie: gebruiker beschrijft een use-case ("dit eten we vanavond"),
  AI kiest het best passende item uit de EIGEN voorraad (nooit iets buiten de voorraad
  verzinnen).
- PWA: installeerbaar op het startscherm, werkt offline (laatst geziene data), geen
  appstore nodig.
- Gedeelde toegang: meerdere mensen (bv. gezinsleden) werken op dezelfde voorraad, met een
  simpele pincode als toegangsslot (geen volwaardig account-systeem nodig voor een
  single-household use case).

## 2. Techstack en architectuurkeuzes

**Bewust gekozen: geen framework, geen build-stap.**
Vanilla JavaScript met native ES modules (`<script type="module">`), rechtstreeks in de
browser — geen React/Vue, geen webpack/vite. Dit houdt de app extreem licht, snel te
deployen (geen build pipeline) en makkelijk te doorgronden voor iteratief werken met een
AI-assistent.

| Laag | Keuze | Waarom |
|---|---|---|
| Hosting + serverless functies | Vercel | Gratis tier ruim voldoende, git-push-to-deploy, native serverless functions in `/api` |
| Gedeelde data-opslag | Vercel KV (Upstash Redis) | Simpele key-value store, één JSON-blob is genoeg voor deze schaal |
| Auth | Eén gedeelde pincode via env var, serverside gecontroleerd | Geen accountsysteem nodig voor een huishouden; simpel en snel |
| AI-model | Claude Haiku (goedkoopste/snelste model) | Ruim voldoende voor foto→JSON-extractie en tekst-matching; kosten in centen per gebruik |
| Offline-ondersteuning | Service worker, network-first met cache-fallback | App blijft bruikbaar zonder verbinding met laatst bekende data |

**Renderpatroon: één centrale `render()` functie + event delegation.**
Geen component-framework nodig: één `ui`-state-object in het hoofdmodule, één
`render()`-functie die de hele `#app`-container herschrijft (`innerHTML =`), en **één
click/input-listener op het root-element** die op basis van een `data-action`-attribuut
routeert naar de juiste handler. Dit voorkomt het probleem van individuele
`onclick`-handlers die breken op speciale tekens (apostrofs in namen bijvoorbeeld) — alle
tekst gaat door een `escapeHtml()`-functie, en acties lopen nooit via inline JS-strings.

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

**Bestandsstructuur:**
```
index.html              # shell, laadt css/js
manifest.json           # PWA-manifest
sw.js                   # service worker (cache-versie ophogen bij elke wijziging!)
css/styles.css          # alle styling, CSS-variabelen voor het kleurenpalet
js/
  app.js                # state, render(), event delegation, alle handlers
  state.js              # data-laag: laden/opslaan, CRUD-functies, sync met server
  auth.js                # pincode-scherm + header-injectie voor API-calls
  model.js              # domeinlogica (bv. rijpingsberekening)
  utils.js              # escapeHtml, formatteren, etc.
  render/                # één module per view/component, elk exporteert een pure functie
                          # die een HTML-string teruggeeft
                          # (incl. onlangs.js voor de "Onlangs toegevoegd"-tab)
api/
  inventory.js           # GET/PUT naar de KV-store, pincode-check
  recognize.js            # foto → Claude vision → JSON
  pairing.js               # tekst-vraag + voorraad → Claude → aanbeveling
  enrich.js                # optioneel: automatische research-verrijking per item (zie §5b)
```

**Design-systeem** (pas aan naar eigen smaak, maar dit werkte goed voor een premium gevoel):
- Kleuren als CSS custom properties in `:root` — donker basisthema, warm goud-accent,
  bordeauxrood voor primaire acties.
- Drie lettertypes met duidelijke rolverdeling: een serif-displayfont voor titels/namen
  (bv. Fraunces), een neutrale sans-serif voor UI-tekst (bv. Inter), en een monospace voor
  labels/metadata (bv. JetBrains Mono) — dat laatste geeft een "technisch/precies" gevoel
  dat goed past bij een inventarisatie-app.
- Kaarten met subtiele radial-gradient achtergronden i.p.v. platte kleuren, zachte
  schaduwen, ronde hoeken (14px `--radius`).
- Tabbalk: zodra je meer dan 3-4 tabs hebt, laat ze niet krimpen om te passen — geef
  elke tab-knop dezelfde **vaste breedte** en zet ze in een eigen horizontaal
  scrollbare strook (`overflow-x: auto`, verborgen scrollbar) tussen de vaste home-/
  toevoegen-knoppen. Dat houdt tabs leesbaar en gelijk van formaat i.p.v. tekst
  ineen te knijpen, en oogt als "swipe voor meer" in plaats van een te krap rijtje.

## 3. Datamodel

Eén simpel state-object, geserialiseerd als JSON in de KV-store:

```js
{
  inventory: [
    {
      id: 'w0',                    // uniek, prefix + oplopend nummer
      land, gebied, domein, naam,  // hiërarchie-velden (pas aan per domein)
      jaartal, druivenras,          // domein-specifieke kenmerken
      kleur, mousserend, kwalificering,
      aantal, prijs,
      opmerkingen: '',              // vrij invulveld: van wie gekregen, gelegenheid, etc.
      omschrijving: '',             // AI-research: algemene info (optioneel, zie §5)
      smaakprofiel: [],              // AI-research: korte kenmerken-lijst (optioneel)
      toegevoegdOp: '',              // ISO-tijdstempel, eenmalig gezet bij aanmaak —
                                      // voedt de "Onlangs toegevoegd"-tab (sorteer
                                      // aflopend, filter op items die 'm hebben).
                                      // Nooit zetten bij het bijvullen van voorraad.
    },
  ],
  history: [ { id, domein, naam, jaartal, datum } ],
  ownerName: '',
}
```

## 4. Bekende valkuilen — voorkom deze iteraties

Dit is de meest waardevolle sectie: dit zijn concrete bugs die pas na meerdere ronden
testen aan het licht kwamen. Bouw ze meteen goed.

1. **Zoekveld verliest focus bij elke toetsaanslag.** Omdat `render()` de hele container
   herschrijft, verliest een input-veld zijn focus na elke keystroke tenzij je dit expliciet
   herstelt. Fix: sla `document.activeElement` + `selectionStart/End` op vóór de re-render,
   en herstel na afloop als het actieve element het zoekveld was.
2. **Apostrofs breken inline `onclick`-handlers.** Gebruik nooit `onclick="doIets('${naam}')"`
   in template strings — een naam met een apostrof breekt de HTML. Gebruik uitsluitend
   event delegation met `data-action`/`data-id`-attributen, en `escapeHtml()` op **elke**
   stuk gebruikersdata dat in HTML terechtkomt (XSS-preventie is hier gratis bijeffect).
3. **Env-var-naamgeving voor KV verschilt per aanbieder.** Vercel's eigen "KV"-product en de
   Upstash-marketplace-integratie geven andere env-varnamen voor dezelfde REST-API
   (`KV_REST_API_URL` vs. `UPSTASH_REDIS_REST_URL`). Check op **beide** namen in je
   serverless functie, anders werkt het setup-proces niet betrouwbaar voor iedere gebruiker.
4. **Een lege server-response mag nooit een gevulde lokale voorraad overschrijven.** Bij het
   laden van state vanaf de server: als de server leeg terugkomt maar je hebt al lokale data
   (localStorage), stuur die dan omhoog in plaats van blind te synchroniseren — anders kan
   een tijdelijke KV-hik je hele voorraad wissen.
5. **File-input `.value = ''` leegt soms de al-uitgelezen FileList.** Als je na het
   verwerken van een bestandsupload `input.value = ''` zet om het veld te resetten, doe dat
   ÁLTIJD ná het omzetten van `input.files` naar een los array (`Array.from(...)`) — in
   sommige browsers is `.files` een levende referentie die leegloopt zodra je `.value` wist,
   ook al had je 'm net daarvoor "opgeslagen" in een variabele.
6. **Tekstlabels die midden in een woord afbreken.** Lange labels zonder spaties (zoals
   voorvoegsels met een punt: `VDP.Ortswein`) breken lelijk af in kleine ronde badges. Fix:
   voeg met een regex een spatie toe na het voorvoegsel vóórdat je het rendert, plus
   `overflow-wrap: anywhere` als vangnet in CSS.
7. **Service worker cache-versie ophogen bij élke wijziging.** Gebruik een network-first
   fetch-strategie (altijd proberen live te halen, cache alleen als offline-fallback) én
   verhoog de `CACHE_NAME`-constante bij elke deploy — anders zien gebruikers oude versies
   op mobiel, waar de cache hardnekkiger is dan op desktop.
8. **API-routes nooit uit de cache serveren.** Sluit `/api/*` expliciet uit in de
   fetch-handler van de service worker, anders krijg je verouderde voorraadgegevens te zien
   na een wijziging door een ander gezinslid.
9. **Nooit de API-sleutel clientside gebruiken.** Alle aanroepen naar het AI-model lopen via
   een serverless functie die de sleutel uit een environment variable leest — de sleutel
   komt nooit in de browser-JS terecht.
10. **Web-search-antwoorden zijn geen kaal JSON.** Als je het model een zoekmachine geeft
    (voor research-taken), voegt het vaak een inleidende zin toe ("Hier is het JSON-object:")
    vóór een ```json-codeblok, én citatie-tags (`<cite index="...">...</cite>`) middenin de
    tekst zelf. Los dit op met (a) een regex die eerst een codeblok probeert te pakken en
    anders het eerste `{...}`-blok in de tekst zoekt, en (b) een tweede regex die alle
    `<cite>`-tags uit de uiteindelijke tekstvelden strippt vóórdat je ze opslaat.
11. **Een re-render reset de scrollpositie van elk horizontaal scrollbaar element**,
    inclusief een scrollbare tabbalk. Als een gebruiker de tabbalk naar rechts scrolt en
    op een tab tikt die dicht bij de rand staat, herbouwt de volgende `render()` de DOM
    helemaal opnieuw en springt de scrollcontainer terug naar het begin — de zojuist
    geselecteerde tab kan zo net buiten beeld belanden, direct nadat 'm is gekozen. Fix:
    zoek na elke `render()` het element met de actieve staat op (bv. `.tab-btn.active`)
    en roep daarop `el.scrollIntoView({ block: 'nearest', inline: 'nearest' })` aan —
    goedkoop om bij elke render aan te roepen, want het doet niets als het element al
    zichtbaar is.

## 5. AI-integratie (losse endpoints, elk met één taak)

Gebruik voor alle drie de kern-endpoints (a, c en de optionele b) **het goedkoopste/snelste model** — dit is eenvoudige
extractie/matching-werk, geen zware redenering nodig, en dat houdt de kosten
verwaarloosbaar (centen per aanroep).

**a) Foto → gestructureerde data** (`api/recognize.js`)
Client verkleint de foto eerst clientside (canvas, max ~1500px lange zijde, JPEG-kwaliteit
~0.85) vóór upload — dit houdt zowel de kosten als de payload-grootte laag. Stuur één of
meerdere afbeeldingen in dezelfde aanroep; laat het model expliciet weten dat er meerdere
items op één foto kunnen staan, en dat het bij twijfel liever een leeg resultaat teruggeeft
dan iets verzint. Reageer met een JSON-array, ook bij één herkend item — dat houdt de
client-side afhandeling consistent voor foto's mét en zonder meerdere items.

**b) Research-verrijking** (`api/enrich.js`, optioneel)
Voor het aanvullen van achtergrondinformatie per item (algemene info + kenmerken) kan het
model een zoekmachine-tool krijgen (bv. `web_search_20250305`) en na het toevoegen van een
nieuw item automatisch op de achtergrond research doen — geen handmatige actie nodig. Dit
kost per aanroep meer dan de andere twee endpoints (het model doorzoekt het web, en
zoekopdrachten worden door Anthropic apart per gebruik gefactureerd, los van tokens — reken
dus na of dit de moeite waard is voor je use case, of maak het een expliciete "verrijk deze
wijn"-knop i.p.v. automatisch bij elke toevoeging).

Let op: het antwoord van een model met een zoek-tool is **geen kaal JSON** — er staat vaak
inleidende tekst vóór een codeblok, en `<cite>`-tags middenin de tekstvelden zelf (zie
valkuil 10 in §4). Vraag in de prompt expliciet om alléén JSON als laatste bericht, zonder
inleiding en zonder bronvermeldingen in de tekst, en verwerk het antwoord altijd defensief
(fence-eerst, dan brace-matching, dan cite-tags strippen) — vertrouw niet blind op het model
om zich daaraan te houden. Vraag ook expliciet om lege velden i.p.v. verzonnen informatie
wanneer er online niets te vinden is.

Datzelfde endpoint is ook een goede plek om **velden te corrigeren die een foto-herkenning
verkeerd had.** Een foto van een etiket leest het druivenras of de precieze subregio vaak
verkeerd (of helemaal niet), en een prijs staat er sowieso nooit op. Omdat het model toch al
op het web zoekt naar dit specifieke item, laat het dan ook (a) het druivenras en het gebied
verifiëren/corrigeren als het dit met zekerheid kan bepalen — een lege string teruggeven in
plaats van een gok als het niet zeker is — en (b) een realistische gemiddelde winkelprijs
schatten als de prijs van het item nog niet is ingevuld. Pas aan de clientkant de prijs
alleen toe als de bestaande waarde leeg/0 is (overschrijf nooit een echte prijs die de
gebruiker zelf heeft ingevoerd, bv. van een kassabon), maar pas een gecorrigeerd druivenras/
gebied altijd toe zodra het model een niet-lege waarde teruggeeft — het punt van vragen is
juist het corrigeren van een onbetrouwbare eerste aflezing, niet alleen het aanvullen van
lege velden.

**c) Contextuele aanbeveling** (`api/pairing.js`)
Stuur de vraag van de gebruiker plus een compacte samenvatting van de **eigen voorraad**
(alleen items die op voorraad zijn) mee, en vraag om 1-3 aanbevelingen **uitsluitend met
ID's die letterlijk in de meegestuurde lijst voorkomen** — valideer dat serverside door de
teruggekregen ID's te toetsen aan een `Set` van geldige ID's, en filter ongeldige matches
eruit. Dit voorkomt dat het model een niet-bestaand item aanraadt.

## 6. Setup-stappen voor een nieuwe deployment

1. Maak een GitHub-repo aan met deze codebase, koppel 'm aan een nieuw Vercel-project.
2. Voeg een Vercel KV- (of Upstash Redis-)database toe aan het project via het
   Vercel-dashboard — de env vars worden automatisch gezet.
3. Zet in Vercel → Settings → Environment Variables:
   - `APP_PIN` — de gewenste toegangscode (blijft leeg = geen slot).
   - `ANTHROPIC_API_KEY` — eigen sleutel van console.anthropic.com (los tegoed, apart van
     een eventueel Claude.ai/Claude Code-abonnement).
4. Deploy (automatisch bij git push). Open de app, ontgrendel met de pincode, en de
   standaard-voorbeelddata verschijnt als startpunt.
5. Pas het domein-specifieke datamodel aan (§3) en de seed-data naar eigen smaak.
