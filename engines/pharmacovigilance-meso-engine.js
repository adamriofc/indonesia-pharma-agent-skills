/**
 * Pharmacovigilance & Adverse Drug Reaction (MESO) Audit Engine (`engines/pharmacovigilance-meso-engine.js`)
 *
 * Implements deterministic adverse drug reaction (Monitoring Efek Samping Obat / MESO)
 * regulatory triage under BPOM Regulation PerBPOM No. 15/2022 and WHO-UMC Causality Classification.
 * Evaluates:
 *   - Statutory reporting SLA (15 calendar days for serious events vs periodic PBRER)
 *   - SLA breach risk and days remaining
 *   - WHO-UMC deterministic causality tier (Certain, Probable, Possible, Unlikely)
 *
 * DOCTRINE: Pure numerical computation and deterministic clinical compliance logic.
 * ZERO prescriptive text / ZERO subjective advice.
 * Pure Node.js, zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

let MESO_RULES = null;
function getRules() {
  if (!MESO_RULES) {
    const rulesPath = path.join(__dirname, 'rules/meso-causality.json');
    if (fs.existsSync(rulesPath)) {
      MESO_RULES = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    } else {
      MESO_RULES = {
        reportingTimelines: {
          SERIOUS_FATAL_OR_LIFE_THREATENING: { maxCalendarDays: 15 },
          SERIOUS_OTHER: { maxCalendarDays: 15 },
          NON_SERIOUS: { maxCalendarDays: 180 }
        }
      };
    }
  }
  return MESO_RULES;
}

const SERIOUS_SEVERITIES = [
  'FATAL',
  'LIFE_THREATENING',
  'HOSPITALIZATION',
  'DISABILITY',
  'CONGENITAL_ANOMALY',
  'OTHER_SERIOUS'
];

function evaluatePharmacovigilanceMeso(input = {}) {
  if (!input || typeof input !== 'object') {
    throw new Error("INVALID_INPUT: Input must be a valid parameters object");
  }

  const severity = String(input.eventSeverity || input.severity || 'NON_SERIOUS').toUpperCase().trim();
  const eventDateStr = input.eventDate || input.incidentDate;
  const reportDateStr = input.reportDate || new Date().toISOString();

  if (!eventDateStr) {
    throw new Error("INVALID_INPUT: 'eventDate' is required (ISO 8601 string or valid date)");
  }

  const eventTime = new Date(eventDateStr).getTime();
  const reportTime = new Date(reportDateStr).getTime();

  if (isNaN(eventTime)) {
    throw new Error(`INVALID_INPUT: Invalid 'eventDate' format: ${eventDateStr}`);
  }
  if (isNaN(reportTime)) {
    throw new Error(`INVALID_INPUT: Invalid 'reportDate' format: ${reportDateStr}`);
  }
  if (reportTime < eventTime) {
    throw new Error("INVALID_INPUT: 'reportDate' cannot be earlier than 'eventDate'");
  }

  const isSerious = SERIOUS_SEVERITIES.includes(severity);
  const maxCalendarDays = isSerious ? 15 : 180;

  const diffMs = reportTime - eventTime;
  const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, maxCalendarDays - elapsedDays);
  const isSlaBreached = elapsedDays > maxCalendarDays;

  // WHO-UMC Causality Algorithm
  let causalityLevel = "CONDITIONAL_UNCLASSIFIED";
  let causalityRationale = "Data penilaian kausalitas belum lengkap";

  if (input.causalityCriteria && typeof input.causalityCriteria === 'object') {
    const c = input.causalityCriteria;
    const hasTemporal = Boolean(c.temporalRelationship);
    const dechallengePos = Boolean(c.dechallengePositive);
    const rechallengePos = c.rechallengePositive !== undefined ? Boolean(c.rechallengePositive) : null;
    const altExplanation = Boolean(c.alternativeExplanationPresent);

    if (!hasTemporal) {
      causalityLevel = "UNLIKELY";
      causalityRationale = "Hubungan waktu tidak masuk akal atau tidak konsisten dengan profil farmakologis";
    } else if (hasTemporal && dechallengePos && rechallengePos === true && !altExplanation) {
      causalityLevel = "CERTAIN";
      causalityRationale = "Hubungan temporal jelas, dechallenge positif, rechallenge positif, dan tidak ada penjelasan alternatif";
    } else if (hasTemporal && dechallengePos && !altExplanation) {
      causalityLevel = "PROBABLE";
      causalityRationale = "Hubungan temporal masuk akal, dechallenge positif, dan kecil kemungkinan disebabkan penyakit penyerta";
    } else if (hasTemporal && altExplanation) {
      causalityLevel = "POSSIBLE";
      causalityRationale = "Hubungan temporal masuk akal tetapi terdapat penyakit atau obat lain yang dapat menjelaskan kejadian";
    } else {
      causalityLevel = "POSSIBLE";
      causalityRationale = "Memenuhi kriteria minimal hubungan temporal; data rechallenge/dechallenge belum konklusif";
    }
  }

  return {
    eventClassification: {
      eventSeverity: severity,
      isSerious
    },
    bpomReportingSla: {
      maxCalendarDays,
      elapsedCalendarDays: elapsedDays,
      daysRemaining,
      isSlaBreached,
      reportingUrgency: isSerious ? "EXPEDITED_15_DAYS_SERIOUS" : "PERIODIC_PBRER_ROUTINE"
    },
    whoUmcCausality: {
      causalityLevel,
      causalityRationale
    },
    statutoryBasis: "PerBPOM No. 15/2022 tentang Penerapan Farmakovigilans & WHO-UMC Causality Assessment"
  };
}

module.exports = {
  evaluatePharmacovigilanceMeso
};
