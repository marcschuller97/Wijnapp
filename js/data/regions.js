// Wine-region knowledge used to keep the Region field to the broad region
// ("Bourgogne", "Champagne") and move villages/appellations to Place.
// Names use the local spelling found on labels; English variants are aliases.

export const REGIONS = [
  // France
  'Alsace', 'Beaujolais', 'Bordeaux', 'Bourgogne', 'Champagne', 'Corse', 'Jura', 'Languedoc',
  'Languedoc-Roussillon', 'Loire', 'Provence', 'Rhône', 'Roussillon', 'Savoie', 'Sud-Ouest',
  // Italy
  'Abruzzo', 'Alto Adige', 'Campania', 'Emilia-Romagna', 'Friuli', 'Lombardia', 'Marche', 'Piemonte',
  'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino', 'Umbria', 'Veneto',
  // Spain
  'Bierzo', 'Cava', 'Jerez', 'Navarra', 'Penedès', 'Priorat', 'Rías Baixas', 'Ribera del Duero', 'Rioja',
  'Rueda', 'Toro',
  // Germany
  'Ahr', 'Baden', 'Franken', 'Mittelrhein', 'Mosel', 'Nahe', 'Pfalz', 'Rheingau', 'Rheinhessen',
  'Saale-Unstrut', 'Sachsen', 'Württemberg',
  // Portugal, Austria
  'Alentejo', 'Bairrada', 'Dão', 'Douro', 'Vinho Verde', 'Burgenland', 'Kamptal', 'Kremstal',
  'Steiermark', 'Wachau',
  // New World
  'Barossa Valley', 'McLaren Vale', 'Margaret River', 'Marlborough', 'Hawke\'s Bay', 'Central Otago',
  'Mendoza', 'Napa Valley', 'Sonoma', 'Stellenbosch', 'Swartland', 'Colchagua',
];

export const REGION_ALIASES = {
  burgundy: 'Bourgogne',
  rhone: 'Rhône',
  'rhone valley': 'Rhône',
  'vallee du rhone': 'Rhône',
  'loire valley': 'Loire',
  'val de loire': 'Loire',
  'vallee de la loire': 'Loire',
  'south west france': 'Sud-Ouest',
  'southwest france': 'Sud-Ouest',
  corsica: 'Corse',
  tuscany: 'Toscana',
  piedmont: 'Piemonte',
  sicily: 'Sicilia',
  sardinia: 'Sardegna',
  lombardy: 'Lombardia',
  apulia: 'Puglia',
  'friuli venezia giulia': 'Friuli',
  'trentino alto adige': 'Trentino',
  'sudtirol': 'Alto Adige',
  'south tyrol': 'Alto Adige',
  'mosel saar ruwer': 'Mosel',
  moselle: 'Mosel',
  palatinate: 'Pfalz',
  franconia: 'Franken',
  saxony: 'Sachsen',
  styria: 'Steiermark',
  napa: 'Napa Valley',
  barossa: 'Barossa Valley',
};

