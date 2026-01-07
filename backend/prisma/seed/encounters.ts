import { PrismaClient } from '@prisma/client';
import { generateEncounterNumber, randomInt, randomChoice, randomBoolean, getMonthDate, generateDiagnosis } from './utils';
import { DIAGNOSIS_CATEGORIES, DISPOSITIONS, UNITS, MONTHLY_DECISIONS } from './constants';

export async function seedEncounters(prisma: PrismaClient) {
  const patients = await prisma.epic_Patient.findMany();
  const encounters = [];
  const diagnoses = [];
  const vitals = [];
  const labs = [];
  const medications = [];

  let encounterIndex = 1;

  // Create encounters across 6 months
  for (let month = 1; month <= 6; month++) {
    const encountersThisMonth = Math.floor(MONTHLY_DECISIONS / patients.length) + 1;
    
    for (const patient of patients) {
      for (let e = 0; e < encountersThisMonth && encounterIndex <= MONTHLY_DECISIONS * 6; e++) {
        const admitDay = randomInt(1, 25);
        const los = randomInt(2, 14);
        const admitDate = getMonthDate(month, admitDay);
        const dischargeDate = new Date(admitDate);
        dischargeDate.setDate(dischargeDate.getDate() + los);

        const encounterId = `enc-${encounterIndex}`;
        const category = randomChoice(DIAGNOSIS_CATEGORIES);
        const disposition = randomChoice(DISPOSITIONS);
        const isReadmission = randomBoolean(0.15);

        encounters.push({
          id: encounterId,
          encounter_number: generateEncounterNumber(encounterIndex),
          patient_id: patient.id,
          encounter_type: 'Inpatient',
          admit_datetime: admitDate,
          discharge_datetime: dischargeDate,
          discharge_disposition: disposition,
          hospital_service: category,
          unit: randomChoice(UNITS),
          los_days: los,
          readmission_flag: isReadmission,
          readmission_days: isReadmission ? randomInt(5, 25) : null
        });

        // Principal diagnosis
        const dx = generateDiagnosis(category);
        diagnoses.push({
          encounter_id: encounterId,
          icd10_code: dx.code,
          description: dx.description,
          diagnosis_type: 'principal',
          sequence_number: 1,
          category: category
        });

        // Secondary diagnoses
        const numSecondary = randomInt(1, 4);
        for (let s = 0; s < numSecondary; s++) {
          const secCategory = randomChoice(DIAGNOSIS_CATEGORIES);
          const secDx = generateDiagnosis(secCategory);
          diagnoses.push({
            encounter_id: encounterId,
            icd10_code: secDx.code,
            description: secDx.description,
            diagnosis_type: 'secondary',
            sequence_number: s + 2,
            category: secCategory
          });
        }

        // Vitals
        vitals.push({
          encounter_id: encounterId,
          recorded_datetime: dischargeDate,
          temperature: 98.6 + randomInt(-10, 20) / 10,
          heart_rate: randomInt(60, 100),
          bp_systolic: randomInt(110, 160),
          bp_diastolic: randomInt(60, 90),
          oxygen_saturation: randomInt(92, 100),
          weight_kg: randomInt(50, 120)
        });

        // Labs
        const labNames = ['BNP', 'Creatinine', 'Hemoglobin', 'WBC', 'Sodium', 'Potassium'];
        for (const labName of labNames.slice(0, randomInt(3, 6))) {
          labs.push({
            encounter_id: encounterId,
            collected_datetime: dischargeDate,
            lab_name: labName,
            lab_code: labName.substring(0, 3).toUpperCase(),
            result_value: `${randomInt(50, 150)}`,
            result_numeric: randomInt(50, 150),
            unit: 'mg/dL',
            abnormal_flag: randomBoolean(0.2) ? 'H' : null
          });
        }

        // Medications
        const medNames = ['Metoprolol', 'Lisinopril', 'Furosemide', 'Aspirin', 'Atorvastatin', 'Metformin', 'Warfarin', 'Insulin'];
        const numMeds = randomInt(3, 8);
        for (let m = 0; m < numMeds; m++) {
          const medName = randomChoice(medNames);
          medications.push({
            encounter_id: encounterId,
            medication_name: medName,
            generic_name: medName,
            dose: `${randomInt(1, 4) * 25}mg`,
            route: 'PO',
            frequency: randomChoice(['Daily', 'BID', 'TID', 'PRN']),
            order_status: 'Active',
            med_class: 'Cardiovascular',
            high_risk: ['Warfarin', 'Insulin'].includes(medName)
          });
        }

        encounterIndex++;
        if (encounterIndex > 3000) break; // Limit for initial seed
      }
      if (encounterIndex > 3000) break;
    }
    if (encounterIndex > 3000) break;
  }

  // Batch insert
  await prisma.epic_Encounter.createMany({ data: encounters });
  console.log(`Created ${encounters.length} encounters`);

  await prisma.epic_Diagnosis.createMany({ data: diagnoses });
  console.log(`Created ${diagnoses.length} diagnoses`);

  await prisma.epic_Vitals.createMany({ data: vitals });
  console.log(`Created ${vitals.length} vitals`);

  await prisma.epic_Labs.createMany({ data: labs });
  console.log(`Created ${labs.length} labs`);

  await prisma.epic_Willow_Medication.createMany({ data: medications });
  console.log(`Created ${medications.length} medications`);
}
