import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  try {
    const patients = await prisma.epic_Patient.findMany({
      include: {
        encounters: {
          orderBy: { admit_datetime: 'desc' },
          take: 1,
          include: {
            diagnoses: { where: { diagnosis_type: 'principal' }, take: 1 }
          }
        }
      }
    });

    const worklist = patients.map(patient => {
      const latestEncounter = patient.encounters[0];
      const principalDiagnosis = latestEncounter?.diagnoses[0];

      return {
        mrn: patient.mrn,
        name: `${patient.first_name} ${patient.last_name}`,
        age: calculateAge(patient.date_of_birth),
        gender: patient.gender,
        insurance_type: patient.insurance_type,
        encounter_id: latestEncounter?.id,
        encounter_number: latestEncounter?.encounter_number,
        admit_date: latestEncounter?.admit_datetime,
        los_days: latestEncounter?.los_days,
        principal_diagnosis: principalDiagnosis?.description,
        diagnosis_category: principalDiagnosis?.category,
        unit: latestEncounter?.unit,
        discharge_disposition: latestEncounter?.discharge_disposition
      };
    });

    res.json(worklist);
  } catch (error) {
    console.error('Error getting patients:', error);
    res.status(500).json({ error: 'Failed to get patients' });
  }
});

router.get('/:mrn', async (req, res) => {
  try {
    const { mrn } = req.params;

    const patient = await prisma.epic_Patient.findUnique({
      where: { mrn },
      include: {
        encounters: {
          orderBy: { admit_datetime: 'desc' },
          include: {
            diagnoses: true,
            vitals: { orderBy: { recorded_datetime: 'desc' }, take: 5 },
            labs: { orderBy: { collected_datetime: 'desc' }, take: 10 },
            medications: true
          }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const ensocareCase = await prisma.ensocare_Case.findFirst({
      where: { patient_mrn: mrn },
      include: { social_assessment: true, referrals: true }
    });

    const ambientTranscripts = await prisma.ambient_Voice_Transcript.findMany({
      where: { patient_mrn: mrn },
      orderBy: { start_datetime: 'desc' }
    });

    const decisions = await prisma.dCG_DecisionTrace.findMany({
      where: { patient_mrn: mrn },
      include: { clinical_snapshot: true, social_snapshot: true, outcome: true },
      orderBy: { decision_datetime: 'desc' }
    });

    res.json({
      patient: { ...patient, age: calculateAge(patient.date_of_birth) },
      ensocare_case: ensocareCase,
      ambient_transcripts: ambientTranscripts.map(t => ({
        ...t,
        extracted_context: JSON.parse(t.extracted_context || '{}'),
        participants: JSON.parse(t.participants || '[]')
      })),
      decisions
    });
  } catch (error) {
    console.error('Error getting patient:', error);
    res.status(500).json({ error: 'Failed to get patient' });
  }
});

router.get('/:mrn/context', async (req, res) => {
  try {
    const { mrn } = req.params;

    const patient = await prisma.epic_Patient.findUnique({
      where: { mrn },
      include: {
        encounters: {
          orderBy: { admit_datetime: 'desc' },
          take: 1,
          include: {
            diagnoses: true,
            vitals: { orderBy: { recorded_datetime: 'desc' }, take: 1 },
            labs: { orderBy: { collected_datetime: 'desc' } },
            medications: true
          }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const ensocareCase = await prisma.ensocare_Case.findFirst({
      where: { patient_mrn: mrn },
      include: { social_assessment: true }
    });

    const ambientTranscripts = await prisma.ambient_Voice_Transcript.findMany({
      where: { patient_mrn: mrn },
      orderBy: { start_datetime: 'desc' }
    });

    const latestEncounter = patient.encounters[0];
    const principalDiagnosis = latestEncounter?.diagnoses.find(d => d.diagnosis_type === 'principal');
    const latestVitals = latestEncounter?.vitals[0];
    const socialAssessment = ensocareCase?.social_assessment;

    let caregiverContext = null;
    for (const transcript of ambientTranscripts) {
      const extracted = JSON.parse(transcript.extracted_context || '{}');
      if (extracted.caregiver) {
        caregiverContext = {
          ...extracted.caregiver,
          source: 'ambient_capture',
          transcript_id: transcript.id,
          call_type: transcript.call_type,
          captured_at: transcript.start_datetime
        };
        break;
      }
    }

    res.json({
      clinical_context: {
        age: calculateAge(patient.date_of_birth),
        gender: patient.gender,
        principal_diagnosis: principalDiagnosis?.description,
        diagnosis_code: principalDiagnosis?.icd10_code,
        diagnosis_category: principalDiagnosis?.category,
        secondary_diagnoses: latestEncounter?.diagnoses
          .filter(d => d.diagnosis_type === 'secondary')
          .map(d => d.description),
        vitals: latestVitals ? {
          bp: `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}`,
          heart_rate: latestVitals.heart_rate,
          oxygen_saturation: latestVitals.oxygen_saturation,
          weight_kg: latestVitals.weight_kg
        } : null,
        labs: latestEncounter?.labs.map(l => ({
          name: l.lab_name,
          value: l.result_value,
          abnormal: l.abnormal_flag
        })),
        medications: latestEncounter?.medications.map(m => ({
          name: m.medication_name,
          high_risk: m.high_risk
        })),
        los_days: latestEncounter?.los_days
      },
      social_context: {
        source: 'ensocare',
        living_situation: socialAssessment?.living_situation,
        has_caregiver: socialAssessment?.has_caregiver,
        caregiver_name: socialAssessment?.caregiver_name,
        caregiver_relationship: socialAssessment?.caregiver_relationship,
        has_transportation: socialAssessment?.has_transportation,
        stairs_in_home: socialAssessment?.stairs_in_home,
        sdoh_flags: {
          food_insecurity: socialAssessment?.sdoh_food_insecurity,
          housing_instability: socialAssessment?.sdoh_housing_instability,
          transportation_needs: socialAssessment?.sdoh_transportation_needs
        }
      },
      caregiver_context: caregiverContext,
      ambient_transcripts: ambientTranscripts.map(t => ({
        id: t.id,
        call_type: t.call_type,
        start_datetime: t.start_datetime,
        duration_seconds: t.duration_seconds,
        extracted_context: JSON.parse(t.extracted_context || '{}')
      }))
    });
  } catch (error) {
    console.error('Error getting patient context:', error);
    res.status(500).json({ error: 'Failed to get patient context' });
  }
});

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default router;
