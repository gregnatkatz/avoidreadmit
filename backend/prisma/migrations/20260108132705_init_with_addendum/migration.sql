-- CreateTable
CREATE TABLE "Epic_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mrn" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATETIME NOT NULL,
    "gender" TEXT NOT NULL,
    "language" TEXT,
    "address_street" TEXT,
    "address_city" TEXT,
    "address_state" TEXT,
    "address_zip" TEXT,
    "phone_home" TEXT,
    "phone_mobile" TEXT,
    "insurance_type" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Epic_Encounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_number" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "encounter_type" TEXT NOT NULL,
    "admit_datetime" DATETIME NOT NULL,
    "discharge_datetime" DATETIME,
    "discharge_disposition" TEXT,
    "hospital_service" TEXT,
    "unit" TEXT,
    "attending_provider_id" TEXT,
    "los_days" INTEGER,
    "readmission_flag" BOOLEAN NOT NULL DEFAULT false,
    "readmission_days" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Epic_Encounter_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Epic_Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Epic_Diagnosis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT NOT NULL,
    "icd10_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "diagnosis_type" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "category" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Epic_Diagnosis_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Epic_Encounter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Epic_Vitals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT NOT NULL,
    "recorded_datetime" DATETIME NOT NULL,
    "temperature" REAL,
    "heart_rate" INTEGER,
    "bp_systolic" INTEGER,
    "bp_diastolic" INTEGER,
    "oxygen_saturation" INTEGER,
    "weight_kg" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Epic_Vitals_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Epic_Encounter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Epic_Labs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT NOT NULL,
    "collected_datetime" DATETIME NOT NULL,
    "lab_name" TEXT NOT NULL,
    "lab_code" TEXT NOT NULL,
    "result_value" TEXT NOT NULL,
    "result_numeric" REAL,
    "unit" TEXT,
    "abnormal_flag" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Epic_Labs_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Epic_Encounter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Epic_Willow_Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT NOT NULL,
    "medication_name" TEXT NOT NULL,
    "generic_name" TEXT,
    "dose" TEXT,
    "route" TEXT,
    "frequency" TEXT,
    "order_status" TEXT NOT NULL,
    "med_class" TEXT,
    "high_risk" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Epic_Willow_Medication_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Epic_Encounter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Epic_Provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "npi" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "credentials" TEXT,
    "provider_type" TEXT NOT NULL,
    "specialty" TEXT,
    "department" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Ensocare_Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "case_number" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "patient_mrn" TEXT NOT NULL,
    "assigned_cm_id" TEXT,
    "case_status" TEXT NOT NULL,
    "priority" TEXT,
    "target_discharge_date" DATETIME,
    "barriers" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Ensocare_Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "case_id" TEXT NOT NULL,
    "referral_type" TEXT NOT NULL,
    "facility_name" TEXT,
    "status" TEXT NOT NULL,
    "sent_datetime" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ensocare_Referral_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Ensocare_Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ensocare_SocialAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "case_id" TEXT NOT NULL,
    "living_situation" TEXT NOT NULL,
    "residence_type" TEXT,
    "stairs_in_home" BOOLEAN,
    "has_caregiver" BOOLEAN NOT NULL,
    "caregiver_name" TEXT,
    "caregiver_relationship" TEXT,
    "has_transportation" BOOLEAN,
    "sdoh_food_insecurity" BOOLEAN NOT NULL DEFAULT false,
    "sdoh_housing_instability" BOOLEAN NOT NULL DEFAULT false,
    "sdoh_transportation_needs" BOOLEAN NOT NULL DEFAULT false,
    "adl_bathing" TEXT,
    "adl_dressing" TEXT,
    "adl_toileting" TEXT,
    "cognitive_status" TEXT,
    "assessed_datetime" DATETIME NOT NULL,
    CONSTRAINT "Ensocare_SocialAssessment_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Ensocare_Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ambient_Voice_Transcript" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT,
    "patient_mrn" TEXT,
    "call_type" TEXT NOT NULL,
    "participants" TEXT NOT NULL,
    "start_datetime" DATETIME NOT NULL,
    "duration_seconds" INTEGER,
    "transcript_text" TEXT NOT NULL,
    "extracted_context" TEXT NOT NULL,
    "confidence_score" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Teams_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel_name" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "message_text" TEXT NOT NULL,
    "sent_datetime" DATETIME NOT NULL,
    "mentioned_mrns" TEXT,
    "is_decision_related" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Ambient_Hallway_Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT,
    "patient_mrn" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "approving_physician" TEXT NOT NULL,
    "requesting_staff" TEXT NOT NULL,
    "approval_type" TEXT NOT NULL,
    "approval_decision" TEXT NOT NULL,
    "context_captured" TEXT NOT NULL,
    "confidence_score" REAL,
    "captured_datetime" DATETIME NOT NULL,
    "data_month" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Ambient_Family_Meeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT,
    "patient_mrn" TEXT NOT NULL,
    "meeting_type" TEXT NOT NULL,
    "attendees" TEXT NOT NULL,
    "duration_minutes" INTEGER,
    "key_decisions" TEXT NOT NULL,
    "family_concerns" TEXT NOT NULL,
    "patient_preferences" TEXT NOT NULL,
    "caregiver_commitments" TEXT NOT NULL,
    "sentiment_score" REAL,
    "action_items" TEXT NOT NULL,
    "meeting_datetime" DATETIME NOT NULL,
    "data_month" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Ambient_Nursing_Handoff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT,
    "patient_mrn" TEXT NOT NULL,
    "outgoing_nurse" TEXT NOT NULL,
    "incoming_nurse" TEXT NOT NULL,
    "shift_type" TEXT NOT NULL,
    "patient_status" TEXT NOT NULL,
    "key_concerns" TEXT NOT NULL,
    "pending_tasks" TEXT NOT NULL,
    "family_updates" TEXT NOT NULL,
    "discharge_readiness" TEXT,
    "context_flags" TEXT NOT NULL,
    "handoff_datetime" DATETIME NOT NULL,
    "data_month" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Ambient_Rounding_Notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT,
    "patient_mrn" TEXT NOT NULL,
    "rounding_team" TEXT NOT NULL,
    "attending_physician" TEXT NOT NULL,
    "discussion_summary" TEXT NOT NULL,
    "discharge_plan" TEXT,
    "barriers_identified" TEXT NOT NULL,
    "social_factors_noted" TEXT NOT NULL,
    "follow_up_actions" TEXT NOT NULL,
    "estimated_discharge" DATETIME,
    "rounding_datetime" DATETIME NOT NULL,
    "data_month" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EHR_Flowsheet_Context" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT,
    "patient_mrn" TEXT NOT NULL,
    "documenting_nurse" TEXT NOT NULL,
    "flowsheet_category" TEXT NOT NULL,
    "entry_type" TEXT NOT NULL,
    "clinical_value" TEXT,
    "contextual_note" TEXT NOT NULL,
    "patient_response" TEXT,
    "family_involvement" TEXT,
    "discharge_relevance" BOOLEAN NOT NULL DEFAULT false,
    "entry_datetime" DATETIME NOT NULL,
    "data_month" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DCG_ClinicalSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "principal_diagnosis_code" TEXT NOT NULL,
    "principal_diagnosis_desc" TEXT NOT NULL,
    "principal_diagnosis_category" TEXT NOT NULL,
    "secondary_diagnoses" TEXT NOT NULL,
    "vitals_at_decision" TEXT NOT NULL,
    "labs_at_decision" TEXT NOT NULL,
    "medication_count" INTEGER NOT NULL,
    "high_risk_med_count" INTEGER NOT NULL,
    "adl_score" INTEGER,
    "mobility_status" TEXT,
    "los_at_decision" INTEGER NOT NULL,
    "readmit_count_12m" INTEGER NOT NULL DEFAULT 0,
    "snapshot_datetime" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DCG_SocialSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "living_situation" TEXT NOT NULL,
    "residence_type" TEXT,
    "has_stairs" BOOLEAN,
    "insurance_type" TEXT NOT NULL,
    "has_caregiver" BOOLEAN NOT NULL,
    "caregiver_relationship" TEXT,
    "sdoh_flags" TEXT NOT NULL,
    "caregiver_name" TEXT,
    "caregiver_age" INTEGER,
    "caregiver_health_status" TEXT,
    "caregiver_employment" TEXT,
    "caregiver_medical_background" BOOLEAN NOT NULL DEFAULT false,
    "caregiver_background_detail" TEXT,
    "caregiver_proximity_minutes" INTEGER,
    "caregiver_availability" TEXT,
    "caregiver_stated_commitment" TEXT,
    "caregiver_condition_familiarity" TEXT,
    "patient_stated_preference" TEXT,
    "patient_concerns" TEXT NOT NULL,
    "patient_fears" TEXT NOT NULL,
    "barriers_from_conversations" TEXT NOT NULL,
    "positive_factors" TEXT NOT NULL,
    "ambient_transcript_ids" TEXT NOT NULL,
    "snapshot_datetime" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DCG_DecisionTrace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trace_number" TEXT NOT NULL,
    "patient_mrn" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "decision_type" TEXT NOT NULL,
    "decision_value" TEXT NOT NULL,
    "decision_datetime" DATETIME NOT NULL,
    "decision_maker_id" TEXT NOT NULL,
    "decision_maker_name" TEXT NOT NULL,
    "clinical_snapshot_id" TEXT NOT NULL,
    "social_snapshot_id" TEXT NOT NULL,
    "policy_id" TEXT,
    "policy_recommendation" TEXT,
    "followed_policy" BOOLEAN NOT NULL,
    "exception_type" TEXT,
    "rationale" TEXT,
    "evidence_cited" TEXT,
    "concerns" TEXT,
    "mitigations" TEXT,
    "cited_precedent_ids" TEXT NOT NULL,
    "data_month" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "policyVersionId" TEXT,
    "contextSnapshot" TEXT,
    "criteriaSnapshot" TEXT,
    "aiRecommendation" TEXT,
    "aiConfidence" REAL,
    "aiReasoning" TEXT,
    "riskScore" REAL,
    CONSTRAINT "DCG_DecisionTrace_clinical_snapshot_id_fkey" FOREIGN KEY ("clinical_snapshot_id") REFERENCES "DCG_ClinicalSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DCG_DecisionTrace_social_snapshot_id_fkey" FOREIGN KEY ("social_snapshot_id") REFERENCES "DCG_SocialSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DCG_DecisionTrace_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "PolicyVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DCG_Outcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trace_id" TEXT NOT NULL,
    "readmission_30d" BOOLEAN NOT NULL DEFAULT false,
    "readmission_date" DATETIME,
    "readmission_reason" TEXT,
    "ed_visit_30d" BOOLEAN NOT NULL DEFAULT false,
    "death_30d" BOOLEAN NOT NULL DEFAULT false,
    "outcome_success" BOOLEAN NOT NULL,
    "root_cause_category" TEXT,
    "root_cause_detail" TEXT,
    "context_factors" TEXT,
    "assessed_at" DATETIME,
    "data_month" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DCG_Outcome_trace_id_fkey" FOREIGN KEY ("trace_id") REFERENCES "DCG_DecisionTrace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DCG_ContextMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "searching_trace_id" TEXT NOT NULL,
    "matched_trace_id" TEXT NOT NULL,
    "context_match_score" REAL NOT NULL,
    "context_factors_matched" TEXT NOT NULL,
    "was_cited" BOOLEAN NOT NULL DEFAULT false,
    "user_notes" TEXT,
    "outcomes_aligned" BOOLEAN,
    "data_month" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DCG_ContextMatch_searching_trace_id_fkey" FOREIGN KEY ("searching_trace_id") REFERENCES "DCG_DecisionTrace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DCG_ContextMatch_matched_trace_id_fkey" FOREIGN KEY ("matched_trace_id") REFERENCES "DCG_DecisionTrace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DCG_ContextPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context_criteria" TEXT NOT NULL,
    "supporting_trace_ids" TEXT NOT NULL,
    "sample_size" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL,
    "success_rate" REAL NOT NULL,
    "baseline_rate" REAL,
    "lift_vs_baseline" REAL,
    "p_value" REAL,
    "statistically_significant" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "data_month" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicabilityRules" TEXT,
    "retrievalStrategy" TEXT,
    "contraindications" TEXT,
    "minimumConfidence" REAL NOT NULL DEFAULT 0.7,
    "discoveryMethod" TEXT,
    "evidenceStrength" TEXT NOT NULL DEFAULT 'moderate',
    "lastValidated" DATETIME,
    "validationResults" TEXT
);