// Village / appellation → broad region.
const APPELLATIONS = {
  Bourgogne: [
    'Chablis', 'Irancy', 'Marsannay', 'Fixin', 'Gevrey-Chambertin', 'Morey-Saint-Denis', 'Chambolle-Musigny',
    'Vougeot', 'Vosne-Romanée', 'Nuits-Saint-Georges', 'Côte de Nuits', 'Côte de Nuits-Villages', 'Ladoix',
    'Aloxe-Corton', 'Corton', 'Corton-Charlemagne', 'Pernand-Vergelesses', 'Savigny-lès-Beaune',
    'Chorey-lès-Beaune', 'Beaune', 'Côte de Beaune', 'Pommard', 'Volnay', 'Monthélie', 'Auxey-Duresses',
    'Meursault', 'Puligny-Montrachet', 'Chassagne-Montrachet', 'Saint-Aubin', 'Santenay', 'Maranges',
    'Rully', 'Mercurey', 'Givry', 'Montagny', 'Côte Chalonnaise', 'Mâcon', 'Mâcon-Villages', 'Pouilly-Fuissé',
    'Saint-Véran', 'Viré-Clessé', 'Hautes-Côtes de Nuits', 'Hautes-Côtes de Beaune', 'Crémant de Bourgogne',
    'Petit Chablis', 'Chablis Premier Cru', 'Chablis Grand Cru', 'Saint-Bris', 'Côtes d\'Auxerre',
    'Coulanges-la-Vineuse', 'Tonnerre', 'Épineuil', 'Chitry', 'Vézelay', 'Côte d\'Or',
  ],
  Bordeaux: [
    'Médoc', 'Haut-Médoc', 'Saint-Estèphe', 'Pauillac', 'Saint-Julien', 'Margaux', 'Listrac', 'Moulis',
    'Pessac-Léognan', 'Graves', 'Sauternes', 'Barsac', 'Saint-Émilion', 'Saint-Émilion Grand Cru', 'Pomerol',
    'Lalande-de-Pomerol', 'Fronsac', 'Canon-Fronsac', 'Entre-Deux-Mers', 'Côtes de Bourg', 'Blaye',
    'Côtes de Castillon', 'Castillon', 'Bordeaux Supérieur', 'Côtes de Francs', 'Francs Côtes de Bordeaux',
    'Blaye Côtes de Bordeaux', 'Cadillac Côtes de Bordeaux', 'Castillon Côtes de Bordeaux', 'Côtes de Bordeaux',
    'Montagne-Saint-Émilion', 'Lussac-Saint-Émilion', 'Puisseguin-Saint-Émilion',
  ],
  Rhône: [
    'Côte-Rôtie', 'Condrieu', 'Saint-Joseph', 'Hermitage', 'Crozes-Hermitage', 'Cornas', 'Saint-Péray',
    'Châteauneuf-du-Pape', 'Gigondas', 'Vacqueyras', 'Rasteau', 'Cairanne', 'Vinsobres', 'Lirac', 'Tavel',
    'Beaumes-de-Venise', 'Côtes du Rhône', 'Côtes du Rhône Villages', 'Ventoux', 'Luberon',
  ],
  Loire: [
    'Sancerre', 'Pouilly-Fumé', 'Menetou-Salon', 'Quincy', 'Reuilly', 'Vouvray', 'Montlouis', 'Chinon',
    'Bourgueil', 'Saint-Nicolas-de-Bourgueil', 'Saumur', 'Saumur-Champigny', 'Anjou', 'Savennières',
    'Coteaux du Layon', 'Muscadet', 'Muscadet Sèvre et Maine', 'Touraine', 'Crémant de Loire',
  ],
  Champagne: [
    'Reims', 'Épernay', 'Aÿ', 'Ay', 'Avize', 'Cramant', 'Le Mesnil-sur-Oger', 'Oger', 'Bouzy', 'Ambonnay',
    'Verzenay', 'Verzy', 'Hautvillers', 'Côte des Blancs', 'Montagne de Reims', 'Vallée de la Marne',
    'Côte des Bar',
  ],
  Beaujolais: [
    'Morgon', 'Fleurie', 'Moulin-à-Vent', 'Brouilly', 'Côte de Brouilly', 'Juliénas', 'Chénas', 'Chiroubles',
    'Régnié', 'Saint-Amour', 'Beaujolais-Villages',
  ],
  Languedoc: ['Pic Saint-Loup', 'Minervois', 'Corbières', 'Faugères', 'Saint-Chinian', 'Terrasses du Larzac', 'Picpoul de Pinet', 'Limoux'],
  Provence: ['Bandol', 'Cassis', 'Côtes de Provence', 'Palette', 'Bellet'],
  'Sud-Ouest': ['Cahors', 'Madiran', 'Jurançon', 'Bergerac', 'Gaillac', 'Monbazillac'],
  Toscana: [
    'Chianti', 'Chianti Classico', 'Chianti Rufina', 'Montalcino', 'Brunello di Montalcino', 'Rosso di Montalcino',
    'Montepulciano', 'Vino Nobile di Montepulciano', 'Bolgheri', 'Maremma', 'San Gimignano',
    'Vernaccia di San Gimignano', 'Morellino di Scansano', 'Carmignano',
  ],
  Piemonte: [
    'Barolo', 'Barbaresco', 'Langhe', 'Roero', 'Alba', 'Asti', 'Barbera d\'Asti', 'Barbera d\'Alba',
    'Dolcetto d\'Alba', 'Nebbiolo d\'Alba', 'Gavi', 'Dogliani', 'Monferrato', 'Gattinara', 'Ghemme',
    'Moscato d\'Asti',
  ],
  Veneto: ['Valpolicella', 'Valpolicella Ripasso', 'Amarone', 'Amarone della Valpolicella', 'Soave', 'Bardolino', 'Prosecco', 'Valdobbiadene', 'Conegliano'],
  Rioja: ['Rioja Alta', 'Rioja Alavesa', 'Rioja Oriental', 'Rioja Baja'],
  Mosel: ['Bernkastel', 'Bernkastel-Kues', 'Piesport', 'Graach', 'Wehlen', 'Ürzig', 'Erden', 'Zeltingen', 'Brauneberg', 'Trittenheim', 'Saar', 'Ruwer', 'Ockfen', 'Wiltingen'],
  Rheingau: ['Rüdesheim', 'Johannisberg', 'Geisenheim', 'Oestrich', 'Hattenheim', 'Erbach', 'Kiedrich', 'Rauenthal', 'Hochheim', 'Assmannshausen'],
  Pfalz: ['Forst', 'Deidesheim', 'Wachenheim', 'Ungstein', 'Bad Dürkheim', 'Kallstadt', 'Siebeldingen', 'Birkweiler'],
  Rheinhessen: ['Nierstein', 'Nackenheim', 'Oppenheim', 'Westhofen', 'Flörsheim-Dalsheim', 'Bingen'],
  Ahr: ['Mayschoß', 'Dernau', 'Rech', 'Walporzheim', 'Ahrweiler', 'Bad Neuenahr', 'Bad Neuenahr-Ahrweiler', 'Altenahr', 'Marienthal'],
  Nahe: ['Schlossböckelheim', 'Niederhausen', 'Monzingen', 'Bad Kreuznach'],
  Douro: ['Porto', 'Cima Corgo', 'Baixo Corgo', 'Douro Superior'],
};

