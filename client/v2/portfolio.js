'use strict';

// ─── 1. ÉTAT GLOBAL ───────────────────────────────────────────────────────────

let currentDeals = [];
let currentPagination = {};
let favoriteUuids = [];

// ─── 2. SÉLECTEURS ────────────────────────────────────────────────────────────

const selectShow          = document.querySelector('#show-select');
const selectPage          = document.querySelector('#page-select');
const selectLegoSetIds    = document.querySelector('#lego-set-id-select');
const sectionDeals        = document.querySelector('#deals');
const spanNbDeals         = document.querySelector('#nbDeals');
const selectSort          = document.querySelector('#sort-select');
const filterBestDiscount  = document.querySelector('#filter-best-discount');
const filterMostCommented = document.querySelector('#filter-most-commented');
const filterHotDeals      = document.querySelector('#filter-hot-deals');
const filterFavorites     = document.querySelector('#filter-favorites');

// ─── 3. API ───────────────────────────────────────────────────────────────────

/**
 * Mise à jour des variables globales
 * @param {Array}  result - deals to display
 * @param {Object} meta   - pagination meta info
 */
const setCurrentDeals = ({ result, meta }) => {
  currentDeals      = result;
  currentPagination = meta;
};

/**
 * FIX Bug 2 — fetchDeals
 * L'API renvoie { count, results }.
 * On normalise ici pour que le reste du code reçoive toujours { result, meta }.
 *
 * @param  {Number} page - page courante (non utilisée par cette API, gardée pour compatibilité)
 * @param  {Number} size - nombre de deals à afficher
 * @return {Object} { result, meta }
 */
const fetchDeals = async (page = 1, size = 6) => {
  const response = await fetch(
    `https://server-gold-beta.vercel.app/deals/search?limit=${size}&page=${page}`
  );
  const body = await response.json();
  return {
    result: body.results,
    meta: {
      count: body.count,
      currentPage: page,
      pageCount: Math.ceil(body.count / size),
      pageSize: size
    }
  };
};

/**
 * Récupère les ventes Vinted pour un set donné
 * @param  {String} id - lego set id
 * @return {Object}
 */
const fetchSales = async (id) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/sales?id=${id}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return { result: [], meta: {} };
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return { result: [], meta: {} };
  }
};

// ─── 4. RENDU ─────────────────────────────────────────────────────────────────

/**
 * FIX Bug 1 — renderDeals
 * Remplace deal.id (inexistant) par l'identifiant extrait du title ou du lien.
 * Exemple de title : "LEGO City 60423 Le tramway..."  → on extrait "60423"
 * Si aucun numéro trouvé, on affiche les 8 premiers caractères de l'uuid.
 *
 * @param {Array} deals
 */
const renderDeals = deals => {
  const template = deals
    .map(deal => {
      return `
      <div class="deal" id="${deal.uuid}">
        <img src="${deal.photo}" alt="${deal.title}" style="width:100px; height:auto; display:block; margin-bottom:10px;">
        <a href="${deal.link}" target="_blank">${deal.title}</a>
        <br>
        <strong>${deal.price} €</strong>
        <br>
        <small>ID: ${deal.uuid.substring(0, 8)}...</small> 
        <button class="fav-btn" data-uuid="${deal.uuid}" style="margin-left:10px;">❤️</button>
      </div>
    `;
    })
    .join('');

  sectionDeals.innerHTML = template;
  initFavoriteButtons(); 
};


/**
 * Initialise les boutons favoris après chaque rendu
 */
const initFavoriteButtons = () => {
  document.querySelectorAll('.fav-btn').forEach(btn => {
    const uuid = btn.getAttribute('data-uuid');

    // Restitue l'état visuel si déjà favori
    if (favoriteUuids.includes(uuid)) btn.innerText = '💖';

    btn.addEventListener('click', () => {
      if (!favoriteUuids.includes(uuid)) {
        favoriteUuids.push(uuid);
        btn.innerText = '💖';
      } else {
        favoriteUuids = favoriteUuids.filter(id => id !== uuid);
        btn.innerText = '❤️';
      }
    });
  });
};

/**
 * Rendu du sélecteur de page
 * @param {Object} pagination
 */
