/*import * as cheerio from 'cheerio';
import { v5 as uuidv5 } from 'uuid';

const COOKIE = "datadome=J4XeDVNax4rJ0vahyB52ynNSe~4Sdq1XJdOyvSsmXHSoHaW7~A4lg153JTAnWGques_vXdm4OkRDsQVGf4qfrviOtPOO2LmJVmXI~c4qUBC3dcF2AhTIZlscimfJuV8Y; _vinted_fr_session=ZWRLejdXVU4zU1FtT2FZa25STkFCZ1ZZbXpRK3dBb1dwNmRjZHhsNGk5TVlWSTZyUk9KVHQyMk42Z3Y2V0VGWEJzbEhVa1V1M1VBNWVrK0JDT1o5NkNpb1ExSG1EZE9UOHJxZVhRejl0RmVxNHVYb1dWVktHdmpJNnE2czhaZnVOLy9udytUR2dOUXkzTU9sRWYxOVdnZUZlVWI3eExiT2RPZjd6S2M3L3VhRFRjd2xXZDBTZ2UzS3J5MTRvbWwvY1U3QnlPcUdpdlhNYXFUS0ZTYmVZSUNtOHcwaU8rby9ETVZpL3d4T1duMXdyZ2lRYVkwb3NrVWE0VkxWbEsvRy0tL0dyd0tiQTZIaUVncHdnK0lCbGw4QT09--90675a4e9fae05f99498491cce04bd91ce79a214";
function isNotDefined(value) {
  return (value == null || (typeof value === "string" && value.trim().length === 0));
}

/**
 * Parse  
 * @param  {String} data - json response
 * @return {Object} sales
 */
/*
const parse = data => {
  try {
    const {items} = data;

    return items.map(item => {
      const link = item.url;
      const price = item.total_item_price;
      const {photo} = item;
      const published = photo.high_resolution && photo.high_resolution.timestamp;

      return {
        link,
        price,
        title: item.title,
        published,
        'uuid': uuidv5(link, uuidv5.URL)
      }
    })
  } catch (error){
    console.error(error);
    return [];
  }
}



const scrape = async searchText => {
  try {
    if (isNotDefined(COOKIE)) {
      throw "vinted requires a valid cookie";
    }

    // URL simplifiée pour éviter les erreurs de session
    const url = `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&search_text=${searchText}&brand_ids=89162`;

    const response = await fetch(url, {
      "headers": {
        "accept": "application/json, text/plain, *//*",
        "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", 
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "cookie": COOKIE,
        "x-requested-with": "XMLHttpRequest"
      },
      "method": "GET"
    });

    if (response.ok) {
      const body = await response.json();
      console.log(`✅ [Vinted] ${body.items?.length || 0} produits récupérés.`);
      return parse(body);
    }

    if (response.status === 401 || response.status === 403) {
      console.error("❌ Erreur d'authentification : Le cookie a expiré ou est mal copié.");
    } else {
      console.error(`❌ Erreur Vinted : ${response.status}`);
    }

    return [];
  } catch (error) {
    console.error("💥 Erreur fatale Vinted :", error);
    return [];
  }
};


export {scrape};*/
import dotenv from 'dotenv';
dotenv.config({ path: 'cookie.env' });
import { v5 as uuidv5 } from 'uuid';
 
/**
 * ──────────────────────────────────────────────────────────────────
 * VINTED SCRAPER — Guide de gestion du cookie
 * ──────────────────────────────────────────────────────────────────
 *
 * Vinted protège son API avec DataDome (anti-bot).
 * Le cookie expire rapidement (quelques heures).
 *
 * Comment obtenir un cookie valide :
 *  1. Ouvre https://www.vinted.fr dans ton navigateur
 *  2. Ouvre les DevTools (F12) → onglet "Network"
 *  3. Tape "lego" dans la barre de recherche Vinted et valide
 *  4. Filtre les requêtes réseau par "catalog/items"
 *  5. Clique sur la requête → Headers → "Cookie"
 *  6. Copie la valeur entière et colle-la dans VINTED_COOKIE ci-dessous
 *     (ou mieux : utilise une variable d'environnement)
 *
 * ⚠️  Ne commite JAMAIS ton cookie dans Git → utilise un .env
 * ──────────────────────────────────────────────────────────────────
 */
 
