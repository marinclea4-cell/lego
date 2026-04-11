// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://lego-api-blue.vercel.app/sales

Search for current Vinted sales for a given lego set id

This endpoint accepts the following optional query string parameters:

- `id` - lego set id to return
*/

// 1. ETAT GLOBAL
// current deals on the page
let currentDeals = [];
let currentPagination = {};

// 2. SELECTEURS
// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals= document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');
const selectSort = document.querySelector('#sort-select');

const filterBestDiscount = document.querySelector('#filter-best-discount');
const filterMostCommented = document.querySelector('#filter-most-commented');
const filterHotDeals = document.querySelector('#filter-hot-deals');
document.querySelector('#nbSales').innerHTML = nbSales;
document.querySelector('#p5Value').innerHTML = nbSales > 0 ? `${getPercentile(prices, 5)} €` : "0 €";
document.querySelector('#p25Value').innerHTML = nbSales > 0 ? `${getPercentile(prices, 25)} €` : "0 €";
document.querySelector('#p50Value').innerHTML = nbSales > 0 ? `${getPercentile(prices, 50)} €` : "0 €";


/**
 * Mise à jour des variables globales
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = result;
  currentPagination = meta;
};


/**
 * Récupération des données (API)
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return {currentDeals, currentPagination};
    }

    return body.data; // Retourne {result: [...], meta: {...}}
  } catch (error) {
    console.error(error);
    return {currentDeals, currentPagination};
  }
};


/**
 * Fetch sales from api for a given lego set id
 * @param  {String}  id - lego set id
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
      return {result: [], meta: {}};
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {result: [], meta: {}};
  }
};

/**
 * Affichage des deals
 * Render list of deals
 * @param  {Array} deals
 */
  const renderDeals = deals => {
  const template = deals
    .map(deal => {
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <a href="${deal.link}" target="_blank">${deal.title}</a>
        <strong>${deal.price} €</strong>
        <button class="fav-btn" data-uuid="${deal.uuid}">❤️</button>
      </div>
    `;
    })
    .join('');

  sectionDeals.innerHTML = template;
  
  // Appeler une fonction pour activer les boutons après le rendu
  initFavoriteButtons(); 
};

let favoriteUuids = [];

const initFavoriteButtons = () => {
  const buttons = document.querySelectorAll('.fav-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uuid = e.target.getAttribute('data-uuid');
      
      if (!favoriteUuids.includes(uuid)) {
        favoriteUuids.push(uuid);
        e.target.innerText = '💖'; // Change l'icône
        console.log("Favoris actuels :", favoriteUuids);
      } else {
        // Optionnel : Retirer des favoris si on reclique
        favoriteUuids = favoriteUuids.filter(id => id !== uuid);
        e.target.innerText = '❤️';
      }
    });
  });
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const {currentPage, pageCount} = pagination;
  const options = Array.from(
    {'length': pageCount},
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.value = currentPage;
};

// Feature 2 - Filter by best discount (> 10%)
filterBestDiscount.addEventListener('click', () => {
  const filtered = currentDeals.filter(deal => deal.discount !== null && deal.discount > 10);
  renderDeals(filtered);
});

// Feature 3 - Filter by most commented (> 15 comments)
filterMostCommented.addEventListener('click', () => {
  const filtered = currentDeals.filter(deal => deal.comments > 15);
  renderDeals(filtered);
});

// Feature 4 - Filter by hot deals (temperature > 100)
filterHotDeals.addEventListener('click', () => {
  const filtered = currentDeals.filter(deal => deal.temperature > 100);
  renderDeals(filtered);
});


/**
 * Feature 5/ 6 - Sort by price or date
 */
selectSort.addEventListener('change', (event) => {
  const sortType = event.target.value;
  let sortedDeals = [...currentDeals];

  switch (sortType) {
    case 'price-asc':
      sortedDeals.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      sortedDeals.sort((a, b) => b.price - a.price);
      break;
    case 'date-asc':
      sortedDeals.sort((a, b) => b.published - a.published); 
      break;
    case 'date-desc':
      sortedDeals.sort((a, b) => a.published - b.published);
      break;
  }
  renderDeals(sortedDeals);
});

//Feature 7 - Display Vinted sales
selectLegoSetIds.addEventListener('change', async (event) => {
  const legoSetId = event.target.value;
  const salesData = await fetchSales(legoSetId);
  console.log(`Ventes pour le set ${legoSetId}:`, salesData.result);
  renderSalesIndicators(salesData);
});

selectPage.addEventListener('change', async (event) => {
  const newPage = parseInt(event.target.value);
  const size = currentPagination.pageSize || 6; 
  const data = await fetchDeals(newPage, size);
  setCurrentDeals(data);
  render(currentDeals, currentPagination);
});

/**
 * Feature 8 & 9 - Render indicators for sales
 * @param {Object} salesData
 */
const renderSalesIndicators = (salesData) => {
  const sales = salesData.result;
  
  // On extrait les prix et on les trie
  const prices = sales.map(sale => sale.price).sort((a, b) => a - b);
  const nbSales = prices.length;

  const getPercentile = (arr, percentile) => {
    if (arr.length === 0) return 0;
    const index = Math.floor((percentile / 100) * (arr.length - 1));
    return arr[index];
  };

  // On récupère les éléments du DOM
  const elNbSales = document.querySelector('#nbSales');
  const elP5 = document.querySelector('#p5Value');
  const elP25 = document.querySelector('#p25Value');
  const elP50 = document.querySelector('#p50Value');

  // On met à jour seulement s'ils existent
  if (elNbSales) elNbSales.innerText = nbSales;
  
  if (nbSales > 0) {
    if (elP5) elP5.innerText = `${getPercentile(prices, 5)} €`;
    if (elP25) elP25.innerText = `${getPercentile(prices, 25)} €`;
    if (elP50) elP50.innerText = `${getPercentile(prices, 50)} €`;
  } else {
    if (elP5) elP5.innerText = "0 €";
    if (elP25) elP25.innerText = "0 €";
    if (elP50) elP50.innerText = "0 €";
  }

  // Feature 10 - Lifetime Value
  const elLifetime = document.querySelector('#lifetimeValue');
  if (elLifetime) {
      if (nbSales > 1) {
        const dates = sales.map(sale => sale.published).sort((a, b) => a - b);
        const diffInDays = Math.floor((dates[dates.length - 1] - dates[0]) / (60 * 60 * 24));
        elLifetime.innerText = `${diffInDays} days`;
      } else {
        elLifetime.innerText = "0 days";
      }
  }
};
  

const filterFavorites = document.querySelector('#filter-favorites');

filterFavorites.addEventListener('click', () => {
  // On ne garde que les deals qui sont dans la liste des favoris
  const favorites = currentDeals.filter(deal => favoriteUuids.includes(deal.uuid));
  
  if (favorites.length === 0) {
    sectionDeals.innerHTML = "<h2>Favorites</h2><p>No favorites yet. Click on ❤️ to add some!</p>";
  } else {
    renderDeals(favorites);
  }
}); 

  // Feature 10 - Lifetime Value
  /*
  if (nbSales > 1) {
    const dates = sales.map(sale => sale.published).sort((a, b) => a - b);
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    
    // Calcul de la différence en jours
    const diffInSeconds = maxDate - minDate;
    const diffInDays = Math.floor(diffInSeconds / (60 * 60 * 24));
    
    document.querySelector('#lifetimeValue').innerText = `${diffInDays} days`;
  } else {
    document.querySelector('#lifetimeValue').innerText = "0 days";
  }

  document.querySelector('#nbSales').innerText = nbSales;
  
  if (nbSales > 0) {
    document.querySelector('#p5Value').innerText = `${getPercentile(prices, 5)} €`;
    document.querySelector('#p25Value').innerText = `${getPercentile(prices, 25)} €`;
    document.querySelector('#p50Value').innerText = `${getPercentile(prices, 50)} €`;
  } else {
    document.querySelector('#p5Value').innerText = "0 €";
    document.querySelector('#p25Value').innerText = "0 €";
    document.querySelector('#p50Value').innerText = "0 €";
  }*/




/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = ids.map(id => 
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};

/**
 * FONCTION DE RENDU GLOBAL
 * Render page selector
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const {count} = pagination;

  spanNbDeals.innerHTML = count;
};



const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals)
};





/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});


selectPage.addEventListener('change', async (event) => {
  const newPage = parseInt(event.target.value);
  const products = await fetchDeals(newPage, currentPagination.pageSize);
  render(products, currentPagination);
});