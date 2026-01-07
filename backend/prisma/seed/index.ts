import { PrismaClient } from '@prisma/client';
import { seedPatients } from './patients';
import { seedEncounters } from './encounters';
import { seedAmbientTranscripts } from './ambient';
import { seedAmbientExtended } from './ambient-extended';
import { seedEnsocareData } from './ensocare';
import { seedBulkDecisions } from './bulk-data';
import { seedMetrics } from './metrics';
import { seedDemoPatients } from './demo-patients';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed for large hospital (27K decisions over 9 months)...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.demo_Change.deleteMany();
  await prisma.dCG_ContextMatch.deleteMany();
  await prisma.dCG_ContextPattern.deleteMany();
  await prisma.dCG_Outcome.deleteMany();
  await prisma.dCG_DecisionTrace.deleteMany();
  await prisma.dCG_SocialSnapshot.deleteMany();
  await prisma.dCG_ClinicalSnapshot.deleteMany();
  await prisma.dCG_MonthlyMetrics.deleteMany();
  await prisma.ambient_Voice_Transcript.deleteMany();
  await prisma.teams_Message.deleteMany();
  // Clear new ambient extended tables
  await prisma.ambient_Hallway_Approval.deleteMany();
  await prisma.ambient_Family_Meeting.deleteMany();
  await prisma.ambient_Nursing_Handoff.deleteMany();
  await prisma.ambient_Rounding_Notes.deleteMany();
  await prisma.eHR_Flowsheet_Context.deleteMany();
  await prisma.ensocare_SocialAssessment.deleteMany();
  await prisma.ensocare_Referral.deleteMany();
  await prisma.ensocare_Case.deleteMany();
  await prisma.epic_Willow_Medication.deleteMany();
  await prisma.epic_Labs.deleteMany();
  await prisma.epic_Vitals.deleteMany();
  await prisma.epic_Diagnosis.deleteMany();
  await prisma.epic_Encounter.deleteMany();
  await prisma.epic_Patient.deleteMany();
  await prisma.epic_Provider.deleteMany();
  await prisma.demo_State.deleteMany();

  // Initialize demo state
  await prisma.demo_State.create({
    data: { id: 'singleton', current_month: 1 }
  });

  // Seed demo patients first (Maria, Robert, Patricia)
  console.log('Seeding demo patients...');
  await seedDemoPatients(prisma);

  // Seed bulk patients
  console.log('Seeding bulk patients...');
  await seedPatients(prisma);

  // Seed encounters
  console.log('Seeding encounters...');
  await seedEncounters(prisma);

  // Seed Ensocare data
  console.log('Seeding Ensocare data...');
  await seedEnsocareData(prisma);

  // Seed ambient transcripts
  console.log('Seeding ambient transcripts...');
  await seedAmbientTranscripts(prisma);

  // Seed extended ambient data (hallway approvals, family meetings, nursing handoffs, rounding notes, flowsheet context)
  console.log('Seeding extended ambient data...');
  await seedAmbientExtended(prisma);

  // Seed bulk decisions (27K across 9 months)
  console.log('Seeding bulk decisions (18K)...');
  await seedBulkDecisions(prisma);

  // Seed monthly metrics
  console.log('Seeding monthly metrics...');
  await seedMetrics(prisma);

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
