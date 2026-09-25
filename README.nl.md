# Wine Cellar — een persoonlijke wijnvoorraad-app met AI-herkenning

Een installeerbare, mobielvriendelijke app om je eigen wijncollectie bij te houden: voeg
flessen toe door een foto van het etiket te maken, laat AI het herkennen, filter en
sorteer op kleur en regio, houd de rijping bij, en vraag "wat past hierbij?" voor een
suggestie uit je eigen voorraad — nooit een fles die je niet daadwerkelijk hebt.

Dit is geen generiek voorraad-template met wijn als placeholder — het is opgebouwd rond
hoe wijnliefhebbers daadwerkelijk over hun kelder denken: land → regio → domein, de
rood/wit/rosé/mousserend-verdeling, drink-binnenkort-vensters, kwalificeringen (DOCG,
AOC, Kabinett, enzovoort).

## Wat zit erin

- Volledige broncode (vanilla JS, geen build-stap nodig)
- 8 voorbeeldwijnen om mee te starten — vervang door je eigen kelder
- Kant-en-klare AI-functies: foto-herkenning, bonnetje-herkenning, "wat past hierbij?"-
  suggesties, en automatische research-verrijking op de achtergrond voor nieuwe flessen
- PWA: installeerbaar op het startscherm, werkt offline
- `docs/BUILD_GUIDE.nl.md` / `docs/BUILD_GUIDE.en.md` — volledige architectuur- en
  designdocumentatie (Nederlands en Engels), inclusief een lijst met bugs die al voor je
  zijn opgelost, en een kant-en-klare startprompt voor Claude Code

## Setup (± 15 minuten) — geen programmeerkennis nodig

Je hoeft geen developer te zijn om dit werkend te krijgen. Elke stap hieronder kan
Claude Code voor je doen als je de startprompt uit `docs/BUILD_GUIDE.nl.md` plakt — jij
maakt alleen de twee gratis accounts aan en kopieert twee sleutels over.

1. **Zet de code in een eigen GitHub-repo** en koppel die aan een nieuw project op
   [vercel.com](https://vercel.com) (gratis account is voldoende).
2. **Voeg een database toe**: in je Vercel-project → Storage → maak een KV-database aan
   (of Upstash Redis via de marketplace). De juiste environment variables worden
   automatisch ingesteld.
3. **Zet twee environment variables** in Vercel → Settings → Environment Variables:
   - `APP_PIN` — een zelfgekozen toegangscode voor de app (bv. `1234`). Laat je dit leeg,
     dan is de app open voor iedereen met de link.
   - `ANTHROPIC_API_KEY` — je eigen sleutel van [console.anthropic.com](https://console.anthropic.com)
     (Console → API Keys). Zet ook een klein tegoed (vanaf $5) klaar onder Billing. Dit is
     een apart, betaald tegoed — los van een eventueel Claude.ai-abonnement. Bij normaal
     gebruik (een paar foto's per week) kost dit typisch een paar cent per maand.
4. **Deploy** (gebeurt automatisch bij elke push naar de hoofdbranch).
5. Open de app, voer je pincode in, en begin met het vervangen van de voorbeelddata door
   je eigen kelder — handmatig, of gewoon door foto's te maken van de flessen die je al
   hebt.

## Geen wijnliefhebber? Werkt ook voor andere verzamelingen.

Het datamodel (land/regio/domein/druivenras, kwalificering, jaartal) is met een paar
tekstuele aanpassingen ook te hergebruiken voor andere verzamelingen — bier, whisky,
boeken. Zie `docs/BUILD_GUIDE.nl.md` sectie 3 voor het datamodel en sectie 5 voor de
AI-prompts die je zou aanpassen, of geef de hele gids aan Claude Code en laat het de
aanpassing voor je doen.

## Licentie / gebruik

Voor eigen gebruik of aanpassing. Niet bedoeld om de ruwe broncode zelf weer als template
door te verkopen.
