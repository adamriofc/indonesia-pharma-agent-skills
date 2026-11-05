/**
 * Clinical Trial & Health Data Privacy Compliance Engine (`engines/clinical-trial-pdp-engine.js`)
 *
 * Implements deterministic compliance audits for pharmaceutical clinical trials
 * and patient health data processing under Indonesia's Personal Data Protection Law
 * (UU No. 27/2022 / UU PDP) and Health Law Regulations (PP No. 28/2024 & PMK No. 24/2022).
 * Evaluates:
 *   - Specific/Sensitive Personal Data processing grounds (Pasal 4 ayat 2 & Pasal 22)
 *   - Ethical committee approval (KEPK) & Informed Consent Form (ICF) validity
 *   - Cross-border health data transfer legal hierarchy (Pasal 56 ayat 1-4)
 *   - Sanction exposure assessment (up to 2% annual turnover penalty)
 *
 * DOCTRINE: Pure numerical risk scoring and statutory clause validation.
 * ZERO prescriptive text / ZERO subjective advice.
 * Pure Node.js, zero external dependencies.
 */

'use strict';

const SPECIFIC_DATA_TYPES = [
  'HEALTH_RECORDS',
  'GENOMIC',
  'BIOMETRIC',
  'CLINICAL_LAB_RESULTS',
  'MEDICAL_HISTORY'
];

function auditClinicalTrialPdp(input = {}) {
  if (!input || typeof input !== 'object') {
    throw new Error("INVALID_INPUT: Input must be a valid parameters object");
  }

  const trialPhase = String(input.trialPhase || 'PHASE_3').toUpperCase().trim();
  const hasInformedConsent = Boolean(input.hasInformedConsent);
  const hasEthicsApproval = Boolean(input.hasEthicsApproval);
  const dataTypes = Array.isArray(input.dataTypes) ? input.dataTypes.map(d => String(d).toUpperCase().trim()) : ['HEALTH_RECORDS'];
  const isCrossBorderTransfer = Boolean(input.isCrossBorderTransfer);
  const destinationCountry = input.destinationCountry ? String(input.destinationCountry).toUpperCase().trim() : null;
  const safeguards = typeof input.transferSafeguards === 'object' && input.transferSafeguards !== null ? input.transferSafeguards : {};

  const gaps = [];
  let riskScore = 0;

  // 1. Data Classification (Pasal 4 UU PDP)
  const containsSpecificData = dataTypes.some(d => SPECIFIC_DATA_TYPES.includes(d));
  if (containsSpecificData) {
    // Specific data imposes strictest legal obligation
    if (!hasInformedConsent) {
      gaps.push({
        code: "MISSING_EXPLICIT_INFORMED_CONSENT",
        severity: "CRITICAL",
        statute: "UU PDP Pasal 20 & 22",
        message: "Pemrosesan Data Pribadi Spesifik (Kesehatan/Genomik) tanpa persetujuan sah dan eksplisit"
      });
      riskScore += 50;
    }
  }

  // 2. Ethics Committee Approval (PP No. 28/2024 / Good Clinical Practice)
  if (!hasEthicsApproval) {
    gaps.push({
      code: "MISSING_ETHICS_COMMITTEE_APPROVAL",
      severity: "CRITICAL",
      statute: "PP No. 28/2024 & Standar GCP/CPOB BPOM",
      message: "Uji klinis berjalan tanpa persetujuan etik resmi Komisi Etik Penelitian Kesehatan (KEPK)"
    });
    riskScore += 40;
  }

  // 3. Cross-Border Transfer Evaluation (Pasal 56 UU PDP)
  let crossBorderEvaluation = null;
  if (isCrossBorderTransfer) {
    const hasAdequacy = Boolean(safeguards.adequacyDecision);
    const hasContractual = Boolean(safeguards.bindingCorporateRules || safeguards.standardContractualClauses);
    const hasExplicitConsent = Boolean(safeguards.explicitDataSubjectConsent);

    let legalBasis = "NONE";
    let isTransferLawful = false;

    if (hasAdequacy) {
      legalBasis = "ADEQUACY_DECISION_PASAL_56_AYAT_1";
      isTransferLawful = true;
    } else if (hasContractual) {
      legalBasis = "CONTRACTUAL_SAFEGUARDS_PASAL_56_AYAT_2";
      isTransferLawful = true;
    } else if (hasExplicitConsent) {
      legalBasis = "EXPLICIT_SUBJECT_CONSENT_PASAL_56_AYAT_3";
      isTransferLawful = true;
    } else {
      gaps.push({
        code: "UNLAWFUL_CROSS_BORDER_TRANSFER",
        severity: "HIGH",
        statute: "UU PDP Pasal 56",
        message: "Transfer data kesehatan ke luar negeri tanpa memenuhi hirarki kecukupan, kontrak standar, atau persetujuan eksplisit"
      });
      riskScore += 35;
    }

    crossBorderEvaluation = {
      isCrossBorderTransfer: true,
      destinationCountry,
      isTransferLawful,
      appliedLegalBasis: legalBasis,
      safeguardsProvided: {
        adequacyDecision: hasAdequacy,
        contractualClauses: hasContractual,
        explicitDataSubjectConsent: hasExplicitConsent
      }
    };
  }

  // Cap risk score at 100
  riskScore = Math.min(100, riskScore);

  let complianceStatus = "COMPLIANT";
  if (riskScore >= 70) {
    complianceStatus = "NON_COMPLIANT_VIOLATION";
  } else if (riskScore > 0) {
    complianceStatus = "CONDITIONAL_RISK";
  }

  return {
    trialPhase,
    complianceStatus,
    riskScore,
    dataClassification: {
      isSpecificHealthData: containsSpecificData,
      classifiedTypes: dataTypes
    },
    prerequisites: {
      informedConsentVerified: hasInformedConsent,
      ethicsApprovalVerified: hasEthicsApproval
    },
    crossBorderEvaluation,
    identifiedGaps: gaps,
    statutoryLiabilityNotice: riskScore >= 70
      ? "Pelanggaran pemrosesan data pribadi spesifik berpotensi sanksi administratif hingga 2% dari total pendapatan tahunan (Pasal 57 UU PDP)"
      : "Dalam batas kepatuhan regulasi data kesehatan",
    statutoryBasis: "UU No. 27/2022 (UU PDP), PP No. 28/2024, & PMK No. 24/2022"
  };
}

module.exports = {
  auditClinicalTrialPdp
};
