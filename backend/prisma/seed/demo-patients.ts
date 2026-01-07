import { PrismaClient } from '@prisma/client';
import { DEMO_PATIENTS } from './constants';

export async function seedDemoPatients(prisma: PrismaClient) {
  // Maria Garcia - Success case
  const maria = await prisma.epic_Patient.create({
    data: {
      mrn: DEMO_PATIENTS.MARIA.mrn,
      first_name: DEMO_PATIENTS.MARIA.firstName,
      last_name: DEMO_PATIENTS.MARIA.lastName,
      date_of_birth: new Date(1946, 2, 15),
      gender: 'Female',
      language: 'English',
      address_street: '456 Oak Avenue',
      address_city: 'Springfield',
      address_state: 'CA',
      address_zip: '92101',
      phone_home: '555-234-5678',
      phone_mobile: '555-234-5679',
      insurance_type: 'Medicare'
    }
  });

  // Robert Wilson - Failure case
  const robert = await prisma.epic_Patient.create({
    data: {
      mrn: DEMO_PATIENTS.ROBERT.mrn,
      first_name: DEMO_PATIENTS.ROBERT.firstName,
      last_name: DEMO_PATIENTS.ROBERT.lastName,
      date_of_birth: new Date(1948, 7, 22),
      gender: 'Male',
      language: 'English',
      address_street: '789 Pine Street',
      address_city: 'Riverside',
      address_state: 'CA',
      address_zip: '92501',
      phone_home: '555-345-6789',
      insurance_type: 'Medicare'
    }
  });

  // Patricia Brown - Context matching case
  const patricia = await prisma.epic_Patient.create({
    data: {
      mrn: DEMO_PATIENTS.PATRICIA.mrn,
      first_name: DEMO_PATIENTS.PATRICIA.firstName,
      last_name: DEMO_PATIENTS.PATRICIA.lastName,
      date_of_birth: new Date(1950, 4, 10),
      gender: 'Female',
      language: 'English',
      address_street: '321 Maple Drive',
      address_city: 'Fairview',
      address_state: 'CA',
      address_zip: '92301',
      phone_home: '555-456-7890',
      phone_mobile: '555-456-7891',
      insurance_type: 'Medicare Advantage'
    }
  });

  // Create encounters for demo patients
  const mariaEncounter = await prisma.epic_Encounter.create({
    data: {
      encounter_number: 'ENC-MARIA-001',
      patient_id: maria.id,
      encounter_type: 'Inpatient',
      admit_datetime: new Date(2025, 6, 10),
      discharge_datetime: new Date(2025, 6, 15),
      discharge_disposition: 'Home with Home Health',
      hospital_service: 'Cardiac',
      unit: '4 North - Cardiac',
      los_days: 5,
      readmission_flag: false
    }
  });

  const robertEncounter = await prisma.epic_Encounter.create({
    data: {
      encounter_number: 'ENC-ROBERT-001',
      patient_id: robert.id,
      encounter_type: 'Inpatient',
      admit_datetime: new Date(2025, 6, 8),
      discharge_datetime: new Date(2025, 6, 12),
      discharge_disposition: 'Home',
      hospital_service: 'Cardiac',
      unit: '4 North - Cardiac',
      los_days: 4,
      readmission_flag: true,
      readmission_days: 18
    }
  });

  const patriciaEncounter = await prisma.epic_Encounter.create({
    data: {
      encounter_number: 'ENC-PATRICIA-001',
      patient_id: patricia.id,
      encounter_type: 'Inpatient',
      admit_datetime: new Date(2025, 8, 5),
      discharge_datetime: new Date(2025, 8, 10),
      discharge_disposition: 'Home with Home Health',
      hospital_service: 'Cardiac',
      unit: '4 North - Cardiac',
      los_days: 5,
      readmission_flag: false
    }
  });

  // Add diagnoses
  await prisma.epic_Diagnosis.createMany({
    data: [
      { encounter_id: mariaEncounter.id, icd10_code: 'I50.9', description: 'Heart failure, unspecified', diagnosis_type: 'principal', sequence_number: 1, category: 'Cardiac' },
      { encounter_id: robertEncounter.id, icd10_code: 'I50.9', description: 'Heart failure, unspecified', diagnosis_type: 'principal', sequence_number: 1, category: 'Cardiac' },
      { encounter_id: patriciaEncounter.id, icd10_code: 'I50.9', description: 'Heart failure, unspecified', diagnosis_type: 'principal', sequence_number: 1, category: 'Cardiac' }
    ]
  });

  console.log('Created demo patients: Maria, Robert, Patricia');
}
