/**
 * Indonesian Pharmaceutical & Healthcare Agent Skills Extension
 *
 * Satellite on-demand domain vertical extension for `indonesia-business-agent-skills`.
 * Pure Node.js, zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Computational Engines
const { evaluateBpomRegistration } = require('./engines/bpom-registration-engine');
const { calculatePharmaTkdn } = require('./engines/tkdn-pharma-engine');
const { evaluateEkatalogFornasMargin } = require('./engines/ekatalog-fornas-engine');
const { evaluatePharmacovigilanceMeso } = require('./engines/pharmacovigilance-meso-engine');
const { auditClinicalTrialPdp } = require('./engines/clinical-trial-pdp-engine');
const { evaluateColdChainMkt } = require('./engines/mkt-cold-chain-engine');

// Rulesets
const rulesDir = path.join(__dirname, 'engines/rules');
const bpomPnbp = JSON.parse(fs.readFileSync(path.join(rulesDir, 'bpom-pnbp.json'), 'utf8'));
const tkdnPharma = JSON.parse(fs.readFileSync(path.join(rulesDir, 'tkdn-pharma.json'), 'utf8'));
const fornasProcurement = JSON.parse(fs.readFileSync(path.join(rulesDir, 'fornas-procurement.json'), 'utf8'));
const mesoCausality = JSON.parse(fs.readFileSync(path.join(rulesDir, 'meso-causality.json'), 'utf8'));
const coldChainSpecs = JSON.parse(fs.readFileSync(path.join(rulesDir, 'cold-chain-specs.json'), 'utf8'));

// Base Manifest
const baseManifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'extension-manifest.json'), 'utf8'));

// Full Pluggable Manifest with executable engine functions and rules
const manifest = {
  ...baseManifest,
  engines: {
    evaluateBpomRegistration,
    calculatePharmaTkdn,
    evaluateEkatalogFornasMargin,
    evaluatePharmacovigilanceMeso,
    auditClinicalTrialPdp,
    evaluateColdChainMkt
  },
  rules: {
    bpomPnbp,
    tkdnPharma,
    fornasProcurement,
    mesoCausality,
    coldChainSpecs
  }
};

/**
 * Register this extension into an indonesia-business-agent-skills core runtime.
 * @param {Object} [coreRegistry] Optional core extension registry; if omitted, attempts to require from core.
 * @returns {Object} Registration receipt
 */
function register(coreRegistry) {
  let reg = coreRegistry;
  if (!reg) {
    try {
      const core = require('indonesia-business-agent-skills');
      reg = core.extensions || core;
    } catch {
      throw new Error(
        'Could not auto-resolve "indonesia-business-agent-skills". Please pass the core registry to register(coreRegistry).'
      );
    }
  }

  if (typeof reg.registerExtension === 'function') {
    return reg.registerExtension(manifest);
  }
  throw new Error('Invalid core registry provided: missing registerExtension function.');
}

module.exports = {
  manifest,
  register,
  evaluateBpomRegistration,
  calculatePharmaTkdn,
  evaluateEkatalogFornasMargin,
  evaluatePharmacovigilanceMeso,
  auditClinicalTrialPdp,
  evaluateColdChainMkt,
  engines: manifest.engines,
  rules: manifest.rules
};
