// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';


/**
 * 
 * @param {Array} deals - list of deals
 * @returns {Array} list of lego set ids
 */
const getIdsFromDeals = deals => {
    return deals.map(deal => deal.id)
}


/**
 * Calcule le centile d'un tableau de nombres
 * @param {Array} arr - Le tableau de prix
 * @param {Number} percentile - Le centile (ex: 5, 25, 50)
 */
const getPercentile = (arr, percentile) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * sorted.length);
  return sorted[index];
};