// Préférer les variables d'environnement pour ne pas exposer le cookie
const VINTED_COOKIE = process.env.VINTED_COOKIE || '';
 
/**
 * Vérifie si une valeur est vide ou non définie
 */
const isEmpty = (value) =>
  value == null || (typeof value === 'string' && value.trim().length === 0);
 
/**
 * Parse la réponse JSON de l'API Vinted
 * @param {Object} data - JSON parsé
 * @returns {Array} sales
 */
const parse = (data) => {
  try {
    const items = data.items || [];
 
    return items.map((item) => {
      const link = item.url || '';
      
      // Le prix peut être un objet ou une valeur directe selon la version de l'API
      let price = 0;
      if (item.total_item_price != null) {
        price = typeof item.total_item_price === 'object'
          ? parseFloat(item.total_item_price.amount || 0)
          : parseFloat(item.total_item_price) || 0;
      } else if (item.price != null) {
        price = parseFloat(item.price) || 0;
      }
 
      // Photo : préférer la haute résolution, sinon fallback
      const photo =
        item.photo?.high_resolution?.full_size_url ||
        item.photo?.url ||
        '';
 
      // Timestamp de publication
      const published =
        item.photo?.high_resolution?.timestamp ||
        item.created_at_ts ||
        null;
 
      return {
        title: item.title || '',
        price,
        link: link.startsWith('http') ? link : `https://www.vinted.fr${link}`,
        photo,
        discount: 0,         // Vinted n'a pas de remise au sens strict
        published,
        uuid: uuidv5(link || item.title, uuidv5.URL),
      };
    }).filter(item => item.title && item.link);
 
  } catch (error) {
    console.error('❌ Erreur parsing Vinted:', error);
    return [];
  }
};
 
/**
 * Scrape Vinted via son API v2
 * @param {string} searchText - texte de recherche (ex: "lego")
 * @param {Object} options - options supplémentaires
 * @param {number} options.perPage - nombre de résultats (défaut: 48)
 * @param {number} options.page - numéro de page (défaut: 1)
 * @returns {Array} sales
 */
const scrape = async (searchText, { perPage = 48, page = 1 } = {}) => {
  if (isEmpty(VINTED_COOKIE)) {
    console.error('❌ Vinted : cookie manquant.');
    console.error('   → Définis la variable d\'environnement VINTED_COOKIE');
    console.error('   → Voir les instructions en haut de ce fichier');
    return [];
  }
 
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    search_text: searchText,
    brand_ids: '89162',       // ID de la marque LEGO sur Vinted
    order: 'newest_first',
  });
 
  const url = `https://www.vinted.fr/api/v2/catalog/items?${params.toString()}`;
 
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'cookie': VINTED_COOKIE,
        'x-requested-with': 'XMLHttpRequest',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
    });
 
    if (response.ok) {
      const body = await response.json();
      const results = parse(body);
      console.log(`✅ Vinted : ${results.length} articles trouvés.`);
      return results;
    }
 
    // Messages d'erreur explicites selon le code HTTP
    switch (response.status) {
      case 401:
      case 403:
        console.error('❌ Vinted : cookie expiré ou invalide (401/403).');
        console.error('   → Renouvelle ton cookie en suivant les instructions du fichier');
        break;
      case 429:
        console.error('❌ Vinted : trop de requêtes (429). Attends quelques minutes.');
        break;
      default:
        console.error(`❌ Vinted : erreur HTTP ${response.status}`);
    }
 
    return [];
 
  } catch (error) {
    console.error('💥 Erreur fatale Vinted:', error);
    return [];
  }
};
 
export { scrape };