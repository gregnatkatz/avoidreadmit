import { PrismaClient } from '@prisma/client';
import { generateMRN, generateName, randomInt, randomChoice, randomBoolean } from './utils';
import { INSURANCE_TYPES } from './constants';

export async function seedPatients(prisma: PrismaClient) {
  const patients = [];
  
  // Generate 600 patients for the large hospital
  for (let i = 1; i <= 600; i++) {
    const { firstName, lastName } = generateName();
    const birthYear = randomInt(1940, 1980);
    const birthMonth = randomInt(1, 12);
    const birthDay = randomInt(1, 28);
    
    patients.push({
      mrn: generateMRN(i),
      first_name: firstName,
      last_name: lastName,
      date_of_birth: new Date(birthYear, birthMonth - 1, birthDay),
      gender: randomBoolean(0.48) ? 'Male' : 'Female',
      language: randomBoolean(0.85) ? 'English' : randomChoice(['Spanish', 'Vietnamese', 'Chinese', 'Korean']),
      address_street: `${randomInt(100, 9999)} ${randomChoice(['Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm'])} ${randomChoice(['St', 'Ave', 'Blvd', 'Dr'])}`,
      address_city: randomChoice(['Springfield', 'Riverside', 'Fairview', 'Madison', 'Georgetown']),
      address_state: 'CA',
      address_zip: `9${randomInt(1000, 9999)}`,
      phone_home: `555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
      phone_mobile: `555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
      insurance_type: randomChoice(INSURANCE_TYPES)
    });
  }

  await prisma.epic_Patient.createMany({ data: patients });
  console.log(`Created ${patients.length} patients`);
}
