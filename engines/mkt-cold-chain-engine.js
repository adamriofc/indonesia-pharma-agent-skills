/**
 * Mean Kinetic Temperature (MKT) Cold-Chain & CDOB Compliance Engine (`engines/mkt-cold-chain-engine.js`)
 *
 * Implements deterministic Mean Kinetic Temperature (MKT) calculation per Haynes (1971),
 * USP <1079> Good Storage & Shipping Practices, and evaluation of temperature excursions
 * under Indonesian BPOM CDOB (Cara Distribusi Obat yang Baik - PerBPOM No. 6/2020 & PerBPOM No. 9/2019).
 *
 * Pure Node.js, zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

let COLD_CHAIN_SPECS = null;

function getSpecs() {
  if (!COLD_CHAIN_SPECS) {
    const specsPath = path.join(__dirname, 'rules/cold-chain-specs.json');
    if (fs.existsSync(specsPath)) {
      COLD_CHAIN_SPECS = JSON.parse(fs.readFileSync(specsPath, 'utf8'));
    } else {
      // Fallback constants if file lookup fails
      COLD_CHAIN_SPECS = {
        defaultConstants: {
          activationEnergyDeltaH: 83144.0,
          gasConstantR: 8.314472,
          deltaHOverR: 10000.0,
          absoluteZeroOffset: 273.15
        },
        storageConditions: {
          COLD_CHAIN_2_8: {
            name: "Chilled / Cold Chain (2°C - 8°C)",
            minCelsius: 2.0,
            maxCelsius: 8.0,
            freezeRiskThresholdCelsius: 0.0,
            criticalExcursionUpperCelsius: 15.0,
            maxTolerableExcursionHours: 24.0
          }
        }
      };
    }
  }
  return COLD_CHAIN_SPECS;
}

/**
 * Calculate Mean Kinetic Temperature (MKT) and evaluate CDOB cold-chain compliance.
 *
 * @param {Object} params
 * @param {Array<number|Object>} params.readings Array of temperatures in Celsius, or array of objects with tempCelsius property.
 * @param {string} [params.storageCondition="COLD_CHAIN_2_8"] Storage condition identifier (e.g. COLD_CHAIN_2_8, CONTROLLED_ROOM_15_25, DEEP_FREEZE_MINUS_20).
 * @param {Object} [params.customSpecification] Custom { minCelsius, maxCelsius, freezeRiskThresholdCelsius, criticalExcursionUpperCelsius, maxTolerableExcursionHours }.
 * @param {number} [params.samplingIntervalMinutes=15] Interval between consecutive readings in minutes.
 * @param {number} [params.activationEnergyDeltaH=83144] Activation energy in J/mol (default 83.144 kJ/mol).
 * @param {boolean} [params.freezeSensitive=true] Whether the biological/pharmaceutical product is freeze-sensitive (e.g., liquid vaccines).
 * @param {string} [params.productName] Optional product name / batch identifier for the compliance receipt.
 * @returns {Object} Comprehensive MKT audit and CDOB compliance evaluation.
 */
