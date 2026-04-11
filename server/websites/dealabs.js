/* 
// import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const parse = data => {
  const $ = cheerio.load(data);
  const deals = [];

  $('article').each((i, el) => {
    // 1. Titre et Lien
    const titleEl = $(el).find('a.thread-link, a[class*="thread-title"]').first();
    const title = titleEl.text().trim();
    const link = titleEl.attr('href');

    // 2. Prix (Multi-sélecteurs pour être sûr de ne pas le rater)
    const priceText = $(el)
      .find('span[class*="thread-price"], [class*="priceText"], .thread-price')
      .first()
      .text()
      .trim();

    // 3. Extraction numérique du prix
    // On nettoie les symboles (€), les espaces et on gère la virgule
    const cleanPrice = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
    const price = parseFloat(cleanPrice) || 0;

    if (title && link) {
      deals.push({
        title,
        price,
        link: link.startsWith('http') ? link : `https://www.dealabs.com${link}`
      });
    }
  });

  return deals;
};

export const scrape = async url => {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*//*;q=0.8'
    }
  });

  if (response.ok) {
    const body = await response.text();
    return parse(body);
  }

  console.error(`Status: ${response.status}`);
  return [];
};
*/

import fetch from 'node-fetch';
import { v5 as uuidv5 } from 'uuid';

/**
 * Parse the JSON response from Dealabs internal API
 * @param {Object} data - parsed JSON response
 * @returns {Array} deals
 */
const parse = (data) => {
  try {
    // L'API retourne un tableau "data" ou "threads"
    const threads = data.data || data.threads || [];

    return threads.map((thread) => {
      const link = thread.shareableLink || thread.link || '';
      const title = thread.title || '';

      // Le prix est un entier en centimes dans l'API (ex: 1999 = 19.99€)
      // Ou directement un float selon l'endpoint
      let price = 0;
      if (thread.price != null) {
        price = typeof thread.price === 'number'
          ? thread.price / 100  // centimes → euros
          : parseFloat(String(thread.price).replace(',', '.')) || 0;
      }

      // Pourcentage de réduction
      const discount = thread.discountFixed || thread.discountPercent || 0;

      // Image principale
      const photo = thread.mainImage?.['200x200'] || thread.imageUrl || '';

      return {
        title,
        price,
        discount,
        link: link.startsWith('http') ? link : `https://www.dealabs.com${link}`,
        photo,
        uuid: uuidv5(link || title, uuidv5.URL),
      };
    }).filter(deal => deal.title && deal.link);

  } catch (error) {
    console.error('❌ Erreur parsing Dealabs JSON:', error);
    return [];
  }
};

/**
 * Scrape Dealabs via son API JSON interne
 * Dealabs est une SPA : le HTML brut ne contient pas les prix.
 * fetch() + Cheerio ne peuvent pas exécuter le JavaScript de la page.
 * On interroge donc directement l'endpoint JSON de l'API.
 *
 * @param {string} url - URL de la page Dealabs (ex: https://www.dealabs.com/groupe/lego)
 * @returns {Array} deals
 */
export const scrape = async (url) => {
  // Transformation de l'URL "groupe" en appel API JSON
  // Ex: /groupe/lego → groupe slug = "lego"
  const groupSlug = url.split('/groupe/')[1]?.split('?')[0] || 'lego';
  const apiUrl = `https://www.dealabs.com/rss/groupe/${groupSlug}`;

  // Tentative 1 : flux RSS (XML → JSON via regex simple, ou on parse en XML)
  // Tentative 2 : endpoint API non-documenté (parfois accessible)
  // La méthode la plus stable et légale : le flux RSS de Dealabs

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LEGO-Deal-Checker/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      console.error(`❌ Dealabs RSS status: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseRSS(xml);

  } catch (error) {
    console.error('💥 Erreur fatale Dealabs:', error);
    return [];
  }
};

/**
 * Parse le flux RSS de Dealabs
 * Le RSS contient titre, lien, description (avec prix souvent en texte)
 * @param {string} xml
 * @returns {Array} deals
 */
const parseRSS = (xml) => {
  try {
    const items = [];
    // Extraction des blocs <item>
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const block = match[1];

      const title = extractTag(block, 'title');
      const link  = extractTag(block, 'link') || extractTag(block, 'guid');
      const desc  = extractTag(block, 'description');

      // Tentative d'extraction du prix depuis la description
      // Format typique dans le RSS Dealabs : "Prix : 19,99 €" ou "19.99€"
      let price = 0;
      const priceMatch = desc.match(/(\d+[.,]\d{1,2})\s*€/) || desc.match(/€\s*(\d+[.,]\d{1,2})/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(',', '.'));
      }

      // Photo éventuelle dans <enclosure> ou <media:content>
      const photoMatch = block.match(/url="([^"]+\.(jpg|jpeg|png|webp))"/i);
      const photo = photoMatch ? photoMatch[1] : '';

      if (title && link) {
        items.push({
          title,
          price,
          discount: 0,     // Non disponible dans le RSS
          link: link.trim(),
          photo,
          uuid: uuidv5(link.trim(), uuidv5.URL),
        });
      }
    }

    return items;
  } catch (error) {
    console.error('❌ Erreur parsing RSS Dealabs:', error);
    return [];
  }
};

/**
 * Extrait le contenu d'une balise XML simple
 * @param {string} block
 * @param {string} tag
 * @returns {string}
 */
const extractTag = (block, tag) => {
  const match = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
    || block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
};