// Large Hospital Configuration - 3,000 discharges/month
export const MONTHLY_DECISIONS = 3000;
export const TOTAL_MONTHS = 9;
export const TOTAL_DECISIONS = MONTHLY_DECISIONS * TOTAL_MONTHS; // 27,000

// Decision traces with rich context (100+ every 3 months)
export const RICH_CONTEXT_PER_QUARTER = 150;

// Month labels (April - December 2025) - 9 months total
export const MONTH_LABELS = [
  'April 2025',
  'May 2025',
  'June 2025',
  'July 2025',
  'August 2025',
  'September 2025',
  'October 2025',
  'November 2025',
  'December 2025'
];

// Cost per readmission (CMS data)
export const COST_PER_READMISSION = 15200;

// Baseline readmission rate
export const BASELINE_READMISSION_RATE = 0.172;

// Target readmission rate by Month 6
export const TARGET_READMISSION_RATE = 0.135;

// Demo patients
export const DEMO_PATIENTS = {
  MARIA: {
    mrn: 'DCG-MARIA-001',
    firstName: 'Maria',
    lastName: 'Garcia',
    description: 'Success case - rich caregiver context led to successful home discharge'
  },
  ROBERT: {
    mrn: 'DCG-ROBERT-001',
    firstName: 'Robert',
    lastName: 'Wilson',
    description: 'Failure case - minimal context, readmitted within 30 days'
  },
  PATRICIA: {
    mrn: 'DCG-PATRICIA-001',
    firstName: 'Patricia',
    lastName: 'Brown',
    description: 'Context matching case - Maria found as precedent'
  }
};

// Diagnosis categories
export const DIAGNOSIS_CATEGORIES = [
  'Cardiac',
  'Respiratory',
  'Orthopedic',
  'Neurological',
  'Gastrointestinal',
  'Renal',
  'Oncology',
  'Infectious Disease'
];

// Discharge dispositions
export const DISPOSITIONS = [
  'Home',
  'Home with Home Health',
  'SNF',
  'Rehab',
  'LTAC',
  'Hospice'
];

// Insurance types
export const INSURANCE_TYPES = [
  'Medicare',
  'Medicaid',
  'Commercial',
  'Medicare Advantage',
  'Self-Pay'
];

// Hospital units
export const UNITS = [
  '4 North - Cardiac',
  '4 South - Cardiac Step-down',
  '5 North - Medical',
  '5 South - Surgical',
  '6 North - Orthopedic',
  '6 South - Neuro',
  '7 North - Oncology',
  'ICU',
  'CCU',
  'MICU'
];
