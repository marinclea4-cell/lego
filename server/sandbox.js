/* eslint-disable no-console, no-process-exit */
import fs from 'fs';
import * as dealabs from './websites/dealabs.js';
import * as avenuedelabrique from './websites/avenuedelabrique.js';
import { scrape as scrapeVinted } from './websites/vinted.js'; 

async function start() {
  try {
    const [,, param] = process.argv;

    // 1. Scraping Dealabs
    console.log('🕵️‍♀️  Scraping Dealabs...');
    const dealabsUrl = 'https://www.dealabs.com/groupe/lego';
    const dealabsDeals = await dealabs.scrape(dealabsUrl) || [];
    console.log(`✅ Dealabs : ${dealabsDeals.length} deals trouvés.`);

    // 2. Scraping Avenue de la Brique
    const adlbUrl = param || 'https://www.avenuedelabrique.com/promotions-et-bons-plans-lego';
    console.log(`\n🕵️‍♀️  Browsing Avenue de la Brique: ${adlbUrl}`);
    const adlbDeals = await avenuedelabrique.scrape(adlbUrl) || [];
    console.log(`✅ ADLB : ${adlbDeals.length} deals trouvés.`);

    // 3. Scraping Vinted (Nouveau !)
    console.log('\n🕵️‍♀️  Scraping Vinted (recherche "lego")...');
    const vintedSales = await scrapeVinted("lego") || [];
    console.log(`✅ Vinted : ${vintedSales.length} articles trouvés.`);

    // 4. Fusion et Sauvegarde
    // On crée un objet global pour bien séparer les sources si besoin
    const allResults = {
      deals: [...dealabsDeals, ...adlbDeals],
      vinted: vintedSales
    };
    
    // Sauvegarde dans deals.json (ou all_data.json)
    fs.writeFileSync('deals.json', JSON.stringify(allResults, null, 2));
    
    const total = dealabsDeals.length + adlbDeals.length + vintedSales.length;
    console.log(`\n💾 Fichier deals.json mis à jour avec ${total} objets au total !`);

    console.log('\n✨ All done!');
    process.exit(0); 
    
  } catch (err) {
    console.error('❌ Global Error:', err);
    process.exit(1);
  }
}

start();