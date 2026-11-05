/**
 * TypeScript Typings for `indonesia-pharma-agent-skills`
 */

export interface ExtensionSkill {
  id: string;
  name: string;
  description: string;
  path: string;
  risk_level?: string;
  rule_type?: string;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  domain: string;
  author?: string;
  license?: string;
  description: string;
  statutoryFrameworks?: string[];
  skills: ExtensionSkill[];
  engines: Record<string, (...args: any[]) => any>;
  rules: Record<string, any>;
}

export interface BpomRegistrationParams {
  category: "OBAT_BARU" | "OBAT_COPY" | "REGISTRASI_VARIASI" | "REGISTRASI_ULANG";
  subType: string;
  includePraRegistrasi?: boolean;
  qualifyingCriteria?: string[];
  actdDossier?: {
    part1Admin?: boolean;
    part2Quality?: boolean;
    part3NonClinical?: boolean;
    part4Clinical?: boolean;
  };
}

export interface BpomRegistrationResult {
  category: string;
  subType: string;
  totalPnbpFeeIdr: number;
  pnbpBreakdown: {
    praRegistrasiFeeIdr: number;
    registrasiFeeIdr: number;
  };
  evaluationPathway: {
    pathway: string;
    maxWorkingDays: number;
    qualifyingFactors: string[];
  };
  dossierAudit: {
    isComplete: boolean;
    readinessScorePercent: number;
    missingParts: string[];
  };
  statutoryBasis: string;
}

export interface TkdnPharmaParams {
  apiScore?: number;
  rndScore?: number;
  formulationScore?: number;
  packagingScore?: number;
  bmpScore?: number;
  activeIngredient?: number;
  researchDevelopment?: number;
  productionFormulation?: number;
  packagingMaterials?: number;
  companyBenefitWeight?: number;
}

export interface TkdnPharmaResult {
  tkdnScorePercent: number;
  dimensionBreakdown: {
    activePharmaceuticalIngredient: { rawPercent: number; weight: number; points: number };
    researchDevelopment: { rawPercent: number; weight: number; points: number };
    productionFormulation: { rawPercent: number; weight: number; points: number };
    packagingMaterials: { rawPercent: number; weight: number; points: number };
  };
  bmpScorePercent: number;
  combinedScorePercent: number;
  procurementEligibility: {
    status: string;
    isMandatoryProcurement: boolean;
    isPreferenceEligible: boolean;
    pricePreferencePercent: number;
  };
  statutoryBasis: string;
}

export interface EkatalogFornasParams {
  factoryHnaIdr: number;
  distributionCostPercent?: number;
  hospitalMarginPercent?: number;
  isFornasListed: boolean;
  tenderCeilingPriceIdr?: number;
  ppnRatePercent?: number;
  financingCarryingCostAnnualPercent?: number;
  daysReceivableOutstanding?: number;
}

export interface EkatalogFornasResult {
  factoryHnaIdr: number;
  baseHnaWithDistributorIdr: number;
  hospitalPurchasePriceExclTaxIdr: number;
  effectivePpnAmountIdr: number;
  tenderOfferPriceInclTaxIdr: number;
  carryingCostPerUnitIdr: number;
  netMarginIdr: number;
  netMarginPercent: number;
  ceilingEvaluation: {
    ceilingPriceIdr: number | null;
    isBelowCeiling: boolean;
    varianceIdr: number | null;
  };
  fornasCompliance: {
    isFornasListed: boolean;
    procurementEligibility: string;
  };
}

export interface MesoPharmacovigilanceParams {
  suspectedDrug: string;
  adverseEventDescription: string;
  onsetDelayHours: number;
  dechallengeOutcome: "POSITIVE" | "NEGATIVE" | "NOT_DONE";
  rechallengeOutcome: "POSITIVE" | "NEGATIVE" | "NOT_DONE";
  isAlternativeCauseIdentified: boolean;
  isEventFatalOrLifeThreatening: boolean;
  eventDate?: string;
  reportDate?: string;
}

export interface MesoPharmacovigilanceResult {
  suspectedDrug: string;
  whoUmcCausalityCategory: "CERTAIN" | "PROBABLE" | "POSSIBLE" | "UNLIKELY" | "CONDITIONAL" | "UNCLASSIFIABLE";
  severityClassification: "SERIOUS_CRITICAL" | "NON_SERIOUS";
  reportingTimeline: {
    maxReportingCalendarDays: number;
    urgencyLevel: string;
    deadlineNotice: string;
  };
  statutoryBasis: string;
}

