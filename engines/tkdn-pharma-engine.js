/**
 * Pharmaceutical Local Content (TKDN Farmasi) Engine (`engines/tkdn-pharma-engine.js`)
 *
 * Implements deterministic calculation of Tingkat Komponen Dalam Negeri (TKDN)
 * for pharmaceutical finished goods per Minister of Industry Regulation Permenperin No. 16/2020.
 * Computes dimension weighting across:
 *   1. Active Pharmaceutical Ingredient (API) — 50%
 *   2. Research & Development in Indonesia — 30%
 *   3. Production & Formulation in CPOB Facility — 15%
 *   4. Domestic Packaging Materials — 5%
 * Evaluates government procurement preference eligibility under Perpres No. 12/2021.
 *
 * DOCTRINE: Pure numerical computation and statutory formula evaluation.
 * ZERO prescriptive text / ZERO subjective advice.
 * Pure Node.js, zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

let TKDN_WEIGHTS = null;
function getWeights() {
  if (!TKDN_WEIGHTS) {
    const rulesPath = path.join(__dirname, 'rules/tkdn-pharma.json');
    if (fs.existsSync(rulesPath)) {
      TKDN_WEIGHTS = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    } else {
      TKDN_WEIGHTS = {
        dimensionWeights: {
          activePharmaceuticalIngredient: { weight: 0.50 },
          researchAndDevelopment: { weight: 0.30 },
          productionAndFormulation: { weight: 0.15 },
          packagingMaterials: { weight: 0.05 }
        },
        procurementRules: {
          minTkdnForPreference: 25.0,
          minCombinedTkdnBmp: 40.0,
          maxPricePreference: 15.0
        }
      };
    }
  }
  return TKDN_WEIGHTS;
}

function calculatePharmaTkdn(input = {}) {
  if (!input || typeof input !== 'object') {
    throw new Error("INVALID_INPUT: Input must be a valid parameters object");
  }

  const api = Number(input.apiScore !== undefined ? input.apiScore : (input.activeIngredient || 0));
  const rnd = Number(input.rndScore !== undefined ? input.rndScore : (input.researchDevelopment || 0));
  const prod = Number(input.formulationScore !== undefined ? input.formulationScore : (input.productionFormulation || 0));
  const pack = Number(input.packagingScore !== undefined ? input.packagingScore : (input.packagingMaterials || 0));
  const rawBmp = Number(input.bmpScore !== undefined ? input.bmpScore : (input.companyBenefitWeight || 0));

  const scores = [
    { name: 'apiScore', val: api },
    { name: 'rndScore', val: rnd },
    { name: 'formulationScore', val: prod },
    { name: 'packagingScore', val: pack }
  ];

  for (const s of scores) {
    if (isNaN(s.val) || s.val < 0 || s.val > 100) {
      throw new Error(`INVALID_INPUT: '${s.name}' must be a percentage between 0 and 100 (got ${s.val})`);
    }
  }

  if (isNaN(rawBmp) || rawBmp < 0) {
    throw new Error(`INVALID_INPUT: 'bmpScore' must be non-negative (got ${rawBmp})`);
  }

  // BMP is capped at 15.0% by Ministry of Industry regulations
  const bmp = Math.min(rawBmp, 15.0);

  const weights = getWeights().dimensionWeights;
  const wApi = weights.activePharmaceuticalIngredient.weight;
  const wRnd = weights.researchAndDevelopment.weight;
  const wProd = weights.productionAndFormulation.weight;
  const wPack = weights.packagingMaterials.weight;

  const pointApi = Math.round(api * wApi * 100) / 100;
  const pointRnd = Math.round(rnd * wRnd * 100) / 100;
  const pointProd = Math.round(prod * wProd * 100) / 100;
  const pointPack = Math.round(pack * wPack * 100) / 100;

  const tkdnScore = Math.round((pointApi + pointRnd + pointProd + pointPack) * 100) / 100;
  const combinedScore = Math.round((tkdnScore + bmp) * 100) / 100;

  const minTkdnPref = 25.0;
  const minCombined = 40.0;

  const isPreferenceEligible = tkdnScore >= minTkdnPref;
  const isMandatoryProcurement = combinedScore >= minCombined && isPreferenceEligible;

  // Price preference calculation under Perpres PBJ (max 15%)
  let pricePreferencePercent = 0.0;
  if (isPreferenceEligible) {
    // Pro-rated preference formula: min(15, (TKDN / 100) * 25)
    pricePreferencePercent = Math.min(15.0, Math.round((tkdnScore * 0.25) * 10) / 10);
  }

  let status = "UNQUALIFIED";
  if (isMandatoryProcurement) {
    status = "QUALIFIED_MANDATORY_BUY";
  } else if (isPreferenceEligible) {
    status = "QUALIFIED_PREFERENCE_ONLY";
  }

  return {
    tkdnScorePercent: tkdnScore,
    dimensionBreakdown: {
      activePharmaceuticalIngredient: { rawPercent: api, weight: wApi, points: pointApi },
      researchAndDevelopment: { rawPercent: rnd, weight: wRnd, points: pointRnd },
      productionAndFormulation: { rawPercent: prod, weight: wProd, points: pointProd },
      packagingMaterials: { rawPercent: pack, weight: wPack, points: pointPack }
    },
    bmpScorePercent: bmp,
    combinedScorePercent: combinedScore,
    procurementEligibility: {
      status,
      isMandatoryProcurement,
      isPreferenceEligible,
      pricePreferencePercent
    },
    statutoryBasis: "Permenperin No. 16/2020 tentang Penghitungan TKDN Produk Farmasi & Perpres No. 12/2021"
  };
}

module.exports = {
  calculatePharmaTkdn
};
