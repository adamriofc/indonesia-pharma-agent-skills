/**
 * Unit & Invariant Tests for Pharmaceutical & Healthcare Engines (`tests/units/pharma-engines.test.js`)
 *
 * Verifies:
 *   1. BPOM Drug Registration & PNBP Engine (PP 32/2017 & PerBPOM 100/150/300-day SLA)
 *   2. Local Content (TKDN Farmasi) Engine (Permenperin 16/2020 4-dimension algorithm)
 *   3. E-Katalog LKPP & Fornas Procurement Margin Engine (PPN 12%, hospital/PBF margins, carrying cost)
 *   4. Pharmacovigilance & Adverse Drug Reaction (MESO) Engine (15-day SLA & WHO-UMC causality)
 *   5. Clinical Trial Data Privacy & UU PDP Compliance Engine (Pasal 4 specific data & Pasal 56 cross-border)
 *   6. Strict input validation and fail-closed error boundaries
 */

'use strict';

const assert = require('assert');
const path = require('path');
const ROOT = path.join(__dirname, '../..');

const { evaluateBpomRegistration } = require(path.join(ROOT, 'engines/bpom-registration-engine'));
const { calculatePharmaTkdn } = require(path.join(ROOT, 'engines/tkdn-pharma-engine'));
const { evaluateEkatalogFornasMargin } = require(path.join(ROOT, 'engines/ekatalog-fornas-engine'));
const { evaluatePharmacovigilanceMeso } = require(path.join(ROOT, 'engines/pharmacovigilance-meso-engine'));
const { auditClinicalTrialPdp } = require(path.join(ROOT, 'engines/clinical-trial-pdp-engine'));
const { evaluateColdChainMkt } = require(path.join(ROOT, 'engines/mkt-cold-chain-engine'));
const { runMktTests } = require(path.join(__dirname, 'mkt-cold-chain.test'));