function evaluateColdChainMkt(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('INVALID_INPUT: params must be a non-null object.');
  }

  const {
    readings,
    storageCondition = 'COLD_CHAIN_2_8',
    customSpecification,
    samplingIntervalMinutes = 15,
    activationEnergyDeltaH,
    freezeSensitive = true,
    productName = null
  } = params;

  if (!Array.isArray(readings) || readings.length < 2) {
    throw new Error('INVALID_INPUT: readings must be an array containing at least 2 temperature entries.');
  }

  if (typeof samplingIntervalMinutes !== 'number' || samplingIntervalMinutes <= 0 || isNaN(samplingIntervalMinutes)) {
    throw new Error('INVALID_INPUT: samplingIntervalMinutes must be a positive number.');
  }

  const specs = getSpecs();
  const constants = specs.defaultConstants;
  const deltaH = typeof activationEnergyDeltaH === 'number' && activationEnergyDeltaH > 0
    ? activationEnergyDeltaH
    : constants.activationEnergyDeltaH;
  const R = constants.gasConstantR;
  const deltaHOverR = deltaH / R;
  const kelvinOffset = constants.absoluteZeroOffset;

  let spec = null;
  if (customSpecification && typeof customSpecification === 'object') {
    if (typeof customSpecification.minCelsius !== 'number' || typeof customSpecification.maxCelsius !== 'number' ||
        customSpecification.minCelsius >= customSpecification.maxCelsius) {
      throw new Error('INVALID_INPUT: customSpecification must have numeric minCelsius < maxCelsius.');
    }
    spec = {
      name: customSpecification.name || 'Custom Storage Specification',
      minCelsius: customSpecification.minCelsius,
      maxCelsius: customSpecification.maxCelsius,
      freezeRiskThresholdCelsius: typeof customSpecification.freezeRiskThresholdCelsius === 'number'
        ? customSpecification.freezeRiskThresholdCelsius
        : (customSpecification.minCelsius <= 2.0 ? 0.0 : null),
      criticalExcursionUpperCelsius: typeof customSpecification.criticalExcursionUpperCelsius === 'number'
        ? customSpecification.criticalExcursionUpperCelsius
        : (customSpecification.maxCelsius + 10.0),
      maxTolerableExcursionHours: typeof customSpecification.maxTolerableExcursionHours === 'number'
        ? customSpecification.maxTolerableExcursionHours
        : 24.0
    };
  } else {
    spec = specs.storageConditions[storageCondition];
    if (!spec) {
      const validConditions = Object.keys(specs.storageConditions).join(', ');
      throw new Error(`INVALID_INPUT: storageCondition "${storageCondition}" not recognized. Valid: ${validConditions}`);
    }
  }

  // Parse and validate temperatures
  const temps = [];
  for (let i = 0; i < readings.length; i++) {
    const item = readings[i];
    let val = null;
    if (typeof item === 'number') {
      val = item;
    } else if (item && typeof item === 'object' && typeof item.tempCelsius === 'number') {
      val = item.tempCelsius;
    } else if (item && typeof item === 'object' && typeof item.temperature === 'number') {
      val = item.temperature;
    } else {
      throw new Error(`INVALID_INPUT: reading at index ${i} is not a valid numeric temperature.`);
    }

    if (isNaN(val) || !isFinite(val)) {
      throw new Error(`INVALID_INPUT: reading at index ${i} contains NaN or non-finite temperature.`);
    }

    // Absolute zero safety check
    if (val < -kelvinOffset) {
      throw new Error(`INVALID_INPUT: temperature ${val}°C is below absolute zero (-273.15°C).`);
    }

    temps.push(val);
  }

  const n = temps.length;
  let sumExp = 0;
  let arithmeticSum = 0;
  let minObserved = Infinity;
  let maxObserved = -Infinity;

  let upperExcursionCount = 0;
  let lowerExcursionCount = 0;
  let criticalUpperCount = 0;
  let freezeCount = 0;

  for (let i = 0; i < n; i++) {
    const tC = temps[i];
    const tK = tC + kelvinOffset;

    arithmeticSum += tC;
    if (tC < minObserved) minObserved = tC;
    if (tC > maxObserved) maxObserved = tC;

    // Arrhenius exponential term: e^(-(ΔH/R) / T)
    const exponent = -deltaHOverR / tK;
    sumExp += Math.exp(exponent);

    // Excursion counters
    if (tC > spec.maxCelsius) {
      upperExcursionCount++;
      if (spec.criticalExcursionUpperCelsius !== null && tC >= spec.criticalExcursionUpperCelsius) {
        criticalUpperCount++;
      }
    } else if (tC < spec.minCelsius) {
      lowerExcursionCount++;
    }

    if (spec.freezeRiskThresholdCelsius !== null && tC <= spec.freezeRiskThresholdCelsius) {
      freezeCount++;
    }
  }

  // Mean Kinetic Temperature (Kelvin):
  // Tk = (ΔH/R) / -ln( sumExp / n )
  const meanExp = sumExp / n;
  const tkKelvin = deltaHOverR / -Math.log(meanExp);
  const mktCelsius = tkKelvin - kelvinOffset;
  const arithmeticMeanCelsius = arithmeticSum / n;

  // Duration calculations
  const totalDurationMinutes = n * samplingIntervalMinutes;
  const totalDurationHours = Math.round((totalDurationMinutes / 60) * 100) / 100;

  const upperExcursionMinutes = upperExcursionCount * samplingIntervalMinutes;
  const upperExcursionHours = Math.round((upperExcursionMinutes / 60) * 100) / 100;

  const lowerExcursionMinutes = lowerExcursionCount * samplingIntervalMinutes;
  const lowerExcursionHours = Math.round((lowerExcursionMinutes / 60) * 100) / 100;

  const totalExcursionHours = Math.round(((upperExcursionMinutes + lowerExcursionMinutes) / 60) * 100) / 100;
  const criticalUpperHours = Math.round(((criticalUpperCount * samplingIntervalMinutes) / 60) * 100) / 100;
  const freezeHours = Math.round(((freezeCount * samplingIntervalMinutes) / 60) * 100) / 100;

  // Evaluate Compliance Classification
  let complianceStatus = 'COMPLIANT';
  let riskLevel = 'LOW';
  const complianceViolations = [];
  const requiredActions = [];

  const isFreezeEvent = freezeSensitive && freezeCount > 0;
  const isMktExceeded = mktCelsius > spec.maxCelsius || mktCelsius < spec.minCelsius;
  const isCriticalUpperExceeded = criticalUpperCount > 0;
  const isDurationExceeded = totalExcursionHours > spec.maxTolerableExcursionHours;

  if (isFreezeEvent) {
    complianceStatus = 'BREACH_QUARANTINE_MANDATED';
    riskLevel = 'CRITICAL';
    complianceViolations.push(
      `FREEZE_BREACH: Product experienced ${freezeHours} hours at or below ${spec.freezeRiskThresholdCelsius}°C. Freeze-sensitive biologicals risk irreversible denaturation.`
    );
    requiredActions.push('Segregate and apply immediate physical & ERP quarantine (Status: QUARANTINED).');
    requiredActions.push('Perform Shake Test (for adsorbed liquid vaccines) or manufacturer stability assessment.');
  }

  if (isCriticalUpperExceeded) {
    complianceStatus = 'BREACH_QUARANTINE_MANDATED';
    riskLevel = 'CRITICAL';
    complianceViolations.push(
      `CRITICAL_TEMPERATURE_SPIKE: Temperature reached ${maxObserved}°C (critical threshold: ${spec.criticalExcursionUpperCelsius}°C) for ${criticalUpperHours} hours.`
    );
    if (!requiredActions.includes('Segregate and apply immediate physical & ERP quarantine (Status: QUARANTINED).')) {
      requiredActions.push('Segregate and apply immediate physical & ERP quarantine (Status: QUARANTINED).');
    }
  }

  if (isMktExceeded) {
    complianceStatus = 'BREACH_QUARANTINE_MANDATED';
    if (riskLevel !== 'CRITICAL') {
      riskLevel = 'HIGH';
    }
    complianceViolations.push(
      `MKT_SPEC_EXCEEDED: Calculated MKT is ${Math.round(mktCelsius * 100) / 100}°C, which is outside the specified range of [${spec.minCelsius}°C, ${spec.maxCelsius}°C].`
    );
    if (!requiredActions.includes('Segregate and apply immediate physical & ERP quarantine (Status: QUARANTINED).')) {
      requiredActions.push('Segregate and apply immediate physical & ERP quarantine (Status: QUARANTINED).');
    }
  }

  if (isDurationExceeded && complianceStatus !== 'BREACH_QUARANTINE_MANDATED') {
    complianceStatus = 'BREACH_QUARANTINE_MANDATED';
    riskLevel = 'HIGH';
    complianceViolations.push(
      `EXCURSION_DURATION_EXCEEDED: Cumulative excursion time (${totalExcursionHours} hrs) exceeds the standard stability limit of ${spec.maxTolerableExcursionHours} hrs.`
    );
    requiredActions.push('Segregate and apply immediate physical & ERP quarantine (Status: QUARANTINED).');
  }

  // If there were excursions but MKT is still within spec and no critical spikes
  if (complianceStatus === 'COMPLIANT' && (upperExcursionCount > 0 || lowerExcursionCount > 0)) {
    complianceStatus = 'ACCEPTABLE_WITH_JUSTIFICATION';
    riskLevel = 'MEDIUM';
    complianceViolations.push(
      `TRANSIENT_EXCURSION: Temperature drifted outside [${spec.minCelsius}°C, ${spec.maxCelsius}°C] for ${totalExcursionHours} hours, but MKT (${Math.round(mktCelsius * 100) / 100}°C) remains within limits.`
    );
    requiredActions.push('Log incident in CDOB Temperature Excursion Register.');
    requiredActions.push('Initiate internal deviation report & CAPA investigation per PerBPOM No. 6/2020 Bab V.');
    requiredActions.push('Obtain formal release signature from Apoteker Penanggung Jawab (APJ) before distribution.');
  }

  if (complianceStatus === 'COMPLIANT') {
    requiredActions.push('Maintain standard cold-chain log in CDOB archive for minimal 3 years or product shelf-life + 1 year.');
  } else if (complianceStatus === 'BREACH_QUARANTINE_MANDATED') {
    requiredActions.push('Notify Marketing Authorization Holder (MAH) / Principal for formal disposition.');
    requiredActions.push('File BPOM Non-Conformance Report if batch is distributed or unrecoverable.');
  }

  return {
    productName,
    storageCondition,
    specification: {
      name: spec.name,
      minCelsius: spec.minCelsius,
      maxCelsius: spec.maxCelsius,
      freezeRiskThresholdCelsius: spec.freezeRiskThresholdCelsius,
      criticalExcursionUpperCelsius: spec.criticalExcursionUpperCelsius,
      maxTolerableExcursionHours: spec.maxTolerableExcursionHours
    },
    metrics: {
      totalReadings: n,
      samplingIntervalMinutes,
      totalDurationHours,
      minObservedCelsius: Math.round(minObserved * 100) / 100,
      maxObservedCelsius: Math.round(maxObserved * 100) / 100,
      arithmeticMeanCelsius: Math.round(arithmeticMeanCelsius * 100) / 100,
      mktCelsius: Math.round(mktCelsius * 100) / 100,
      mktKelvin: Math.round(tkKelvin * 100) / 100,
      deltaMktVsArithmetic: Math.round((mktCelsius - arithmeticMeanCelsius) * 100) / 100
    },
    excursions: {
      hasExcursions: upperExcursionCount > 0 || lowerExcursionCount > 0,
      upperExcursionCount,
      upperExcursionHours,
      lowerExcursionCount,
      lowerExcursionHours,
      totalExcursionHours,
      criticalUpperCount,
      criticalUpperHours,
      freezeCount,
      freezeHours
    },
    auditVerdict: {
      complianceStatus,
      riskLevel,
      isCompliant: complianceStatus === 'COMPLIANT',
      requiresQuarantine: complianceStatus === 'BREACH_QUARANTINE_MANDATED',
      violations: complianceViolations,
      mandatedActions: requiredActions
    },
    statutoryFramework: {
      cdobRegulation: "PerBPOM No. 6/2020 tentang Pedoman Teknis Cara Distribusi Obat yang Baik (CDOB)",
      internationalStandards: ["USP <1079>", "WHO TRS 961 Annex 9"],
      mktFormula: "Haynes (1971): ΔH/R = 10,000 K (Activation Energy = 83.144 kJ/mol)"
    }
  };
}

module.exports = {
  evaluateColdChainMkt
};
