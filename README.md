# Avoid Readmit - DCG Context Graph

A healthcare decision intelligence platform that uses AI-powered context graph analysis to reduce hospital readmissions by capturing and analyzing patient context data that traditional EHR systems miss.

![Dashboard](docs/images/dashboard.png)

## Table of Contents

- [Overview](#overview)
- [Key Results](#key-results)
- [Features](#features)
- [Technical Architecture](#technical-architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Data Model](#data-model)
- [AI Integration](#ai-integration)

## Overview

The DCG (Decision Context Graph) Context Graph system captures ambient context from patient interactions that traditional EHR systems miss. This includes caregiver availability, social support systems, transportation access, living situations, and other social determinants of health (SDOH) factors that significantly impact discharge success.

The system uses a multi-agent AI architecture to extract context from ambient voice transcription, match patterns against historical cases, discover new patterns that predict successful outcomes, and generate recommendations for case managers.

## Key Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Readmission Rate | 17.98% | 12.9% | -5.08% |
| Cumulative Savings | $0 | $8.16M | +$8.16M |
| Readmissions Avoided | 0 | 537 | +537 |
| AI-Discovered Patterns | 0 | 15 | +15 |
| Context Match Success Rate | 55% | 87% | +32% |
| ROI | - | 847% | - |

## Features

### Dashboard

Real-time executive dashboard with hospital performance metrics, cost savings, and AI system effectiveness.

![Dashboard](docs/images/dashboard.png)

Key metrics include readmission rate vs CMS HRRP target (<15.5%), cumulative savings from avoided readmissions (~$15K per readmission), ROI, and active AI-discovered patterns. Visualizations show readmission rate trends, decision outcomes distribution, pattern discovery timeline, and AI provider performance.

### Patient Worklist

The primary workflow interface for case managers to review patients pending discharge decisions.

![Worklist](docs/images/worklist.png)

| Feature | Description |
|---------|-------------|
| Risk Category Filtering | Click High Risk, Moderate Risk, or On Target cards to filter patients |
| Collapsible Patient Cards | Expand any patient to view detailed AI analysis |
| AI-Powered Analysis | Automatic discharge readiness analysis using Context Graph patterns |
| Case Worker Notes | Add notes with full audit trail (timestamp, case worker name) |
| Override Recommendations | Approve, Hold, or Review with required reason tracking |
| Smooth Scroll UX | Expanded cards scroll into view to prevent screen jumping |
| Deterministic Risk Scoring | Risk categories remain stable between page loads |

### Pattern Comparison

Find similar historical cases to inform discharge decisions with evidence-based insights.

![Compare](docs/images/compare.png)

The similarity scoring algorithm uses weighted factors:

| Factor | Points | Criteria |
|--------|--------|----------|
| Age Similarity | 25 | Within 10 years |
| Primary Diagnosis | 35 | Same diagnosis code |
| Length of Stay | 20 | Within 3 days |
| Discharge Disposition | 20 | Same disposition type |

![Compare Insights](docs/images/compare-insights.png)

Pattern Insights show "What Worked" (success factors from cases that avoided readmission), "What Didn't Work" (risk factors from readmitted cases), and specific recommendations based on historical evidence.

### Decisions

Track all discharge decisions with AI recommendations and outcomes.

![Decisions](docs/images/decisions.png)

Decision trace table shows Trace ID, Patient MRN, Decision (disposition type), Decision Maker (physician), Policy (Followed or Exception), and Outcome (Success, Readmitted, or Pending).

### Patterns

Browse all AI-discovered context graph patterns with statistical validation.

![Patterns](docs/images/patterns.png)

| Pattern ID | Description | Success Rate | Lift |
|------------|-------------|--------------|------|
| PAT-0006 | Medical background + close proximity + full-time availability | 92% | +27% |
| PAT-0015 | Spouse + child caregivers (comprehensive support network) | 91% | +26% |
| PAT-0011 | Proximity + availability + familiarity combination | 89% | +24% |
| PAT-0008 | 0 readmissions in past 12 months | 88% | +23% |
| PAT-0001 | Caregivers with medical training | 84% | +19% |
| PAT-0014 | RISK: Caregivers aged 65+ with health issues | 42% | -23% |

### AI Activity

Monitor the multi-agent AI pipeline and system performance.

![AI Activity](docs/images/ai-activity.png)

| Agent | Role |
|-------|------|
| Primary Agent | Core AI tasks: context extraction, matching, pattern discovery |
| Verification Agent | Reviews outputs for accuracy, completeness, consistency |
| Questioning Agent | Identifies gaps, ambiguities, challenges assumptions |

AI Providers:

| Model | Priority | Use Case |
|-------|----------|----------|
| GPT-5.2 | 1 | General analysis, recommendations |
| o3-2 | 2 | Complex reasoning, pattern discovery |
| DeepSeek-V3.2 | 3 | Fast inference, simple queries |

### Demo Control

Navigate through 9 months of Context Graph implementation to see the system's learning progression.

![Demo Control](docs/images/demo-control.png)

| Month | Readmission Rate | Cumulative Savings | Patterns |
|-------|------------------|-------------------|----------|
| April (Month 1) | 18.0% | $0.00M | 0 |
| May (Month 2) | 17.5% | $0.11M | 0 |
| June (Month 3) | 17.2% | $0.27M | 0 |
| July (Month 4) | 16.1% | $0.74M | 0 |
| August (Month 5) | 15.4% | $1.61M | 2 |
| September (Month 6) | 14.9% | $2.72M | 5 |
| October (Month 7) | 13.8% | $4.21M | 9 |
| November (Month 8) | 13.5% | $6.05M | 12 |
| December (Month 9) | 12.9% | $8.16M | 15 |

## Technical Architecture

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | Component framework with TypeScript |
| TanStack Query | Data fetching with 10-minute refresh interval |
| Tailwind CSS | Custom glass-card design system (dark theme) |
| Lucide React | Icon library |
| Recharts | Data visualizations |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js + Express | REST API server |
| Prisma ORM | Database abstraction with SQLite |
| TypeScript | Type-safe development |
| Azure OpenAI | Multi-model AI inference |
| Application Insights | Telemetry and monitoring |

### Database Schema

| Table | Description |
|-------|-------------|
| Patient | Demographics, diagnosis, LOS, disposition, insurance |
| ContextPattern | AI-discovered patterns with conditions and metrics |
| DischargeDecision | Decision traces with outcomes |
| AmbientContext | Captured context from 5 ambient sources |
| CaseWorkerNote | Audit trail for notes and overrides |

### AI Agents

| Agent | Function |
|-------|----------|
| Discharge Readiness Agent | Analyzes patient context for discharge planning |
| Pattern Discovery Agent | Identifies new context patterns from historical data |
| Risk Stratification Agent | Calculates readmission risk scores |
| Recommendation Agent | Generates actionable recommendations |

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or pnpm package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/gregnatkatz/avoidreadmit.git
cd avoidreadmit

# Install backend dependencies
cd backend
npm install

# Generate Prisma client and create database
npx prisma generate
npx prisma db push

# Seed the database with demo data (600+ patients, 27K+ decisions, 15 patterns)
npm run seed

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

```bash
# Terminal 1: Start backend (port 3001)
cd backend
npm run dev

# Terminal 2: Start frontend (port 5173)
cd frontend
npm run dev
```

Access the application at http://localhost:5173

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# Azure OpenAI - GPT-5.2
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
AZURE_OPENAI_API_KEY="your-api-key"
AZURE_OPENAI_DEPLOYMENT="gpt-5.2"

# Azure OpenAI - o3-2 (reasoning model)
AZURE_O3_ENDPOINT="https://your-resource.openai.azure.com"
AZURE_O3_API_KEY="your-api-key"
AZURE_O3_DEPLOYMENT="o3-2"

# Azure OpenAI - DeepSeek-V3.2
AZURE_DEEPSEEK_ENDPOINT="https://your-resource.openai.azure.com"
AZURE_DEEPSEEK_API_KEY="your-api-key"
AZURE_DEEPSEEK_DEPLOYMENT="deepseek-v3.2"

# Azure Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=xxx;IngestionEndpoint=https://xxx.in.applicationinsights.azure.com/"
```

## Data Model

### Ambient Context Sources

| Source | Description |
|--------|-------------|
| Nurse Bedside Conversations | Informal discussions about patient status |
| Family Discussions | Caregiver availability, concerns, preferences |
| Care Coordination Meetings | Multi-disciplinary team discussions |
| Social Work Assessments | SDOH factors, support systems |
| PT/OT Sessions | Functional status, mobility, ADL scores |

### Key Context Factors

| Factor | Description |
|--------|-------------|
| Caregiver Medical Background | Whether caregiver has medical training |
| Caregiver Proximity | Distance from patient's home (minutes) |
| Caregiver Availability | Full-time, part-time, weekends only |
| Caregiver Relationship | Spouse, child, sibling, friend |
| Living Situation | Lives alone, with family, assisted living |
| Transportation Access | Own vehicle, public transit, barriers |
| Patient Preferences | Stated preference for home vs facility |

## AI Integration

### Telemetry

All AI calls are instrumented with Azure Application Insights using OpenTelemetry semantic conventions for Gen AI:

| Attribute | Description |
|-----------|-------------|
| gen_ai.system | AI provider name |
| gen_ai.request.model | Model deployment name |
| gen_ai.usage.input_tokens | Prompt token count |
| gen_ai.usage.output_tokens | Completion token count |
| gen_ai.response.finish_reason | Completion reason |

## License

Proprietary - Microsoft Healthcare AI Research

## Contact

- Gregory Katz (gregory.katz@microsoft.com)
- Healthcare AI Research Team
