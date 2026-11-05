/**
 * E-Katalog LKPP & Fornas Pharmaceutical Procurement Margin Engine (`engines/ekatalog-fornas-engine.js`)
 *
 * Implements deterministic net margin and manufacturer payout modeling for pharmaceutical
 * products tender in Government E-Katalog (LKPP) under National Formulary (Fornas) pricing constraints.
 * Factors in:
 *   - PPN 12% statutory tax basis
 *   - Hospital Pharmacy (*Instalasi Farmasi Rumah Sakit / IFRS*) margin tiers
 *   - Pharmaceutical Wholesaler (*Pedagang Besar Farmasi / PBF*) distribution fee
 *   - Working capital carrying cost / cost of fund during BPJS reimbursement delay (30-180 days)
 *
 * DOCTRINE: Pure numerical computation and deterministic financial operations.
 * ZERO prescriptive text / ZERO subjective advice.
 * Pure Node.js, zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

let FORNAS_RULES = null;
function getRules() {
  if (!FORNAS_RULES) {
    const rulesPath = path.join(__dirname, 'rules/fornas-procurement.json');
    if (fs.existsSync(rulesPath)) {
      FORNAS_RULES = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    } else {
      FORNAS_RULES = {
        margins: {
          distributorPbfDefault: 0.08,
          hospitalPharmacyTiers: { generic: 0.20, branded: 0.15, highCostSpecialty: 0.10 }
        },
        taxRates: { ppnRate: 0.12 },
        workingCapitalCostOfFund: { annualRate: 0.09 }
      };
    }
  }
  return FORNAS_RULES;
}

function evaluateEkatalogFornasMargin(input = {}) {
  if (!input || typeof input !== 'object') {
    throw new Error("INVALID_INPUT: Input must be a valid parameters object");
  }

  const cogsPerUnit = Number(input.cogsPerUnit !== undefined ? input.cogsPerUnit : input.cogs);
  const lkppCeilingPrice = Number(input.lkppCeilingPrice !== undefined ? input.lkppCeilingPrice : (input.ceilingPrice || input.hetPrice));
  const hospitalTier = input.hospitalTier ? String(input.hospitalTier) : 'branded';
  const customPbfMargin = input.pbfMarginPercent !== undefined ? Number(input.pbfMarginPercent) / 100 : null;
  const paymentTermsDays = input.paymentTermsDays !== undefined ? Number(input.paymentTermsDays) : 60;
  const annualCostOfFundRate = input.annualCostOfFundPercent !== undefined ? Number(input.annualCostOfFundPercent) / 100 : 0.09;

  if (isNaN(cogsPerUnit) || cogsPerUnit <= 0) {
    throw new Error(`INVALID_INPUT: 'cogsPerUnit' must be greater than zero (got ${input.cogsPerUnit})`);
  }
  if (isNaN(lkppCeilingPrice) || lkppCeilingPrice <= 0) {
    throw new Error(`INVALID_INPUT: 'lkppCeilingPrice' must be greater than zero (got ${input.lkppCeilingPrice})`);
  }
  if (isNaN(paymentTermsDays) || paymentTermsDays < 0) {
    throw new Error(`INVALID_INPUT: 'paymentTermsDays' must be non-negative (got ${input.paymentTermsDays})`);
  }
  if (isNaN(annualCostOfFundRate) || annualCostOfFundRate < 0) {
    throw new Error(`INVALID_INPUT: 'annualCostOfFundPercent' must be non-negative (got ${input.annualCostOfFundPercent})`);
  }

  const rules = getRules();
  const ppnRate = rules.taxRates.ppnRate || 0.12;

  // LKPP E-Katalog price is inclusive of PPN 12%
  const dppCeilingPrice = Math.round((lkppCeilingPrice / (1 + ppnRate)) * 100) / 100;
  const ppnAmount = Math.round((lkppCeilingPrice - dppCeilingPrice) * 100) / 100;

  // Hospital margin rate based on tier
  const tierRate = rules.margins.hospitalPharmacyTiers[hospitalTier] !== undefined
    ? rules.margins.hospitalPharmacyTiers[hospitalTier]
    : 0.15;

  const hospitalMarginAmount = Math.round(dppCeilingPrice * tierRate * 100) / 100;

  // PBF distributor margin rate
  const pbfRate = customPbfMargin !== null ? customPbfMargin : rules.margins.distributorPbfDefault;
  const pbfMarginAmount = Math.round(dppCeilingPrice * pbfRate * 100) / 100;

  // Manufacturer Net Payout
  const netManufacturerPrice = Math.round((dppCeilingPrice - hospitalMarginAmount - pbfMarginAmount) * 100) / 100;

  // Cost of fund during payment delay (working capital interest carrying cost)
  const costOfFundAmount = Math.round((cogsPerUnit * annualCostOfFundRate * (paymentTermsDays / 365)) * 100) / 100;

  // Unit Gross Profit & Margin
  const totalCostBasis = Math.round((cogsPerUnit + costOfFundAmount) * 100) / 100;
  const unitGrossProfit = Math.round((netManufacturerPrice - totalCostBasis) * 100) / 100;
  const grossMarginPercent = netManufacturerPrice > 0
    ? Math.round((unitGrossProfit / netManufacturerPrice) * 10000) / 100
    : -100.0;

  let viabilityStatus = "UNVIABLE_SUB_ECONOMIC";
  if (unitGrossProfit > 0) {
    if (grossMarginPercent >= 20.0) {
      viabilityStatus = "COMMERCIALLY_VIABLE";
    } else {
      viabilityStatus = "MARGIN_EROSION_RISK";
    }
  }

  return {
    ceilingPriceInput: {
      lkppGrossCeilingPriceIdr: lkppCeilingPrice,
      dppPriceIdr: dppCeilingPrice,
      ppn12AmountIdr: ppnAmount
    },
    supplyChainDeductions: {
      hospitalTier,
      hospitalMarginPercent: Math.round(tierRate * 1000) / 10,
      hospitalMarginAmountIdr: hospitalMarginAmount,
      pbfDistributorMarginPercent: Math.round(pbfRate * 1000) / 10,
      pbfDistributorMarginAmountIdr: pbfMarginAmount
    },
    manufacturerFinancials: {
      netManufacturerPriceIdr: netManufacturerPrice,
      cogsPerUnitIdr: cogsPerUnit,
      paymentTermsDays,
      costOfFundAmountIdr: costOfFundAmount,
      totalCostBasisIdr: totalCostBasis,
      unitGrossProfitIdr: unitGrossProfit,
      grossMarginPercent
    },
    viabilityStatus,
    statutoryBasis: "Kepmenkes Formularium Nasional, Perpres No. 12/2021 & UU No. 7/2021 (PPN 12%)"
  };
}

module.exports = {
  evaluateEkatalogFornasMargin
};
