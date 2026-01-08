export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Weighted random selection - weights should sum to 1.0
export function weightedRandomChoice<T>(items: T[], weights: number[]): T {
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return items[i];
    }
  }
  return items[items.length - 1];
}

export function randomBoolean(probability = 0.5): boolean {
  return Math.random() < probability;
}

export function generateMRN(index: number): string {
  return `MRN-${String(index).padStart(6, '0')}`;
}

export function generateEncounterNumber(index: number): string {
  return `ENC-2025-${String(index).padStart(7, '0')}`;
}

export function generateTraceNumber(month: number, index: number): string {
  return `DCG-M${month}-${String(index).padStart(5, '0')}`;
}

export function generatePatternNumber(index: number): string {
  return `PAT-${String(index).padStart(4, '0')}`;
}

export function getMonthDate(month: number, day: number): Date {
  // Month 1 = July 2025, Month 6 = December 2025
  const monthIndex = month + 5; // July = 6 (0-indexed = 6)
  return new Date(2025, monthIndex, day);
}

export function generateName(): { firstName: string; lastName: string } {
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];
  
  return {
    firstName: randomChoice(firstNames),
    lastName: randomChoice(lastNames)
  };
}

export function generateDiagnosis(category: string): { code: string; description: string } {
  const diagnoses: Record<string, { code: string; description: string }[]> = {
    'Cardiac': [
      { code: 'I50.9', description: 'Heart failure, unspecified' },
      { code: 'I21.9', description: 'Acute myocardial infarction, unspecified' },
      { code: 'I25.10', description: 'Atherosclerotic heart disease' },
      { code: 'I48.91', description: 'Atrial fibrillation' }
    ],
    'Respiratory': [
      { code: 'J44.1', description: 'COPD with acute exacerbation' },
      { code: 'J18.9', description: 'Pneumonia, unspecified' },
      { code: 'J96.01', description: 'Acute respiratory failure with hypoxia' }
    ],
    'Orthopedic': [
      { code: 'S72.001A', description: 'Fracture of neck of femur' },
      { code: 'M17.11', description: 'Primary osteoarthritis, right knee' },
      { code: 'Z96.641', description: 'Presence of right artificial hip joint' }
    ],
    'Neurological': [
      { code: 'I63.9', description: 'Cerebral infarction, unspecified' },
      { code: 'G20', description: 'Parkinson disease' },
      { code: 'G30.9', description: 'Alzheimer disease, unspecified' }
    ],
    'Gastrointestinal': [
      { code: 'K92.2', description: 'Gastrointestinal hemorrhage' },
      { code: 'K80.20', description: 'Calculus of gallbladder without cholecystitis' }
    ],
    'Renal': [
      { code: 'N17.9', description: 'Acute kidney failure, unspecified' },
      { code: 'N18.6', description: 'End stage renal disease' }
    ],
    'Oncology': [
      { code: 'C34.90', description: 'Malignant neoplasm of lung' },
      { code: 'C18.9', description: 'Malignant neoplasm of colon' }
    ],
    'Infectious Disease': [
      { code: 'A41.9', description: 'Sepsis, unspecified organism' },
      { code: 'B37.7', description: 'Candidal sepsis' }
    ]
  };

  const categoryDiagnoses = diagnoses[category] || diagnoses['Cardiac'];
  return randomChoice(categoryDiagnoses);
}