const renderPagination = pagination => {
  const { currentPage, pageCount } = pagination;
  const options = Array.from(
    { length: pageCount },
    (_, i) => `<option value="${i + 1}">${i + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.value = currentPage;
};

/**
 * Rendu du compteur de deals
 * @param {Object} pagination
 */
const renderIndicators = pagination => {
  spanNbDeals.innerHTML = pagination.count ?? 0;
};

/**
 * Rendu du sélecteur d'IDs de sets LEGO
 * @param {Array} deals
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  selectLegoSetIds.innerHTML = ids
    .map(id => `<option value="${id}">${id}</option>`)
    .join('');
};

/**
 * Extrait les numéros de sets LEGO uniques depuis les titres des deals
 * @param {Array} deals
 * @returns {Array<string>}
 */
const getIdsFromDeals = (deals) => {
  const ids = deals
    .map(deal => {
      const match = deal.title && deal.title.match(/\b(\d{4,6})\b/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  return [...new Set(ids)];
};

/**
 * FIX Bug 3 — renderSalesIndicators
 * Suppression des lignes orphelines en haut du fichier original qui causaient
 * l'erreur "[object HTMLSpanElement]" (querySelector utilisé comme valeur).
 *
 * @param {Object} salesData
 */
const renderSalesIndicators = (salesData) => {
  const sales   = salesData.result ?? [];
  const prices  = sales.map(s => s.price).sort((a, b) => a - b);
  const nbSales = prices.length;

  const getPercentile = (arr, p) => {
    if (arr.length === 0) return 0;
    return arr[Math.floor((p / 100) * (arr.length - 1))];
  };

  const set = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.innerText = value;
  };

  set('#nbSales', nbSales);
  set('#p5Value',  nbSales > 0 ? `${getPercentile(prices, 5)} €`  : '0 €');
  set('#p25Value', nbSales > 0 ? `${getPercentile(prices, 25)} €` : '0 €');
  set('#p50Value', nbSales > 0 ? `${getPercentile(prices, 50)} €` : '0 €');

  // Feature 10 — Lifetime value
  const elLifetime = document.querySelector('#lifetimeValue');
  if (elLifetime) {
    if (nbSales > 1) {
      const dates   = sales.map(s => s.published).sort((a, b) => a - b);
      const diffDays = Math.floor((dates[dates.length - 1] - dates[0]) / (60 * 60 * 24));
      elLifetime.innerText = `${diffDays} days`;
    } else {
      elLifetime.innerText = '0 days';
    }
  }
};

/**
 * Fonction de rendu global
 */
const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals);
};

// ─── 5. LISTENERS ─────────────────────────────────────────────────────────────

// FIX Bug 3 — selectShow : repart toujours de la page 1 avec la nouvelle limite
selectShow.addEventListener('change', async (event) => {
  const limit = parseInt(event.target.value);
  const data = await fetchDeals(1, limit);
  setCurrentDeals(data);
  render(currentDeals, currentPagination);
});

// Un seul listener pour selectPage (suppression du doublon présent dans l'original)
selectPage.addEventListener('change', async (event) => {
  const newPage = parseInt(event.target.value);
  const size    = currentPagination.pageSize || 6;
  const data    = await fetchDeals(newPage, size);
  setCurrentDeals(data);
  render(currentDeals, currentPagination);
});

// Filtres
// Filtre meilleure remise — discount > 0 (pas > 10, aucun deal n'en a)
filterBestDiscount.addEventListener('click', () => {
  renderDeals(currentDeals.filter(d => d.discount > 0));
});

// Filtre prix bas — en dessous de 50€ par exemple
filterMostCommented.addEventListener('click', () => {
  renderDeals(currentDeals.filter(d => d.price < 50));
});

// Filtre prix élevé — au dessus de 100€
filterHotDeals.addEventListener('click', () => {
  renderDeals(currentDeals.filter(d => d.price > 100));
});

filterFavorites.addEventListener('click', () => {
  const favs = currentDeals.filter(d => favoriteUuids.includes(d.uuid));
  if (favs.length === 0) {
    sectionDeals.innerHTML = '<h2>Favorites</h2><p>No favorites yet. Click ❤️ to add some!</p>';
  } else {
    renderDeals(favs);
  }
});

// Tri
selectSort.addEventListener('change', (event) => {
  const sorted = [...currentDeals];

  switch (event.target.value) {
    case 'price-asc':  sorted.sort((a, b) => a.price - b.price); break;
    case 'price-desc': sorted.sort((a, b) => b.price - a.price); break;
    case 'date-asc':   sorted.sort((a, b) => b.published - a.published); break;
    case 'date-desc':  sorted.sort((a, b) => a.published - b.published); break;
  }

  renderDeals(sorted);
});

// Sélecteur de set LEGO → affiche les ventes Vinted correspondantes
selectLegoSetIds.addEventListener('change', async (event) => {
  const salesData = await fetchSales(event.target.value);
  renderSalesIndicators(salesData);
});

// ─── 6. INITIALISATION ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const data = await fetchDeals();
  setCurrentDeals(data);
  render(currentDeals, currentPagination);
});