-- CreateTable
CREATE TABLE "DCG_MonthlyMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month_number" INTEGER NOT NULL,
    "month_label" TEXT NOT NULL,
    "total_decisions" INTEGER NOT NULL,
    "decisions_with_context_match" INTEGER NOT NULL,
    "total_with_outcomes" INTEGER NOT NULL,
    "successes" INTEGER NOT NULL,
    "readmissions" INTEGER NOT NULL,
    "readmission_rate" REAL NOT NULL,
    "success_rate" REAL NOT NULL,
    "with_rich_context_success_rate" REAL NOT NULL,
    "without_rich_context_success_rate" REAL NOT NULL,
    "context_lift" REAL NOT NULL,
    "policy_followed_count" INTEGER NOT NULL,
    "policy_followed_success" REAL NOT NULL,
    "exception_taken_count" INTEGER NOT NULL,
    "exception_taken_success" REAL NOT NULL,
    "active_patterns" INTEGER NOT NULL,
    "new_patterns" INTEGER NOT NULL,
    "cost_per_readmission" REAL NOT NULL DEFAULT 15200,
    "readmissions_avoided" INTEGER NOT NULL,
    "savings_this_month" REAL NOT NULL,
    "cumulative_savings" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "Demo_State" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "current_month" INTEGER NOT NULL DEFAULT 1,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Demo_Change" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "month_added" INTEGER NOT NULL,
    "summary" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PolicyVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "retiredDate" DATETIME,
    "criteria" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PatternSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patternId" TEXT NOT NULL,
    "snapshotDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successRate" REAL NOT NULL,
    "lift" REAL NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "conditions" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatternSnapshot_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "DCG_ContextPattern" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionPatternSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "matchScore" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DecisionPatternSnapshot_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DCG_DecisionTrace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DecisionPatternSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PatternSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AmbientContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientMrn" TEXT NOT NULL,
    "encounterId" TEXT,
    "source" TEXT NOT NULL,
    "rawTranscript" TEXT,
    "extractedData" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedBy" TEXT,
    "sessionDuration" INTEGER,
    "location" TEXT,
    "transcriptionConfidence" REAL,
    "extractionConfidence" REAL,
    "sourceReliability" REAL NOT NULL,
    "overallConfidence" REAL NOT NULL,
    "supersedes" TEXT,
    "supersededBy" TEXT,
    "conflictFlag" BOOLEAN NOT NULL DEFAULT false,
    "resolutionNote" TEXT,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "data_month" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PatternPerformance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patternId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "totalApplications" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "readmitCount" INTEGER NOT NULL,
    "pendingCount" INTEGER NOT NULL,
    "successRate" REAL NOT NULL,
    "liftVsBaseline" REAL NOT NULL,
    "confidenceInterval" TEXT NOT NULL,
    "trend" TEXT NOT NULL,
    "alertFlag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatternPerformance_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "DCG_ContextPattern" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatternAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patternId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    "acknowledgedBy" TEXT,
    "resolution" TEXT,
    "resolutionNote" TEXT,
    CONSTRAINT "PatternAlert_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "DCG_ContextPattern" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Epic_Patient_mrn_key" ON "Epic_Patient"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "Epic_Encounter_encounter_number_key" ON "Epic_Encounter"("encounter_number");

