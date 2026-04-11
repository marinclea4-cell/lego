// api.js — Lego Deal Checker API
// Lancer avec : node api.js
// Prérequis    : npm install express

import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ─── Configuration ────────────────────────────────────────────────────────────

const PORT = 8092;

// Résolution du chemin absolu vers deals.json (même dossier que api.js)
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = './deals.json';

// ─── Chargement des données au démarrage ──────────────────────────────────────

let deals = [];
let vintedSales = [];

try {
  const raw = readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);

  deals      = data.deals  ?? [];
  vintedSales = data.vinted ?? [];

  console.log(`✅ deals.json chargé : ${deals.length} deals, ${vintedSales.length} ventes Vinted.`);
} catch (err) {
  console.error('❌ Impossible de lire deals.json :', err.message);
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Applique les filtres communs limit et price sur un tableau d'items.
 * @param {Array}  items        - tableau source
 * @param {Object} queryParams  - req.query
 * @param {number} defaultLimit - limite par défaut si ?limit absent
 * @returns {Array}
 */
const applyFilters = (items, queryParams, defaultLimit = 12) => {
  const limit = parseInt(queryParams.limit, 10) || defaultLimit;
  const maxPrice = queryParams.price !== undefined
    ? parseFloat(queryParams.price)
    : null;

  let result = items;

  // Filtre prix maximum
  if (maxPrice !== null && !isNaN(maxPrice)) {
    result = result.filter(item => item.price <= maxPrice);
  }

  // Limite du nombre de résultats
  return result.slice(0, limit);
};

// ─── Serveur Express ──────────────────────────────────────────────────────────

const app = express();

// Réponses JSON par défaut + logs simples
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`→ ${req.method} ${req.url}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /deals/search
 * Recherche dans les deals (Dealabs + Avenue de la Brique).
 *
 * Query params :
 *   ?limit=10   — nombre max de résultats (défaut : 12)
 *   ?price=50   — prix maximum (€)
 *
 * Exemple : GET /deals/search?limit=5&price=30
 */
app.get('/deals/search', (req, res) => {
  const results = applyFilters(deals, req.query);

  return res.json({
    count: results.length,
    results,
  });
});

/**
 * GET /deals/:id
 * Renvoie un deal précis par son UUID.
 *
 * Exemple : GET /deals/8db3e667-4baf-5ec8-a0bd-e6b0056ab7df
 *
 * ⚠️  Cette route DOIT être déclarée APRÈS /deals/search
 *     sinon Express intercepte "search" comme un :id.
 */
app.get('/deals/:id', (req, res) => {
  const { id } = req.params;
  const deal = deals.find(d => d.uuid === id);

  if (!deal) {
    return res.status(404).json({
      error: `Aucun deal trouvé pour l'UUID : ${id}`,
    });
  }

  return res.json(deal);
});

/**
 * GET /sales/search
 * Recherche dans les ventes Vinted.
 *
 * Query params :
 *   ?limit=10   — nombre max de résultats (défaut : 12)
 *   ?price=50   — prix maximum (€)
 *
 * Exemple : GET /sales/search?limit=20&price=15
 */
app.get('/sales/search', (req, res) => {
  const results = applyFilters(vintedSales, req.query);

  return res.json({
    count: results.length,
    results,
  });
});

// ─── Route de santé (bonus) ───────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    routes: [
      'GET /deals/search?limit=&price=',
      'GET /deals/:id',
      'GET /sales/search?limit=&price=',
    ],
  });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`   Santé  → http://localhost:${PORT}/`);
  console.log(`   Deals  → http://localhost:${PORT}/deals/search`);
  console.log(`   Vinted → http://localhost:${PORT}/sales/search\n`);
});