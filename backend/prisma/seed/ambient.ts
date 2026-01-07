import { PrismaClient } from '@prisma/client';
import { DEMO_PATIENTS } from './constants';

export async function seedAmbientTranscripts(prisma: PrismaClient) {
  // Maria's transcript - rich caregiver context
  await prisma.ambient_Voice_Transcript.create({
    data: {
      patient_mrn: DEMO_PATIENTS.MARIA.mrn,
      call_type: 'family_meeting',
      participants: JSON.stringify(['Dr. Chen', 'Maria Garcia', 'Carmen Garcia (daughter)']),
      start_datetime: new Date(2025, 6, 14, 14, 30),
      duration_seconds: 1847,
      transcript_text: `Dr. Chen: Good afternoon, Mrs. Garcia. I wanted to discuss your discharge plan with you and your daughter.

Maria: Thank you, doctor. Carmen has been here every day.

Carmen: Hi Dr. Chen. I've been taking notes on everything. I used to work as an LPN for 15 years before I retired, so I'm comfortable with medical care.

Dr. Chen: That's wonderful to hear, Carmen. Your mother will need help managing her heart failure medications and monitoring her weight daily.

Carmen: I already bought a scale and set up a medication organizer. I live just 5 minutes away and I'm retired now, so I can be here full-time. Mom, I was thinking you could stay with me for the first few weeks.

Maria: I'd like that. I'm a little nervous about going home alone.

Carmen: You won't be alone, Mom. I've already talked to my husband and we've set up the guest room on the first floor so you don't have to climb stairs.

Dr. Chen: It sounds like you have a solid plan. Carmen, are you familiar with the signs of fluid overload?

Carmen: Yes - weight gain of more than 2-3 pounds in a day, increased shortness of breath, swelling in the legs. I know to call if any of those happen.

Maria: She's been reading all the pamphlets you gave us.

Carmen: I want to make sure Mom stays healthy. We lost Dad to heart problems and I don't want to lose her too.`,
      extracted_context: JSON.stringify({
        caregiver: {
          name: 'Carmen Garcia',
          relationship: 'daughter',
          age: 58,
          healthStatus: 'healthy',
          employment: 'retired',
          hasMedicalBackground: true,
          medicalBackgroundDetail: 'Former LPN with 15 years experience',
          proximityMinutes: 5,
          availability: 'full-time',
          statedCommitment: 'Will provide full-time care, has prepared home',
          conditionFamiliarity: 'High - understands heart failure warning signs'
        },
        patient: {
          statedPreference: 'Wants to go home but nervous about being alone',
          concerns: ['Being alone', 'Managing medications'],
          fears: ['Health complications']
        },
        barriers: [],
        positiveFactors: [
          'Caregiver has medical background',
          'Caregiver lives 5 minutes away',
          'Full-time availability',
          'Home modifications made (first floor room)',
          'Equipment purchased (scale, medication organizer)',
          'Caregiver understands warning signs'
        ],
        confidence: 0.95
      }),
      confidence_score: 0.95
    }
  });

  // Robert's transcript - minimal context
  await prisma.ambient_Voice_Transcript.create({
    data: {
      patient_mrn: DEMO_PATIENTS.ROBERT.mrn,
      call_type: 'discharge_planning',
      participants: JSON.stringify(['Case Manager', 'Robert Wilson']),
      start_datetime: new Date(2025, 6, 11, 10, 15),
      duration_seconds: 312,
      transcript_text: `Case Manager: Mr. Wilson, we need to discuss your discharge plan for tomorrow.

Robert: Okay. I'm ready to go home.

Case Manager: Do you have someone who can help you at home?

Robert: My son lives about 45 minutes away. He works full-time but said he can check on me on weekends.

Case Manager: What about during the week?

Robert: I'll be fine. I've managed on my own before.

Case Manager: You'll need to weigh yourself daily and take your medications on schedule.

Robert: I can do that.

Case Manager: Do you have a scale at home?

Robert: I think so. Somewhere.

Case Manager: Alright, we'll arrange for home health to visit twice a week.`,
      extracted_context: JSON.stringify({
        caregiver: {
          name: 'Son (unnamed)',
          relationship: 'son',
          age: null,
          healthStatus: 'unknown',
          employment: 'full-time employed',
          hasMedicalBackground: false,
          proximityMinutes: 45,
          availability: 'weekends only',
          statedCommitment: 'Will check on weekends',
          conditionFamiliarity: 'Unknown'
        },
        patient: {
          statedPreference: 'Wants to go home, confident in self-management',
          concerns: [],
          fears: []
        },
        barriers: [
          'Limited caregiver availability',
          'Caregiver lives far away',
          'Uncertain about equipment at home',
          'Patient may be overconfident'
        ],
        positiveFactors: [
          'Home health arranged'
        ],
        confidence: 0.75
      }),
      confidence_score: 0.75
    }
  });

  // Patricia's transcript - similar to Maria
  await prisma.ambient_Voice_Transcript.create({
    data: {
      patient_mrn: DEMO_PATIENTS.PATRICIA.mrn,
      call_type: 'family_meeting',
      participants: JSON.stringify(['Dr. Patel', 'Patricia Brown', 'Susan Brown (daughter-in-law)']),
      start_datetime: new Date(2025, 8, 9, 15, 0),
      duration_seconds: 1523,
      transcript_text: `Dr. Patel: Mrs. Brown, let's talk about your discharge plan. I see your daughter-in-law Susan is here.

Susan: Yes, I'll be Patricia's primary caregiver. I'm a registered nurse at County General, so I'm very familiar with heart failure management.

Patricia: Susan has been wonderful. She's already been teaching me about my condition.

Susan: I've set up a care station at our house - we live about 8 minutes from here. I work three 12-hour shifts, but my husband works from home on my work days, and my mother-in-law will never be alone.

Dr. Patel: That's excellent planning. Patricia, how do you feel about this arrangement?

Patricia: I'm grateful. After my husband passed, I was worried about managing alone. Susan and Tom have been so supportive.

Susan: We've already installed grab bars in the bathroom and got a hospital bed for the first floor. I've also set up a medication management system and will be doing daily weights.

Dr. Patel: It sounds like you have everything covered. Susan, you know the warning signs to watch for?

Susan: Absolutely - I deal with CHF patients regularly. Weight gain, edema, dyspnea, decreased urine output. I have your office number and know when to call versus when to go to the ED.`,
      extracted_context: JSON.stringify({
        caregiver: {
          name: 'Susan Brown',
          relationship: 'daughter-in-law',
          age: 45,
          healthStatus: 'healthy',
          employment: 'RN - works 3x12 shifts',
          hasMedicalBackground: true,
          medicalBackgroundDetail: 'Registered Nurse with CHF experience',
          proximityMinutes: 8,
          availability: 'full-time (with backup)',
          statedCommitment: 'Primary caregiver with backup plan',
          conditionFamiliarity: 'Expert - works with CHF patients'
        },
        patient: {
          statedPreference: 'Grateful for family support, was worried about being alone',
          concerns: ['Managing alone after husband passed'],
          fears: ['Being alone']
        },
        barriers: [],
        positiveFactors: [
          'Caregiver is an RN with CHF experience',
          'Lives 8 minutes away',
          'Backup caregiver available',
          'Home modifications complete',
          'Equipment set up',
          'Expert knowledge of warning signs'
        ],
        confidence: 0.97
      }),
      confidence_score: 0.97
    }
  });

  console.log('Created ambient transcripts for demo patients');
}
