import { PrismaClient } from '@prisma/client';
import { DEMO_PATIENTS } from './constants';
import { randomBoolean, randomChoice } from './utils';

export async function seedEnsocareData(prisma: PrismaClient) {
  const patients = await prisma.epic_Patient.findMany();

  for (const patient of patients) {
    const encounter = await prisma.epic_Encounter.findFirst({
      where: { patient_id: patient.id },
      orderBy: { admit_datetime: 'desc' }
    });

    if (!encounter) continue;

    const hasCaregiver = randomBoolean(0.7);
    const isDemoPatient = [DEMO_PATIENTS.MARIA.mrn, DEMO_PATIENTS.ROBERT.mrn, DEMO_PATIENTS.PATRICIA.mrn].includes(patient.mrn);

    const ensocareCase = await prisma.ensocare_Case.create({
      data: {
        case_number: `EC-${patient.mrn}`,
        encounter_id: encounter.id,
        patient_mrn: patient.mrn,
        case_status: 'Active',
        priority: randomChoice(['High', 'Medium', 'Low']),
        target_discharge_date: encounter.discharge_datetime
      }
    });

    // Special handling for demo patients
    if (patient.mrn === DEMO_PATIENTS.MARIA.mrn) {
      await prisma.ensocare_SocialAssessment.create({
        data: {
          case_id: ensocareCase.id,
          living_situation: 'Lives alone',
          residence_type: 'House',
          stairs_in_home: true,
          has_caregiver: true,
          caregiver_name: 'Carmen Garcia',
          caregiver_relationship: 'Daughter',
          has_transportation: true,
          sdoh_food_insecurity: false,
          sdoh_housing_instability: false,
          sdoh_transportation_needs: false,
          adl_bathing: 'Independent',
          adl_dressing: 'Independent',
          adl_toileting: 'Independent',
          cognitive_status: 'Intact',
          assessed_datetime: new Date(2025, 6, 11)
        }
      });
    } else if (patient.mrn === DEMO_PATIENTS.ROBERT.mrn) {
      await prisma.ensocare_SocialAssessment.create({
        data: {
          case_id: ensocareCase.id,
          living_situation: 'Lives alone',
          residence_type: 'Apartment',
          stairs_in_home: false,
          has_caregiver: true,
          caregiver_name: 'Son',
          caregiver_relationship: 'Son',
          has_transportation: false,
          sdoh_food_insecurity: false,
          sdoh_housing_instability: false,
          sdoh_transportation_needs: true,
          adl_bathing: 'Needs assistance',
          adl_dressing: 'Independent',
          adl_toileting: 'Independent',
          cognitive_status: 'Intact',
          assessed_datetime: new Date(2025, 6, 9)
        }
      });
    } else if (patient.mrn === DEMO_PATIENTS.PATRICIA.mrn) {
      await prisma.ensocare_SocialAssessment.create({
        data: {
          case_id: ensocareCase.id,
          living_situation: 'Will live with family',
          residence_type: 'House',
          stairs_in_home: false,
          has_caregiver: true,
          caregiver_name: 'Susan Brown',
          caregiver_relationship: 'Daughter-in-law',
          has_transportation: true,
          sdoh_food_insecurity: false,
          sdoh_housing_instability: false,
          sdoh_transportation_needs: false,
          adl_bathing: 'Independent',
          adl_dressing: 'Independent',
          adl_toileting: 'Independent',
          cognitive_status: 'Intact',
          assessed_datetime: new Date(2025, 8, 6)
        }
      });
    } else if (!isDemoPatient) {
      await prisma.ensocare_SocialAssessment.create({
        data: {
          case_id: ensocareCase.id,
          living_situation: randomChoice(['Lives alone', 'Lives with spouse', 'Lives with family', 'Assisted living']),
          residence_type: randomChoice(['House', 'Apartment', 'Condo', 'Mobile home']),
          stairs_in_home: randomBoolean(0.4),
          has_caregiver: hasCaregiver,
          caregiver_name: hasCaregiver ? randomChoice(['Spouse', 'Daughter', 'Son', 'Sibling']) : null,
          caregiver_relationship: hasCaregiver ? randomChoice(['Spouse', 'Child', 'Sibling', 'Other']) : null,
          has_transportation: randomBoolean(0.75),
          sdoh_food_insecurity: randomBoolean(0.1),
          sdoh_housing_instability: randomBoolean(0.08),
          sdoh_transportation_needs: randomBoolean(0.15),
          adl_bathing: randomChoice(['Independent', 'Needs assistance', 'Dependent']),
          adl_dressing: randomChoice(['Independent', 'Needs assistance', 'Dependent']),
          adl_toileting: randomChoice(['Independent', 'Needs assistance', 'Dependent']),
          cognitive_status: randomChoice(['Intact', 'Mild impairment', 'Moderate impairment']),
          assessed_datetime: encounter.admit_datetime
        }
      });
    }
  }

  console.log('Created Ensocare cases and assessments');
}
