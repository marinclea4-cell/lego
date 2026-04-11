import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const PORT = 8092;

// Configuration pour trouver le fichier JSON sur Vercel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_PATH = join(__dirname, '..', 'deals.json');

app.use(cors());

// Route de test pour voir si le serveur répond
app.get('/', (req, res) => {
  res.send('Serveur opérationnel !');
});

// Route pour chercher les deals
app.get('/deals/search', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  let { limit = 12, page = 1, price = Infinity } = req.query;
  
  const allResults = data.deals.filter(deal => deal.price <= parseFloat(price));
  const total = allResults.length;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const results = allResults.slice(offset, offset + parseInt(limit));
  
  res.json({ count: total, results });
});

// Route pour un deal précis
app.get('/deals/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const deal = data.deals.find(d => d.uuid === req.params.id);
    if (deal) res.json(deal);
    else res.status(404).json({ error: "Deal non trouvé" });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Ne pas utiliser app.listen sur Vercel, on exporte juste l'app
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`✅ local sur http://localhost:${PORT}`));
}

export default app;