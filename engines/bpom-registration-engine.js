/**
 * BPOM Drug Registration & Regulatory Pathway Evaluation Engine (`engines/bpom-registration-engine.js`)
 *
 * Implements deterministic calculation of BPOM official Non-Tax State Revenue (PNBP)
 * per Government Regulation PP No. 32/2017 and determines evaluation timelines (100/150/300 working days)
 * along with ASEAN Common Technical Dossier (ACTD) readiness audits.
 *
 * DOCTRINE: Pure numerical computation and statutory ruleset lookup.
 * ZERO prescriptive text / ZERO subjective advice.
 * Pure Node.js, zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

let BPOM_RULES = null;
function getRules() {
  if (!BPOM_RULES) {
    const rulesPath = path.join(__dirname, 'rules/bpom-pnbp.json');
    if (fs.existsSync(rulesPath)) {
      BPOM_RULES = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    } else {
      // Fallback in-memory defaults if file not found
      BPOM_RULES = {
        fees: {
          OBAT_BARU: { pra_registrasi: 1000000, registrasi_zat_aktif_baru: 150000000, registrasi_kombinasi_baru: 100000000, registrasi_bentuk_sediaan_baru: 50000000, registrasi_indikasi_baru: 30000000 },
          OBAT_COPY: { pra_registrasi: 1000000, registrasi_copy_uji_be: 30000000, registrasi_copy_tanpa_uji_be: 15000000 },
          REGISTRASI_VARIASI: { variasi_mayor: 10000000, variasi_minor_persetujuan: 5000000, variasi_minor_notifikasi: 1500000 },
          REGISTRASI_ULANG: { registrasi_ulang_5_tahun: 5000000 }
        },
        serviceLevelAgreements: {
          JALUR_100_HARI: { maxWorkingDays: 100, qualifyingCriteria: ["orphan_drug", "life_threatening_disease", "national_health_program", "pediatric_priority"] },
          JALUR_150_HARI: { maxWorkingDays: 150, qualifyingCriteria: ["sra_approved", "who_prequalified", "generic_essential", "export_only"] },
          JALUR_300_HARI: { maxWorkingDays: 300, qualifyingCriteria: ["new_chemical_entity", "standard_new_drug", "novel_biologic"] }
        }
      };
    }
  }
  return BPOM_RULES;
}

function evaluateBpomRegistration(input = {}) {
  if (!input || typeof input !== 'object') {
    throw new Error("INVALID_INPUT: Input must be a valid parameters object");
  }

  const category = String(input.category || 'OBAT_BARU').toUpperCase();
  const subType = input.subType ? String(input.subType).toLowerCase() : null;
  const includePraRegistrasi = input.includePraRegistrasi !== undefined ? Boolean(input.includePraRegistrasi) : (category === 'OBAT_BARU' || category === 'OBAT_COPY');
  const criteria = Array.isArray(input.qualifyingCriteria) ? input.qualifyingCriteria.map(c => String(c).toLowerCase().trim()) : [];
  const dossier = typeof input.actdDossier === 'object' && input.actdDossier !== null ? input.actdDossier : null;

  const rules = getRules();

  if (!rules.fees[category]) {
    throw new Error(`INVALID_INPUT: Category '${category}' not recognized. Valid: ${Object.keys(rules.fees).join(', ')}`);
  }

  const categoryFees = rules.fees[category];
  let feeRegistration = 0;
  let selectedSubType = subType;

  if (subType && categoryFees[subType] !== undefined) {
    feeRegistration = categoryFees[subType];
  } else {
    // Default to the first non-pra_registrasi fee in category
    const availableSubtypes = Object.keys(categoryFees).filter(k => k !== 'pra_registrasi');
    selectedSubType = availableSubtypes[0];
    feeRegistration = categoryFees[selectedSubType];
  }

  let feePraRegistrasi = 0;
  if (includePraRegistrasi && categoryFees.pra_registrasi) {
    feePraRegistrasi = categoryFees.pra_registrasi;
  }

  const totalPnbpFee = feeRegistration + feePraRegistrasi;

  // Determine Pathway (Jalur Evaluasi)
  let pathwayKey = 'JALUR_300_HARI';
  let matchedCriteria = [];

  const j100 = rules.serviceLevelAgreements.JALUR_100_HARI.qualifyingCriteria;
  const j150 = rules.serviceLevelAgreements.JALUR_150_HARI.qualifyingCriteria;

  const match100 = criteria.filter(c => j100.includes(c));
  const match150 = criteria.filter(c => j150.includes(c));

  if (category === 'OBAT_COPY') {
    pathwayKey = 'JALUR_150_HARI';
    matchedCriteria = ['generic_copy_standard'];
  } else if (match100.length > 0) {
    pathwayKey = 'JALUR_100_HARI';
    matchedCriteria = match100;
  } else if (match150.length > 0) {
    pathwayKey = 'JALUR_150_HARI';
    matchedCriteria = match150;
  } else {
    pathwayKey = 'JALUR_300_HARI';
    matchedCriteria = ['standard_evaluation_track'];
  }

  const pathwayData = rules.serviceLevelAgreements[pathwayKey] || { maxWorkingDays: 300, description: "Evaluasi Standar" };

  // Audit ACTD Dossier Readiness
  let dossierAudit = null;
  if (dossier) {
    const p1 = Boolean(dossier.part1Admin);
    const p2 = Boolean(dossier.part2Quality);
    const p3 = Boolean(dossier.part3NonClinical);
    const p4 = Boolean(dossier.part4Clinical);

    // Obat copy standard may exempt Part 3/4 if BE study provided
    const isCopy = category === 'OBAT_COPY';
    const complete = isCopy ? (p1 && p2) : (p1 && p2 && p3 && p4);

    dossierAudit = {
      isComplete: complete,
      partsStatus: {
        part1Administrative: p1 ? "COMPLETE" : "MISSING",
        part2QualityChemicalManufacturingControls: p2 ? "COMPLETE" : "MISSING",
        part3NonClinicalReports: p3 ? "COMPLETE" : (isCopy ? "EXEMPT_OR_NOT_REQUIRED" : "MISSING"),
        part4ClinicalReports: p4 ? "COMPLETE" : (isCopy ? "EXEMPT_OR_BE_ONLY" : "MISSING")
      },
      readinessScorePercent: Math.round(((p1?1:0) + (p2?1:0) + (p3?1:0) + (p4?1:0)) / (isCopy ? 2 : 4) * 100)
    };
  }

  return {
    category,
    subType: selectedSubType,
    totalPnbpFeeIdr: totalPnbpFee,
    pnbpBreakdown: {
      praRegistrasiFeeIdr: feePraRegistrasi,
      registrasiFeeIdr: feeRegistration
    },
    evaluationPathway: {
      pathway: pathwayKey,
      maxWorkingDays: pathwayData.maxWorkingDays,
      description: pathwayData.description || "",
      appliedCriteria: matchedCriteria
    },
    dossierAudit,
    statutoryBasis: "PP No. 32/2017 tentang PNBP BPOM & PerBPOM Kriteria dan Tata Laksana Registrasi Obat"
  };
}

module.exports = {
  evaluateBpomRegistration
};