function runPharmaEngineTests() {
  console.log("🧪 Running Pharmaceutical & Healthcare Intelligence Engine Tests...\n");

  // -------------------------------------------------------------
  // Test 1: BPOM Drug Registration Engine
  // -------------------------------------------------------------
  console.log("  [1/5] Testing BPOM Registration & Regulatory Pathway Engine...");

  // 1a. Obat Baru with orphan drug indication -> Jalur 100 Hari
  const resBpom1 = evaluateBpomRegistration({
    category: "OBAT_BARU",
    subType: "registrasi_zat_aktif_baru",
    includePraRegistrasi: true,
    qualifyingCriteria: ["orphan_drug"],
    actdDossier: {
      part1Admin: true,
      part2Quality: true,
      part3NonClinical: true,
      part4Clinical: true
    }
  });

  assert.strictEqual(resBpom1.category, "OBAT_BARU");
  assert.strictEqual(resBpom1.totalPnbpFeeIdr, 151000000);
  assert.strictEqual(resBpom1.pnbpBreakdown.praRegistrasiFeeIdr, 1000000);
  assert.strictEqual(resBpom1.pnbpBreakdown.registrasiFeeIdr, 150000000);
  assert.strictEqual(resBpom1.evaluationPathway.pathway, "JALUR_100_HARI");
  assert.strictEqual(resBpom1.evaluationPathway.maxWorkingDays, 100);
  assert.strictEqual(resBpom1.dossierAudit.isComplete, true);
  assert.strictEqual(resBpom1.dossierAudit.readinessScorePercent, 100);

  // 1b. Obat Copy with BE test -> Jalur 150 Hari
  const resBpom2 = evaluateBpomRegistration({
    category: "OBAT_COPY",
    subType: "registrasi_copy_uji_be",
    includePraRegistrasi: true,
    actdDossier: {
      part1Admin: true,
      part2Quality: true,
      part3NonClinical: false,
      part4Clinical: false
    }
  });
  assert.strictEqual(resBpom2.totalPnbpFeeIdr, 31000000);
  assert.strictEqual(resBpom2.evaluationPathway.pathway, "JALUR_150_HARI");
  assert.strictEqual(resBpom2.evaluationPathway.maxWorkingDays, 150);
  assert.strictEqual(resBpom2.dossierAudit.isComplete, true, "Obat copy with P1/P2 complete should be accepted");

  // 1c. Error handling: invalid category
  assert.throws(() => {
    evaluateBpomRegistration({ category: "OBAT_ILLEGAL" });
  }, /INVALID_INPUT/);

  // -------------------------------------------------------------
  // Test 2: TKDN Farmasi Engine
  // -------------------------------------------------------------
  console.log("  [2/5] Testing Local Content (TKDN Farmasi) Engine (Permenperin 16/2020)...");

  // 2a. High domestic formulation and active ingredient
  // api: 60%, rnd: 40%, prod: 80%, pack: 100%
  // Points: 60*0.50 (30) + 40*0.30 (12) + 80*0.15 (12) + 100*0.05 (5) = 59%
  const resTkdn1 = calculatePharmaTkdn({
    apiScore: 60,
    rndScore: 40,
    formulationScore: 80,
    packagingScore: 100,
    bmpScore: 10
  });

  assert.strictEqual(resTkdn1.tkdnScorePercent, 59.0);
  assert.strictEqual(resTkdn1.bmpScorePercent, 10.0);
  assert.strictEqual(resTkdn1.combinedScorePercent, 69.0);
  assert.strictEqual(resTkdn1.procurementEligibility.isMandatoryProcurement, true);
  assert.strictEqual(resTkdn1.procurementEligibility.isPreferenceEligible, true);
  assert.strictEqual(resTkdn1.procurementEligibility.status, "QUALIFIED_MANDATORY_BUY");

  // 2b. Low TKDN (e.g. 10%)
  const resTkdn2 = calculatePharmaTkdn({
    apiScore: 0,
    rndScore: 0,
    formulationScore: 60,
    packagingScore: 20,
    bmpScore: 0
  });
  // 0*0.5 + 0*0.3 + 60*0.15 (9) + 20*0.05 (1) = 10%
  assert.strictEqual(resTkdn2.tkdnScorePercent, 10.0);
  assert.strictEqual(resTkdn2.procurementEligibility.isMandatoryProcurement, false);
  assert.strictEqual(resTkdn2.procurementEligibility.status, "UNQUALIFIED");

  // 2c. Invalid score boundaries (>100 or <0)
  assert.throws(() => {
    calculatePharmaTkdn({ apiScore: 120 });
  }, /INVALID_INPUT/);

  // -------------------------------------------------------------
  // Test 3: E-Katalog LKPP & Fornas Margin Engine
  // -------------------------------------------------------------
  console.log("  [3/5] Testing E-Katalog & Fornas Tender Margin Engine (PPN 12%)...");

  // 3a. Viable tender scenario
  // LKPP ceiling: 112,000 IDR -> DPP = 100,000 IDR, PPN 12% = 12,000 IDR
  // Hospital tier 'branded' (15%) = 15,000 IDR
  // PBF distributor (8%) = 8,000 IDR
  // Net manufacturer price = 100,000 - 15,000 - 8,000 = 77,000 IDR
  // COGS: 40,000 IDR, payment terms 60 days @ 9% p.a.
  // Cost of fund = 40,000 * 0.09 * (60/365) = 591.78 IDR
  // Total cost = 40,591.78 IDR
  // Gross profit = 77,000 - 40,591.78 = 36,408.22 IDR
  // Margin % = 36,408.22 / 77,000 * 100 = 47.28%
  const resFornas1 = evaluateEkatalogFornasMargin({
    cogsPerUnit: 40000,
    lkppCeilingPrice: 112000,
    hospitalTier: "branded",
    pbfMarginPercent: 8.0,
    paymentTermsDays: 60,
    annualCostOfFundPercent: 9.0
  });

  assert.strictEqual(resFornas1.ceilingPriceInput.dppPriceIdr, 100000);
  assert.strictEqual(resFornas1.ceilingPriceInput.ppn12AmountIdr, 12000);
  assert.strictEqual(resFornas1.supplyChainDeductions.hospitalMarginAmountIdr, 15000);
  assert.strictEqual(resFornas1.supplyChainDeductions.pbfDistributorMarginAmountIdr, 8000);
  assert.strictEqual(resFornas1.manufacturerFinancials.netManufacturerPriceIdr, 77000);
  assert.strictEqual(resFornas1.manufacturerFinancials.costOfFundAmountIdr, 591.78);
  assert.strictEqual(resFornas1.manufacturerFinancials.unitGrossProfitIdr, 36408.22);
  assert.strictEqual(resFornas1.manufacturerFinancials.grossMarginPercent, 47.28);
  assert.strictEqual(resFornas1.viabilityStatus, "COMMERCIALLY_VIABLE");

  // 3b. Unviable sub-economic scenario where COGS exceeds net manufacturer price
  const resFornas2 = evaluateEkatalogFornasMargin({
    cogsPerUnit: 80000,
    lkppCeilingPrice: 89600, // DPP = 80,000. Net after margins ~ 61,600. COGS = 80,000 -> negative profit
    hospitalTier: "branded",
    paymentTermsDays: 30
  });
  assert.strictEqual(resFornas2.viabilityStatus, "UNVIABLE_SUB_ECONOMIC");
  assert.ok(resFornas2.manufacturerFinancials.unitGrossProfitIdr < 0);

  // 3c. Invalid input
  assert.throws(() => {
    evaluateEkatalogFornasMargin({ cogsPerUnit: -100, lkppCeilingPrice: 50000 });
  }, /INVALID_INPUT/);

  // -------------------------------------------------------------
  // Test 4: Pharmacovigilance (MESO) Engine
  // -------------------------------------------------------------
  console.log("  [4/5] Testing Pharmacovigilance & Adverse Drug Reaction (MESO) Engine...");

  const baseEventDate = "2026-10-01T08:00:00.000Z";
  // 4a. Serious Fatal Event reported within 5 days -> SLA compliant (15-day limit)
  const resMeso1 = evaluatePharmacovigilanceMeso({
    eventSeverity: "FATAL",
    eventDate: baseEventDate,
    reportDate: "2026-10-06T08:00:00.000Z",
    causalityCriteria: {
      temporalRelationship: true,
      dechallengePositive: true,
      rechallengePositive: true,
      alternativeExplanationPresent: false
    }
  });

  assert.strictEqual(resMeso1.eventClassification.isSerious, true);
  assert.strictEqual(resMeso1.bpomReportingSla.maxCalendarDays, 15);
  assert.strictEqual(resMeso1.bpomReportingSla.elapsedCalendarDays, 5);
  assert.strictEqual(resMeso1.bpomReportingSla.daysRemaining, 10);
  assert.strictEqual(resMeso1.bpomReportingSla.isSlaBreached, false);
  assert.strictEqual(resMeso1.bpomReportingSla.reportingUrgency, "EXPEDITED_15_DAYS_SERIOUS");
  assert.strictEqual(resMeso1.whoUmcCausality.causalityLevel, "CERTAIN");

  // 4b. Serious Event reported late (>15 days) -> SLA Breached
  const resMeso2 = evaluatePharmacovigilanceMeso({
    eventSeverity: "HOSPITALIZATION",
    eventDate: baseEventDate,
    reportDate: "2026-10-20T08:00:00.000Z", // 19 days elapsed
    causalityCriteria: {
      temporalRelationship: true,
      dechallengePositive: true,
      alternativeExplanationPresent: true
    }
  });
  assert.strictEqual(resMeso2.bpomReportingSla.isSlaBreached, true);
  assert.strictEqual(resMeso2.whoUmcCausality.causalityLevel, "POSSIBLE");

  // 4c. Non-Serious Event -> 180 days routine SLA
  const resMeso3 = evaluatePharmacovigilanceMeso({
    eventSeverity: "NON_SERIOUS",
    eventDate: baseEventDate,
    reportDate: "2026-10-10T08:00:00.000Z"
  });
  assert.strictEqual(resMeso3.eventClassification.isSerious, false);
  assert.strictEqual(resMeso3.bpomReportingSla.maxCalendarDays, 180);
  assert.strictEqual(resMeso3.bpomReportingSla.reportingUrgency, "PERIODIC_PBRER_ROUTINE");

  // 4d. Invalid dates
  assert.throws(() => {
    evaluatePharmacovigilanceMeso({ eventDate: "2026-10-10", reportDate: "2026-10-01" });
  }, /cannot be earlier/);

  // -------------------------------------------------------------
  // Test 5: Clinical Trial & Health Data Privacy (UU PDP) Engine
  // -------------------------------------------------------------
  console.log("  [5/5] Testing Clinical Trial Data Privacy & UU PDP Compliance Engine...");

  // 5a. Compliant multi-national clinical trial transfer
  const resPdp1 = auditClinicalTrialPdp({
    trialPhase: "PHASE_3",
    hasInformedConsent: true,
    hasEthicsApproval: true,
    dataTypes: ["HEALTH_RECORDS", "GENOMIC", "CLINICAL_LAB_RESULTS"],
    isCrossBorderTransfer: true,
    destinationCountry: "GB",
    transferSafeguards: {
      standardContractualClauses: true,
      explicitDataSubjectConsent: true
    }
  });

  assert.strictEqual(resPdp1.complianceStatus, "COMPLIANT");
  assert.strictEqual(resPdp1.riskScore, 0);
  assert.strictEqual(resPdp1.dataClassification.isSpecificHealthData, true);
  assert.strictEqual(resPdp1.crossBorderEvaluation.isTransferLawful, true);
  assert.strictEqual(resPdp1.crossBorderEvaluation.appliedLegalBasis, "CONTRACTUAL_SAFEGUARDS_PASAL_56_AYAT_2");
  assert.strictEqual(resPdp1.identifiedGaps.length, 0);

  // 5b. Non-compliant trial missing informed consent & unlawful cross-border transfer
  const resPdp2 = auditClinicalTrialPdp({
    trialPhase: "PHASE_2",
    hasInformedConsent: false,
    hasEthicsApproval: true,
    dataTypes: ["HEALTH_RECORDS"],
    isCrossBorderTransfer: true,
    destinationCountry: "US",
    transferSafeguards: {} // no safeguards
  });

  assert.strictEqual(resPdp2.complianceStatus, "NON_COMPLIANT_VIOLATION");
  assert.ok(resPdp2.riskScore >= 70);
  assert.ok(resPdp2.identifiedGaps.length >= 2);
  assert.ok(resPdp2.statutoryLiabilityNotice.includes("2%"));

  // -------------------------------------------------------------
  // Test 6: MKT Cold-Chain Engine (CDOB BPOM PerBPOM 6/2020)
  // -------------------------------------------------------------
  console.log("  [6/6] Testing Mean Kinetic Temperature (MKT) Cold-Chain Engine...");
  const resMkt = evaluateColdChainMkt({
    readings: [4.0, 4.5, 5.0, 5.5, 6.0, 5.0, 4.2],
    storageCondition: 'COLD_CHAIN_2_8',
    samplingIntervalMinutes: 15
  });
  assert.strictEqual(resMkt.auditVerdict.complianceStatus, "COMPLIANT");
  assert.ok(resMkt.metrics.mktCelsius >= 4.0 && resMkt.metrics.mktCelsius <= 6.0);

  console.log("\n✅ All 6 Pharmaceutical & Healthcare Intelligence Engines Passed 100% of Assertions!");
}

if (require.main === module) {
  runPharmaEngineTests();
}

module.exports = { runPharmaEngineTests };
