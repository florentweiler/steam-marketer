export const STRINGS = {
  fr: {
    title: 'Quels genres marchent vraiment sur Steam ?',
    subtitle: 'Jeux payants sortis sur Steam du {from} au {to} : taux de réussite par tag et saturation.',
    langSwitch: 'EN',
    themeToggle: 'Thème',
    // filters
    fClass: 'Taille du studio',
    fPrice: 'Prix',
    fPriceAll: 'Tous',
    fEa: 'Accès anticipé',
    fEaAll: 'Inclus',
    fEaOnly: 'Uniquement',
    fEaNo: 'Exclus',
    fRecent: 'Sorties récentes',
    fRecentAll: 'Toutes',
    fRecentExclude: 'Exclure les {n} derniers jours',
    fThreshold: 'Seuil de réussite',
    fTopN: 'Tags par jeu',
    fTopNHint: 'Les N tags les plus votés de chaque jeu',
    fMinN: 'Sorties min. par tag',
    fGeneric: 'Masquer les tags génériques',
    fPeriod: 'Période de sortie',
    periodLast12: 'Dernière année',
    periodLastYears: '{n} dernières années',
    periodRolling: 'Années glissantes',
    periodSpan: 'Plusieurs années',
    periodCalendar: 'Années civiles',
    periodCustom: 'Personnalisée…',
    periodPartial: 'partielle',
    periodFrom: 'Du mois',
    periodTo: 'Au mois',
    periodCol: 'Période',
    detailYearly: 'Évolution par année',
    yearlyNote: 'L’indice (taux ÷ moyenne de la même année) se compare d’une année à l’autre ; le taux brut avantage les années anciennes.',
    ageBias: 'Les ventes sont cumulées depuis la sortie : un jeu plus ancien a eu plus de temps pour atteindre le seuil. Comparer des périodes entre elles avantage les plus anciennes ; l’indice (taux ÷ moyenne de la même période) reste comparable.',
    fMinEase: 'Facilité solo min.',
    fMinEaseAll: 'Toutes',
    // tabs
    tabTags: 'Genres',
    tabPairs: 'Combinaisons',
    tabGames: 'Jeux',
    tabMethod: 'Méthodologie',
    // kpis
    kReleased: 'Jeux payants sortis',
    kHits: 'Jeux ≥ {threshold} brut',
    kRate: 'Taux de réussite global',
    kGross: 'CA brut cumulé des succès',
    // scatter
    scatterTitle: 'Taux de réussite vs saturation',
    scatterSub: 'Chaque point est un tag. En haut à gauche : peu de concurrence, beaucoup de succès. La ligne indique la moyenne.',
    axisReleases: 'Jeux sortis avec ce tag (échelle log)',
    axisRate: 'Taux de réussite',
    average: 'moyenne {rate}',
    qNiche: 'Niches porteuses',
    qCrowded: 'Porteurs mais encombrés',
    qSaturated: 'Saturés',
    qCold: 'Délaissés',
    // table
    tableTitle: 'Classement des tags',
    tableSub: 'Trié par défaut sur la borne basse du taux de réussite (intervalle de Wilson à 95 %), qui pénalise les tags avec peu de sorties.',
    colTag: 'Tag',
    colReleased: 'Sorties',
    colHits: 'Succès',
    colRate: 'Taux',
    colWilson: 'Taux prudent',
    colLift: 'Indice',
    colMedian: 'CA médian succès',
    colTotal: 'CA total succès',
    colTop3: 'Part top 3',
    colPrice: 'Prix médian succès',
    colGamePrice: 'Prix',
    colEase: 'Facilité solo',
    colSolo: 'Succès autoédités',
    easeUnscored: 'Tag thématique, non noté',
    colPair: 'Combinaison',
    colGame: 'Jeu',
    colGross: 'CA brut est.',
    colCopies: 'Ventes est.',
    colReleasedOn: 'Sortie',
    colClass: 'Studio',
    colReviews: 'Avis',
    help: {
      colReleased: 'Nombre de jeux payants sortis avec ce tag : la saturation.',
      colHits: 'Jeux ayant dépassé le seuil de CA brut.',
      colRate: 'Succès ÷ sorties.',
      colWilson: 'Borne basse de l’intervalle de confiance à 95 % : un tag avec 3 succès sur 5 sorties n’est pas plus sûr qu’un tag à 60 sur 300.',
      colLift: 'Taux du tag ÷ taux moyen. 2,0 = deux fois plus de chances que la moyenne.',
      colTop3: 'Part du CA des succès captée par les 3 plus gros jeux. Proche de 100 % = genre porté par un hit.',
      colEase: 'Facilité de développement pour un dev indé solo, de 1 (très dur) à 5 (très facile). Note éditoriale, voir Méthodologie. Pour une combinaison, le tag le plus dur l’emporte.',
      colSolo: 'Part des succès faits par des studios amateurs ou indés qui s’autoéditent. Élevé = genre accessible aux petites équipes.',
    },
    exportCsv: 'Exporter CSV',
    searchTag: 'Filtrer les tags…',
    searchGame: 'Rechercher un jeu ou un studio…',
    pairsTitle: 'Combinaisons de deux tags',
    pairsSub: 'Les niches se cachent souvent dans les croisements. Calculé sur les {n} premiers tags de chaque jeu.',
    pairsContaining: 'Contenant le tag',
    anyTag: 'N’importe lequel',
    gamesTitle: 'Jeux ayant dépassé le seuil',
    gamesSub: '{n} jeux correspondent aux filtres.',
    showMore: 'Afficher plus',
    noResult: 'Aucun résultat avec ces filtres.',
    belowMinN: 'moins de {min} sorties',
    tagsHiddenMinN: '{n} tags ne sont pas affichés : moins de {min} sorties sur la période. Baisse « Sorties minimum » pour les voir.',
    tagsHiddenEase: '{n} tags de plus sont écartés par le filtre de facilité solo.',
    // detail
    detailLabel: 'Détail du tag',
    detailReleases: 'Sorties par mois',
    detailHits: 'Succès par mois',
    detailTopGames: 'Plus gros succès',
    detailCompanions: 'Meilleurs tags associés',
    detailCompanionsSub: 'Taux de réussite des jeux ayant ce tag et le tag associé',
    seeAllGames: 'Voir tous les jeux',
    close: 'Fermer',
    tipReleased: '{n} sorties',
    tipHits: '{n} succès',
    tipRate: 'taux {rate} (prudent {wilson})',
    loading: 'Chargement des données…',
    loadError: 'Impossible de charger les données.',
    updated: 'Données collectées le {date}',
    classNames: { Indie: 'Indé', AA: 'AA', AAA: 'AAA', Hobbyist: 'Amateur', Unknown: 'Inconnu' },
    footer: 'Projet open data. Estimations : les ventes réelles ne sont pas publiques.',
    footerLegal: 'Non affilié à Valve ni à Steam',
    sourceCode: 'Code source',
  },
  en: {
    title: 'Which genres really sell on Steam?',
    subtitle: 'Paid games released on Steam from {from} to {to}: success rate per tag, weighted against saturation.',
    langSwitch: 'FR',
    themeToggle: 'Theme',
    fClass: 'Studio size',
    fPrice: 'Price',
    fPriceAll: 'All',
    fEa: 'Early Access',
    fEaAll: 'Included',
    fEaOnly: 'Only',
    fEaNo: 'Excluded',
    fRecent: 'Recent releases',
    fRecentAll: 'All',
    fRecentExclude: 'Exclude last {n} days',
    fThreshold: 'Success threshold',
    fTopN: 'Tags per game',
    fTopNHint: 'Each game’s N most-voted tags',
    fMinN: 'Min. releases per tag',
    fGeneric: 'Hide generic tags',
    fPeriod: 'Release period',
    periodLast12: 'Last year',
    periodLastYears: 'Last {n} years',
    periodRolling: 'Rolling years',
    periodSpan: 'Several years',
    periodCalendar: 'Calendar years',
    periodCustom: 'Custom…',
    periodPartial: 'partial',
    periodFrom: 'From month',
    periodTo: 'To month',
    periodCol: 'Period',
    detailYearly: 'Year over year',
    yearlyNote: 'The index (rate ÷ that year’s average) compares across years; the raw rate favors older years.',
    ageBias: 'Sales are lifetime totals: an older game has had more time to reach the threshold. Comparing periods favors the older ones; the index (rate ÷ same-period average) stays comparable.',
    fMinEase: 'Min. solo ease',
    fMinEaseAll: 'Any',
    tabTags: 'Genres',
    tabPairs: 'Combinations',
    tabGames: 'Games',
    tabMethod: 'Methodology',
    kReleased: 'Paid games released',
    kHits: 'Games ≥ {threshold} gross',
    kRate: 'Overall success rate',
    kGross: 'Combined gross of hits',
    scatterTitle: 'Success rate vs saturation',
    scatterSub: 'Each dot is a tag. Top left: little competition, many hits. The line marks the average.',
    axisReleases: 'Games released with this tag (log scale)',
    axisRate: 'Success rate',
    average: 'average {rate}',
    qNiche: 'Promising niches',
    qCrowded: 'Strong but crowded',
    qSaturated: 'Saturated',
    qCold: 'Overlooked',
    tableTitle: 'Tag ranking',
    tableSub: 'Sorted by default on the lower bound of the success rate (95% Wilson interval), which penalizes tags with few releases.',
    colTag: 'Tag',
    colReleased: 'Releases',
    colHits: 'Hits',
    colRate: 'Rate',
    colWilson: 'Cautious rate',
    colLift: 'Index',
    colMedian: 'Median hit gross',
    colTotal: 'Total hit gross',
    colTop3: 'Top 3 share',
    colPrice: 'Median hit price',
    colGamePrice: 'Price',
    colEase: 'Solo ease',
    colSolo: 'Self-published hits',
    easeUnscored: 'Theme tag, not scored',
    colPair: 'Combination',
    colGame: 'Game',
    colGross: 'Est. gross',
    colCopies: 'Est. copies',
    colReleasedOn: 'Released',
    colClass: 'Studio',
    colReviews: 'Reviews',
    help: {
      colReleased: 'Number of paid games released with this tag: the saturation.',
      colHits: 'Games above the gross revenue threshold.',
      colRate: 'Hits ÷ releases.',
      colWilson: 'Lower bound of the 95% confidence interval: 3 hits out of 5 releases is not safer than 60 out of 300.',
      colLift: 'Tag rate ÷ average rate. 2.0 = twice the average odds.',
      colTop3: 'Share of hit revenue captured by the 3 biggest games. Near 100% = genre carried by one hit.',
      colEase: 'Ease of development for a solo indie dev, from 1 (very hard) to 5 (very easy). Editorial score, see Methodology. For a combination, the hardest tag wins.',
      colSolo: 'Share of hits made by self-published hobbyist or indie studios. High = genre within reach of small teams.',
    },
    exportCsv: 'Export CSV',
    searchTag: 'Filter tags…',
    searchGame: 'Search a game or studio…',
    pairsTitle: 'Two-tag combinations',
    pairsSub: 'Niches often hide in crossovers. Computed on each game’s first {n} tags.',
    pairsContaining: 'Containing tag',
    anyTag: 'Any',
    gamesTitle: 'Games above the threshold',
    gamesSub: '{n} games match the filters.',
    showMore: 'Show more',
    noResult: 'No results with these filters.',
    belowMinN: 'fewer than {min} releases',
    tagsHiddenMinN: '{n} tags are not shown: fewer than {min} releases in this period. Lower “Minimum releases” to see them.',
    tagsHiddenEase: '{n} more tags are held back by the solo-ease filter.',
    detailLabel: 'Tag details',
    detailReleases: 'Releases per month',
    detailHits: 'Hits per month',
    detailTopGames: 'Biggest hits',
    detailCompanions: 'Best companion tags',
    detailCompanionsSub: 'Success rate of games having this tag and the companion',
    seeAllGames: 'See all games',
    close: 'Close',
    tipReleased: '{n} releases',
    tipHits: '{n} hits',
    tipRate: 'rate {rate} (cautious {wilson})',
    loading: 'Loading data…',
    loadError: 'Could not load data.',
    updated: 'Data collected on {date}',
    classNames: { Indie: 'Indie', AA: 'AA', AAA: 'AAA', Hobbyist: 'Hobbyist', Unknown: 'Unknown' },
    footer: 'Open data project. Estimates: actual sales are not public.',
    footerLegal: 'Not affiliated with Valve or Steam',
    sourceCode: 'Source code',
  },
};

