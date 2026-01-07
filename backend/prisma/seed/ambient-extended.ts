import { PrismaClient } from '@prisma/client';
import { randomInt, randomChoice, getMonthDate } from './utils';

const LOCATIONS = ['3rd Floor Hallway', 'Nursing Station', 'Conference Room', 'Patient Room', 'Elevator Bay', 'Cafeteria'];
const PHYSICIANS = ['Dr. Smith', 'Dr. Johnson', 'Dr. Williams', 'Dr. Brown', 'Dr. Jones', 'Dr. Garcia', 'Dr. Martinez'];
const NURSES = ['RN Sarah', 'RN Michael', 'RN Jennifer', 'RN David', 'RN Lisa', 'RN James', 'RN Emily', 'RN Robert'];
const APPROVAL_TYPES = ['Discharge Approval', 'Home Health Order', 'SNF Referral', 'PT Consult', 'Social Work Consult', 'Medication Change'];
const MEETING_TYPES = ['Discharge Planning', 'Goals of Care', 'Family Update', 'Care Conference', 'Palliative Consult'];
const SHIFT_TYPES = ['Day to Evening', 'Evening to Night', 'Night to Day'];

export async function seedAmbientExtended(prisma: PrismaClient) {
  const patients = await prisma.epic_Patient.findMany();
  
  // Ambient data grows over 9 months as adoption increases
  // Month 1-2: Minimal (pilot phase)
  // Month 3-4: Growing adoption
  // Month 5-6: Moderate usage
  // Month 7-9: Full adoption
  const ambientCountsByMonth = [12, 23, 47, 89, 156, 203, 287, 341, 412];
  
  const hallwayApprovals = [];
  const familyMeetings = [];
  const nursingHandoffs = [];
  const roundingNotes = [];
  const flowsheetContexts = [];

  for (let month = 1; month <= 9; month++) {
    const countThisMonth = ambientCountsByMonth[month - 1];
    
    console.log(`Seeding ambient data for month ${month}: ${countThisMonth} records per type`);

    for (let i = 0; i < countThisMonth; i++) {
      const patient = randomChoice(patients);
      const day = randomInt(1, 28);
      const captureDate = getMonthDate(month, day);

      // Hallway Approvals
      hallwayApprovals.push({
        patient_mrn: patient.mrn,
        location: randomChoice(LOCATIONS),
        approving_physician: randomChoice(PHYSICIANS),
        requesting_staff: randomChoice(NURSES),
        approval_type: randomChoice(APPROVAL_TYPES),
        approval_decision: randomChoice(['Approved', 'Approved with conditions', 'Needs review']),
        context_captured: JSON.stringify({
          patient_status: randomChoice(['Stable', 'Improving', 'Ready for discharge']),
          caregiver_mentioned: randomChoice([true, false]),
          barriers_noted: randomChoice([null, 'Transportation', 'Equipment needed', 'Family availability'])
        }),
        confidence_score: 0.85 + Math.random() * 0.14,
        captured_datetime: captureDate,
        data_month: month
      });

      // Family Meetings (fewer than hallway approvals)
      if (i % 3 === 0) {
        const attendeeCount = randomInt(2, 5);
        const attendees = ['Patient'];
        for (let a = 0; a < attendeeCount; a++) {
          attendees.push(randomChoice(['Spouse', 'Son', 'Daughter', 'Sibling', 'Social Worker', 'Case Manager', 'Physician']));
        }
        
        familyMeetings.push({
          patient_mrn: patient.mrn,
          meeting_type: randomChoice(MEETING_TYPES),
          attendees: JSON.stringify(attendees),
          duration_minutes: randomInt(15, 60),
          key_decisions: JSON.stringify([
            randomChoice(['Discharge to home agreed', 'SNF placement discussed', 'Home health ordered', 'Follow-up scheduled']),
            randomChoice(['Caregiver identified', 'Equipment needs reviewed', 'Medication teaching planned'])
          ]),
          family_concerns: JSON.stringify([
            randomChoice(['Medication management', 'Fall risk', 'Wound care', 'Diet compliance', 'Activity restrictions'])
          ]),
          patient_preferences: randomChoice(['Prefers home', 'Open to SNF', 'Wants family involvement', 'Independent as possible']),
          caregiver_commitments: JSON.stringify({
            primary_caregiver: randomChoice(['Spouse', 'Daughter', 'Son', 'Hired aide']),
            availability: randomChoice(['Full-time', 'Part-time', 'Weekends only', '24/7']),
            training_needed: randomChoice([true, false])
          }),
          sentiment_score: 0.6 + Math.random() * 0.35,
          action_items: JSON.stringify([
            'Schedule home health evaluation',
            'Order DME',
            'Arrange transportation'
          ]),
          meeting_datetime: captureDate,
          data_month: month
        });
      }

      // Nursing Handoffs (3 per day per patient on average)
      if (i % 2 === 0) {
        nursingHandoffs.push({
          patient_mrn: patient.mrn,
          outgoing_nurse: randomChoice(NURSES),
          incoming_nurse: randomChoice(NURSES),
          shift_type: randomChoice(SHIFT_TYPES),
          patient_status: randomChoice(['Stable', 'Improving', 'Declining', 'Ready for DC', 'Awaiting results']),
          key_concerns: JSON.stringify([
            randomChoice(['Pain management', 'Fall risk', 'Skin integrity', 'Fluid balance', 'Blood sugar control'])
          ]),
          pending_tasks: JSON.stringify([
            randomChoice(['Labs at 0600', 'PT eval', 'Case manager visit', 'Family meeting', 'Discharge teaching'])
          ]),
          family_updates: randomChoice([
            'Family visited, supportive',
            'Daughter called, concerned about discharge',
            'No family contact today',
            'Spouse at bedside, asking questions',
            'Son bringing equipment from home'
          ]),
          discharge_readiness: randomChoice(['Ready', 'Almost ready', 'Barriers present', 'Not ready', null]),
          context_flags: JSON.stringify({
            caregiver_present: randomChoice([true, false]),
            discharge_discussed: randomChoice([true, false]),
            social_concerns: randomChoice([true, false, false])
          }),
          handoff_datetime: captureDate,
          data_month: month
        });
      }

      // Rounding Notes (once per day)
      if (i % 4 === 0) {
        roundingNotes.push({
          patient_mrn: patient.mrn,
          rounding_team: JSON.stringify(['Attending', 'Resident', 'Intern', 'Pharmacist', 'Case Manager']),
          attending_physician: randomChoice(PHYSICIANS),
          discussion_summary: randomChoice([
            'Patient progressing well, discharge planning initiated',
            'Awaiting PT clearance for safe discharge',
            'Family meeting scheduled to discuss discharge options',
            'Social work consulted for placement assistance',
            'Home health referral in progress'
          ]),
          discharge_plan: randomChoice([
            'Home with home health',
            'SNF for rehab',
            'Home with family support',
            'Pending social work evaluation',
            null
          ]),
          barriers_identified: JSON.stringify([
            randomChoice(['None', 'Transportation', 'Caregiver availability', 'Equipment', 'Insurance authorization'])
          ]),
          social_factors_noted: JSON.stringify({
            lives_alone: randomChoice([true, false]),
            caregiver_available: randomChoice([true, false, true]),
            housing_stable: randomChoice([true, true, false]),
            transportation: randomChoice(['Has own', 'Family provides', 'Needs arrangement', 'Medical transport'])
          }),
          follow_up_actions: JSON.stringify([
            'Order home health eval',
            'Schedule family meeting',
            'Complete discharge teaching'
          ]),
          estimated_discharge: new Date(captureDate.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000),
          rounding_datetime: captureDate,
          data_month: month
        });
      }

      // Flowsheet Context (multiple per day)
      flowsheetContexts.push({
        patient_mrn: patient.mrn,
        documenting_nurse: randomChoice(NURSES),
        flowsheet_category: randomChoice(['ADL Assessment', 'Pain Assessment', 'Fall Risk', 'Skin Assessment', 'Mobility', 'Education']),
        entry_type: randomChoice(['Assessment', 'Intervention', 'Education', 'Communication']),
        clinical_value: randomChoice(['2/10', '4/10', 'Independent', 'Requires assist', 'High risk', 'Low risk']),
        contextual_note: randomChoice([
          'Patient expressed concern about going home alone',
          'Daughter present, asking about discharge plan',
          'Patient ambulating well with walker',
          'Family brought in home equipment for training',
          'Patient demonstrated medication self-administration',
          'Caregiver completed wound care teaching',
          'Patient anxious about discharge, reassured',
          'Social worker visited, discussed options'
        ]),
        patient_response: randomChoice([
          'Receptive to teaching',
          'Anxious but cooperative',
          'Eager to go home',
          'Concerned about burden on family',
          'Confident in self-care abilities',
          null
        ]),
        family_involvement: randomChoice([
          'Spouse at bedside',
          'Daughter participated in teaching',
          'Son called for update',
          'No family present',
          'Multiple family members involved',
          null
        ]),
        discharge_relevance: randomChoice([true, true, false]),
        entry_datetime: captureDate,
        data_month: month
      });
    }
  }

  // Batch insert all records
  console.log('Inserting hallway approvals...');
  await prisma.ambient_Hallway_Approval.createMany({ data: hallwayApprovals });
  
  console.log('Inserting family meetings...');
  await prisma.ambient_Family_Meeting.createMany({ data: familyMeetings });
  
  console.log('Inserting nursing handoffs...');
  await prisma.ambient_Nursing_Handoff.createMany({ data: nursingHandoffs });
  
  console.log('Inserting rounding notes...');
  await prisma.ambient_Rounding_Notes.createMany({ data: roundingNotes });
  
  console.log('Inserting flowsheet contexts...');
  await prisma.eHR_Flowsheet_Context.createMany({ data: flowsheetContexts });

  console.log(`Created ambient extended data:
    - ${hallwayApprovals.length} hallway approvals
    - ${familyMeetings.length} family meetings
    - ${nursingHandoffs.length} nursing handoffs
    - ${roundingNotes.length} rounding notes
    - ${flowsheetContexts.length} flowsheet contexts
  `);
}