export function regionKey(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’.]/g, ' ')
    .replace(/\bst\b/g, 'saint')
    .replace(/\s+/g, ' ')
    .trim();
}

const REGION_BY_KEY = new Map(REGIONS.map((r) => [regionKey(r), r]));
Object.entries(REGION_ALIASES).forEach(([alias, r]) => REGION_BY_KEY.set(regionKey(alias), r));

const APPELLATION_BY_KEY = new Map();
Object.entries(APPELLATIONS).forEach(([region, places]) =>
  places.forEach((p) => APPELLATION_BY_KEY.set(regionKey(p), { region, place: p }))
);

// Country names (several languages) that sometimes trail a region:
// "Chablis, Burgundy, France".
const COUNTRY_KEYS = new Set(
  ['France', 'Frankrijk', 'Frankreich', 'Italy', 'Italia', 'Italië', 'Italie', 'Germany', 'Deutschland', 'Duitsland',
    'Spain', 'España', 'Spanje', 'Portugal', 'Austria', 'Österreich', 'Oostenrijk', 'USA', 'United States',
    'Australia', 'Australië', 'New Zealand', 'Nieuw-Zeeland', 'South Africa', 'Zuid-Afrika', 'Argentina',
    'Argentinië', 'Chile', 'Chili'].map(regionKey)
);

export function isCountryName(text, country) {
  const k = regionKey(text);
  return COUNTRY_KEYS.has(k) || (!!country && k === regionKey(country));
}

// Longest region names first, so "Languedoc-Roussillon" beats "Languedoc".
const REGION_KEYS_LONGEST_FIRST = [...new Set([...REGION_BY_KEY.keys()])].sort((a, b) => b.length - a.length);

/**
 * "Bourgogne Côtes d'Auxerre" → { region: 'Bourgogne', rest: "Côtes d'Auxerre" }
 * when the text starts with a known region followed by more words.
 */
export function regionPrefix(text) {
  const original = String(text || '').trim();
  const key = regionKey(original);
  for (const k of REGION_KEYS_LONGEST_FIRST) {
    if (!key.startsWith(k + ' ')) continue;
    for (let i = 1; i < original.length; i++) {
      if (/[\s-]/.test(original[i]) && regionKey(original.slice(0, i)) === k) {
        const rest = original.slice(i + 1).replace(/^[\s-]+/, '').trim();
        if (rest) return { region: REGION_BY_KEY.get(k), rest };
      }
    }
  }
  return null;
}

export function canonicalRegion(text) {
  return REGION_BY_KEY.get(regionKey(text)) || null;
}

export function appellationInfo(text) {
  return APPELLATION_BY_KEY.get(regionKey(text)) || null;
}
