# Avoid Readmit - DCG Context Graph

A healthcare decision intelligence platform that uses AI-powered context graph analysis to reduce hospital readmissions by capturing and analyzing patient context data that traditional EHR systems miss.

## Overview

The DCG (Decision Context Graph) Context Graph system captures ambient context from patient interactions, including caregiver availability, social support systems, transportation access, and other factors that significantly impact discharge success. By analyzing patterns across historical cases, the system helps case managers make better-informed discharge decisions.

## Key Features

### Dashboard
Real-time overview of hospital metrics including readmission rates, cost savings, and AI system performance. Shows the progression of pattern discovery over time as the system learns from more cases.

### Patient Worklist
The primary workflow interface for case managers to review patients pending discharge decisions.

**Features:**
- **Risk Category Filtering** - Click on High Risk, Moderate Risk, or On Target cards to filter the patient list. Active filters show a visual ring indicator.
- **Collapsible Patient Cards** - Click any patient to expand and view detailed analysis
- **AI-Powered Discharge Readiness Analysis** - Automatically analyzes each patient using the Context Graph patterns
- **Case Worker Notes** - Add notes with full audit trail (timestamp, case worker name)
- **Override Recommendations** - Approve, Hold, or Review with required reason tracking
- **Smooth Scroll UX** - Expanded cards smoothly scroll into view to prevent screen jumping
- **Deterministic Risk Scoring** - Risk categories remain stable (no random fluctuations)

### Pattern Comparison (Compare Page)
Find similar historical cases to inform discharge decisions.

**Features:**
- **Patient Selector** - Dropdown to select any patient from the worklist
- **Similar Case Matching** - Finds 2-3 historical cases with similar characteristics:
  - Age similarity (within 10 years)
  - Same primary diagnosis
  - Similar length of stay (within 3 days)
  - Same discharge disposition
- **Side-by-Side Comparison** - View key context factors for each similar case:
  - Caregiver details and medical background
  - Proximity to patient
  - Availability schedule
- **Outcome Analysis** - See success rates and whether cases resulted in readmission
- **Pattern Insights** - "What Worked" vs "What Didn't Work" analysis with specific recommendations

### Decisions
View and track all discharge decisions with AI recommendations and outcomes.

### Patterns
Browse discovered context graph patterns with success rates, lift metrics, and sample sizes.

### AI Activity
Monitor AI agent performance including:
- Multi-agent orchestration status
- Token usage and costs
- Model performance metrics (GPT-5.2, DeepSeek-V3.2, o3-2)

### Demo Control
Timeline-based demo mode to simulate 9 months of system learning and pattern discovery.

## Technical Architecture

### Frontend
- React 18 with TypeScript
- TanStack Query for data fetching (10-minute refresh interval)
- Tailwind CSS with custom glass-card design system
- Lucide React icons

### Backend
- Node.js with Express
- Prisma ORM with SQLite
- Azure AI integration (GPT-5.2, DeepSeek-V3.2, o3-2)
- Azure Application Insights telemetry

### AI Agents
1. **Discharge Readiness Agent** - Analyzes patient context for discharge planning
2. **Pattern Discovery Agent** - Identifies new context patterns from historical data
3. **Risk Stratification Agent** - Calculates readmission risk scores
4. **Recommendation Agent** - Generates actionable recommendations

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/gregnatkatz/avoidreadmit.git
cd avoidreadmit

# Install backend dependencies
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

```bash
# Start backend (port 3001)
cd backend
npm run dev

# Start frontend (port 5173)
cd frontend
npm run dev
```

Visit http://localhost:5173 to access the application.

## Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL="file:./dev.db"
AZURE_OPENAI_ENDPOINT="your-endpoint"
AZURE_OPENAI_API_KEY="your-key"
APPLICATIONINSIGHTS_CONNECTION_STRING="your-connection-string"
```

## License

Proprietary - Microsoft Healthcare AI Research