-- CreateIndex
CREATE UNIQUE INDEX "Epic_Provider_npi_key" ON "Epic_Provider"("npi");

-- CreateIndex
CREATE UNIQUE INDEX "Ensocare_Case_case_number_key" ON "Ensocare_Case"("case_number");

-- CreateIndex
CREATE UNIQUE INDEX "Ensocare_SocialAssessment_case_id_key" ON "Ensocare_SocialAssessment"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "DCG_DecisionTrace_trace_number_key" ON "DCG_DecisionTrace"("trace_number");

-- CreateIndex
CREATE UNIQUE INDEX "DCG_DecisionTrace_clinical_snapshot_id_key" ON "DCG_DecisionTrace"("clinical_snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "DCG_DecisionTrace_social_snapshot_id_key" ON "DCG_DecisionTrace"("social_snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "DCG_Outcome_trace_id_key" ON "DCG_Outcome"("trace_id");

-- CreateIndex
CREATE UNIQUE INDEX "DCG_ContextPattern_pattern_number_key" ON "DCG_ContextPattern"("pattern_number");

-- CreateIndex
CREATE UNIQUE INDEX "DCG_MonthlyMetrics_month_number_key" ON "DCG_MonthlyMetrics"("month_number");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyVersion_version_key" ON "PolicyVersion"("version");

-- CreateIndex
CREATE INDEX "PatternSnapshot_patternId_snapshotDate_idx" ON "PatternSnapshot"("patternId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionPatternSnapshot_decisionId_snapshotId_key" ON "DecisionPatternSnapshot"("decisionId", "snapshotId");

-- CreateIndex
CREATE INDEX "AmbientContext_patientMrn_source_idx" ON "AmbientContext"("patientMrn", "source");

-- CreateIndex
CREATE INDEX "AmbientContext_patientMrn_capturedAt_idx" ON "AmbientContext"("patientMrn", "capturedAt");

-- CreateIndex
CREATE INDEX "PatternPerformance_patternId_periodEnd_idx" ON "PatternPerformance"("patternId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "PatternPerformance_patternId_periodStart_key" ON "PatternPerformance"("patternId", "periodStart");

-- CreateIndex
CREATE INDEX "PatternAlert_patternId_createdAt_idx" ON "PatternAlert"("patternId", "createdAt");

-- CreateIndex
CREATE INDEX "PatternAlert_severity_acknowledgedAt_idx" ON "PatternAlert"("severity", "acknowledgedAt");