export interface ClinicalTrialPdpParams {
  trialPhase: "PHASE_1" | "PHASE_2" | "PHASE_3" | "PHASE_4" | "NON_INTERVENTIONAL";
  hasInformedConsent: boolean;
  hasEthicsApproval: boolean;
  dataTypes: string[];
  isCrossBorderTransfer: boolean;
  destinationCountry?: string;
  transferSafeguards?: {
    hasStandardContractualClauses?: boolean;
    hasBindingCorporateRules?: boolean;
    hasExplicitSubjectConsent?: boolean;
  };
}

export interface ClinicalTrialPdpResult {
  complianceStatus: "COMPLIANT" | "NON_COMPLIANT_VIOLATION";
  riskScore: number;
  dataClassification: {
    isSpecificHealthData: boolean;
    dataCategories: string[];
  };
  crossBorderEvaluation: {
    isTransferLawful: boolean;
    appliedLegalBasis: string;
  };
  identifiedGaps: string[];
  statutoryLiabilityNotice: string;
}

export interface MktReadingItem {
  tempCelsius?: number;
  temperature?: number;
  timestamp?: string;
}

export interface MktColdChainParams {
  readings: Array<number | MktReadingItem>;
  storageCondition?: "COLD_CHAIN_2_8" | "DEEP_FREEZE_MINUS_20" | "ULTRA_COLD_MINUS_80" | "COOL_STORAGE_8_15" | "CONTROLLED_ROOM_15_25";
  customSpecification?: {
    name?: string;
    minCelsius: number;
    maxCelsius: number;
    freezeRiskThresholdCelsius?: number | null;
    criticalExcursionUpperCelsius?: number | null;
    maxTolerableExcursionHours?: number;
  };
  samplingIntervalMinutes?: number;
  activationEnergyDeltaH?: number;
  freezeSensitive?: boolean;
  productName?: string;
}

export interface MktColdChainResult {
  productName: string | null;
  storageCondition: string;
  specification: {
    name: string;
    minCelsius: number;
    maxCelsius: number;
    freezeRiskThresholdCelsius: number | null;
    criticalExcursionUpperCelsius: number | null;
    maxTolerableExcursionHours: number;
  };
  metrics: {
    totalReadings: number;
    samplingIntervalMinutes: number;
    totalDurationHours: number;
    minObservedCelsius: number;
    maxObservedCelsius: number;
    arithmeticMeanCelsius: number;
    mktCelsius: number;
    mktKelvin: number;
    deltaMktVsArithmetic: number;
  };
  excursions: {
    hasExcursions: boolean;
    upperExcursionCount: number;
    upperExcursionHours: number;
    lowerExcursionCount: number;
    lowerExcursionHours: number;
    totalExcursionHours: number;
    criticalUpperCount: number;
    criticalUpperHours: number;
    freezeCount: number;
    freezeHours: number;
  };
  auditVerdict: {
    complianceStatus: "COMPLIANT" | "ACCEPTABLE_WITH_JUSTIFICATION" | "BREACH_QUARANTINE_MANDATED";
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    isCompliant: boolean;
    requiresQuarantine: boolean;
    violations: string[];
    mandatedActions: string[];
  };
  statutoryFramework: {
    cdobRegulation: string;
    internationalStandards: string[];
    mktFormula: string;
  };
}

export function evaluateBpomRegistration(params: BpomRegistrationParams): BpomRegistrationResult;
export function calculatePharmaTkdn(params: TkdnPharmaParams): TkdnPharmaResult;
export function evaluateEkatalogFornasMargin(params: EkatalogFornasParams): EkatalogFornasResult;
export function evaluatePharmacovigilanceMeso(params: MesoPharmacovigilanceParams): MesoPharmacovigilanceResult;
export function auditClinicalTrialPdp(params: ClinicalTrialPdpParams): ClinicalTrialPdpResult;
export function evaluateColdChainMkt(params: MktColdChainParams): MktColdChainResult;

export function register(coreRegistry?: any): {
  success: boolean;
  extensionId: string;
  name: string;
  version: string;
  domain: string;
  skillCount: number;
  engineCount: number;
  registeredAt: string;
};

export const manifest: ExtensionManifest;
export const engines: Record<string, (...args: any[]) => any>;
export const rules: Record<string, any>;