export const METHOD = {
  fr: `
<h2>Méthodologie</h2>
<h3>Périmètre</h3>
<p>Tous les jeux dont la <strong>première sortie</strong> sur Steam (accès anticipé compris) tombe dans la période sélectionnée. Les données couvrent les 3 dernières années ; la dernière année est affichée par défaut. Les free-to-play, DLC, logiciels et jeux retirés de la boutique sont exclus. Les jeux affichés à 150 $ ou plus le sont aussi : 182 des 187 concernés sont vendus exactement 199,99 $ par une poignée de studios qui clonent des jeux d’objets cachés, un prix destiné à gonfler les classements de revenus plutôt qu’à être payé. Un jeu sorti en accès anticipé avant la période puis passé en 1.0 pendant celle-ci n’est <em>pas</em> compté.</p>
<h3>Sources</h3>
<ul>
<li><strong>Gamalytic</strong> (liste publique gratuite) : estimation des copies vendues, prix, date de sortie, taille du studio (Indé / AA / AAA).</li>
<li><strong>API officielle Steam</strong> (<code>IStoreBrowseService/GetItems</code>, <code>IStoreService/GetTagList</code>) : tags utilisateurs avec leur poids, nombre d’avis, noms des tags en français et en anglais.</li>
</ul>
<h3>Chiffre d’affaires</h3>
<p><strong>CA brut estimé = copies vendues estimées × prix de base actuel en USD.</strong> C’est un chiffre <em>brut</em> : il ne retire ni les promotions, ni les prix régionaux, ni la TVA, ni les remboursements, ni la commission de Steam (30 %). En pratique, le développeur touche souvent entre 35 et 50 % de ce montant. Un jeu est un <strong>succès</strong> quand son CA brut dépasse le seuil choisi (100 000 $ par défaut).</p>
<h3>Tags et saturation</h3>
<p>Chaque jeu est rattaché à ses <em>N</em> tags les plus votés par les joueurs (10 par défaut). Steam n’en expose que 20 au maximum, quel que soit le jeu : c’est le plafond de son API, pas un choix de ce site. Un tag rarement bien classé est donc sous-représenté — 49 % des jeux atteignent ce plafond.</p>
<p>Les tags qui ne décrivent pas un jeu qu’on pourrait décider de faire sont masqués par défaut (case « Masquer les tags génériques ») : les <strong>éloges</strong>, parce que n’importe quel jeu peut être « Atmospheric » ou « Beautiful », et le <strong>méta</strong> — logiciels non-jeux, artefacts de boutique (Early Access, Suite, Bande-son), supports matériels, et « Indé », déjà couvert par le filtre de taille de studio. Les tags de <strong>style</strong> (2D, 3D, Pixel Art, Anime…) restent affichés : ce sont de vrais choix de production. Le classement complet est dans <code>data/tag-classes.json</code>.</p>
<p>Pour chaque tag :</p>
<ul>
<li><strong>Sorties</strong> : nombre de jeux avec le tag. C’est la mesure de saturation.</li>
<li><strong>Taux de réussite</strong> : succès ÷ sorties.</li>
<li><strong>Taux prudent</strong> : borne basse de l’intervalle de Wilson à 95 %. Elle évite qu’un tag avec 2 succès sur 3 sorties arrive en tête du classement.</li>
<li><strong>Indice</strong> : taux du tag ÷ taux global. Au-dessus de 1, le tag fait mieux que la moyenne.</li>
<li><strong>Part top 3</strong> : si elle est proche de 100 %, le genre repose sur un ou deux hits plutôt que sur un marché sain.</li>
</ul>
<p>Le filtre « Sorties minimum » (10 par défaut) retire du classement les tags trop rares pour qu’on en dise quoi que ce soit — la borne de Wilson les pénalise déjà, ce seuil ne fait qu’alléger le tableau. Le nombre de tags ainsi écartés est indiqué sous le tableau, et <strong>la recherche les trouve quand même</strong> : un tag sous le seuil s’affiche avec la mention « moins de N sorties ».</p>
<h3>Limites</h3>
<ul>
<li>Les ventes sont des <strong>estimations</strong> (souvent à ±30–50 % par jeu). Les tendances par tag, calculées sur des centaines de jeux, sont plus fiables que les chiffres d’un jeu isolé.</li>
<li><strong>Biais d’ancienneté</strong> : les ventes sont cumulées depuis la sortie. Un jeu sorti le mois dernier a eu moins de temps pour vendre qu’un jeu sorti il y a 3 ans. Comparer des périodes entre elles avantage donc les plus anciennes : compare plutôt les <em>tags entre eux</em> sur une même période, ou regarde si l’écart d’un tag à la moyenne (l’indice) évolue d’une année à l’autre. Le filtre « Sorties récentes » écarte les jeux trop jeunes pour être jugés.</li>
<li><strong>Corrélation ≠ causalité</strong> : un tag qui réussit peut refléter des studios plus expérimentés ou des budgets plus élevés. Filtre sur « Amateur + Indé » pour comparer ce qui est comparable.</li>
<li>Les tags sont posés par les joueurs <em>après</em> la sortie. Un jeu qui marche reçoit plus de votes, donc des tags plus précis.</li>
<li>Le prix utilisé est le prix actuel, pas celui de lancement.</li>
<li><strong>Taille du studio</strong> : la classification de Gamalytic (Amateur / Indé / AA / AAA) semble tenir compte des ventes. « Amateur » regroupe la majorité des sorties et presque tous les échecs. Filtrer sur « Indé » seul gonfle donc le taux de réussite. Pour un dev indépendant, <strong>Amateur + Indé</strong> est la comparaison la plus honnête.</li>
</ul>
<h3>Facilité de développement en solo</h3>
<p>Deux indicateurs, à lire ensemble :</p>
<ul>
<li><strong>Facilité solo (1 à 5)</strong> : une <em>note éditoriale</em> attribuée à chaque tag de gameplay, de technique ou de format. Elle tient compte du volume d’assets (2D minimaliste &lt; pixel art &lt; 3D stylisée &lt; 3D réaliste), du risque technique (réseau, physique, grands mondes, IA), de la quantité de contenu nécessaire et de la complexité d’équilibrage. Les tags purement thématiques (Sci-fi, Chats, Médiéval…) ne sont pas notés. Pour une combinaison, c’est le tag le plus difficile qui compte. Les notes sont dans <code>data/dev-ease.json</code> et peuvent être discutées.</li>
<li><strong>Succès autoédités</strong> : parmi les succès du tag, la part faite par des studios amateurs ou indés qui s’éditent eux-mêmes. C’est une mesure tirée des données : si des petites équipes réussissent dans ce genre, il est à leur portée. Elle ne distingue pas un dev solo d’un studio indé de 10 personnes.</li>
</ul>
<h3>Reproduire</h3>
<p>Le code de collecte est ouvert : <code>npm run update</code> retélécharge les données et reconstruit le jeu de données, puis <code>npm run serve</code> lance le site en local.</p>`,
  en: `
<h2>Methodology</h2>
<h3>Scope</h3>
<p>Every game whose <strong>first release</strong> on Steam (Early Access included) falls inside the selected period. The data covers the last 3 years; the last year is shown by default. Free-to-play games, DLC, software and delisted games are excluded. So are games listed at $150 or more: 182 of the 187 concerned sell for exactly $199.99, from a handful of studios cloning hidden-object games — a price meant to inflate revenue charts rather than to be paid. A game that entered Early Access before the window and hit 1.0 during it is <em>not</em> counted.</p>
<h3>Sources</h3>
<ul>
<li><strong>Gamalytic</strong> (free public list): estimated copies sold, price, release date, studio size (Indie / AA / AAA).</li>
<li><strong>Official Steam API</strong> (<code>IStoreBrowseService/GetItems</code>, <code>IStoreService/GetTagList</code>): user tags with their weights, review counts, localized tag names.</li>
</ul>
<h3>Revenue</h3>
<p><strong>Estimated gross = estimated copies sold × current base price in USD.</strong> This is <em>gross</em>: discounts, regional pricing, VAT, refunds and Steam’s 30% cut are not removed. In practice the developer often receives 35–50% of it. A game is a <strong>hit</strong> when its gross exceeds the chosen threshold ($100,000 by default).</p>
<h3>Tags and saturation</h3>
<p>Each game is attached to its <em>N</em> most-voted player tags (10 by default). Steam exposes at most 20 tags per game whatever you ask for — its API ceiling, not a choice made here — so a tag that rarely ranks high is under-represented; 49% of games hit that ceiling.</p>
<p>Tags that do not describe a game someone could decide to build are hidden by default (the “Hide generic tags” box): <strong>praise</strong>, because any game can be “Atmospheric” or “Beautiful”, and <strong>meta</strong> — non-game software, store artefacts (Early Access, Sequel, Soundtrack), hardware support, and “Indie”, already covered by the studio-size filter. <strong>Style</strong> tags (2D, 3D, Pixel Graphics, Anime…) stay visible: those are real production choices. The full classification lives in <code>data/tag-classes.json</code>.</p>
<p>For each tag:</p>
<ul>
<li><strong>Releases</strong>: number of games with the tag. This measures saturation.</li>
<li><strong>Success rate</strong>: hits ÷ releases.</li>
<li><strong>Cautious rate</strong>: lower bound of the 95% Wilson interval. It keeps a tag with 2 hits out of 3 releases from topping the ranking.</li>
<li><strong>Index</strong>: tag rate ÷ overall rate. Above 1, the tag beats the average.</li>
<li><strong>Top 3 share</strong>: near 100% means the genre rests on one or two hits rather than a healthy market.</li>
</ul>
<p>The “Minimum releases” filter (10 by default) keeps out tags too rare to say anything about — the Wilson bound already penalises them, so the threshold only declutters the table. The number of tags held back is printed under the table, and <strong>search finds them anyway</strong>: a tag below the bar shows up flagged “fewer than N releases”.</p>
<h3>Limitations</h3>
<ul>
<li>Sales are <strong>estimates</strong> (often ±30–50% per game). Tag-level trends over hundreds of games are more reliable than any single figure.</li>
<li><strong>Age bias</strong>: sales are lifetime totals. A game released last month has had less time to sell than one released 3 years ago, so comparing periods favors the older ones. Compare <em>tags with each other</em> within the same period instead, or check whether a tag’s gap to the average (the index) changes from year to year. The “Recent releases” filter leaves out games too young to judge.</li>
<li><strong>Correlation ≠ causation</strong>: a successful tag may reflect more experienced studios or bigger budgets. Filter on “Hobbyist + Indie” to compare like with like.</li>
<li>Players add tags <em>after</em> release. A successful game gets more votes, hence more precise tags.</li>
<li>Price is the current price, not the launch price.</li>
<li><strong>Studio size</strong>: Gamalytic’s classification (Hobbyist / Indie / AA / AAA) appears to take sales into account. “Hobbyist” holds most releases and almost all failures, so filtering on “Indie” alone inflates success rates. For an independent developer, <strong>Hobbyist + Indie</strong> is the fairest comparison.</li>
</ul>
<h3>Solo development ease</h3>
<p>Two indicators, best read together:</p>
<ul>
<li><strong>Solo ease (1 to 5)</strong>: an <em>editorial score</em> given to every gameplay, tech or format tag. It weighs asset volume (minimal 2D &lt; pixel art &lt; stylized 3D &lt; realistic 3D), technical risk (netcode, physics, large worlds, AI), the amount of content needed and balancing complexity. Pure theme tags (Sci-fi, Cats, Medieval…) are not scored. For a combination, the hardest tag wins. Scores live in <code>data/dev-ease.json</code> and are open to debate.</li>
<li><strong>Self-published hits</strong>: among the tag’s hits, the share made by self-published hobbyist or indie studios. This one comes from the data: if small teams succeed in the genre, it is within their reach. It cannot tell a solo dev from a 10-person indie studio.</li>
</ul>
<h3>Reproduce</h3>
<p>The collection code is open: <code>npm run update</code> refetches the data and rebuilds the dataset, then <code>npm run serve</code> runs the site locally.</p>`,
};

export function makeT(lang) {
  const dict = STRINGS[lang];
  return (key, vars = {}) => {
    const value = key.split('.').reduce((o, k) => o?.[k], dict) ?? key;
    return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : value;
  };
}
