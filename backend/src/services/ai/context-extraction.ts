import { PrismaClient } from '@prisma/client';
import { callAI } from './client';

const prisma = new PrismaClient();

export async function extractContext(patientMrn: string, transcriptId: string) {
  const transcript = await prisma.ambient_Voice_Transcript.findUnique({
    where: { id: transcriptId }
  });

  if (!transcript) {
    throw new Error('Transcript not found');
  }

  const prompt = `Extract caregiver and social context from this discharge planning conversation transcript.

Transcript:
${transcript.transcript_text}

Extract and return JSON with:
{
  "caregiver": {
    "name": "string or null",
    "relationship": "string",
    "age": "number or null",
    "healthStatus": "string",
    "employment": "string",
    "hasMedicalBackground": boolean,
    "medicalBackgroundDetail": "string or null",
    "proximityMinutes": number,
    "availability": "string",
    "statedCommitment": "string",
    "conditionFamiliarity": "string"
  },
  "patient": {
    "statedPreference": "string",
    "concerns": ["array of concerns"],
    "fears": ["array of fears"]
  },
  "barriers": ["array of barriers mentioned"],
  "positiveFactors": ["array of positive factors"],
  "confidence": number (0-1)
}`;

  try {
    const response = await callAI(prompt);
    const extracted = JSON.parse(response);

    // Update transcript with extracted context
    await prisma.ambient_Voice_Transcript.update({
      where: { id: transcriptId },
      data: {
        extracted_context: JSON.stringify(extracted),
        confidence_score: extracted.confidence || 0.85
      }
    });

    return {
      patientMrn,
      transcriptId,
      extractedContext: extracted,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Context extraction error:', error);
    throw error;
  }
}
