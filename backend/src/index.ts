// Azure Monitor OpenTelemetry with Gen AI instrumentation
// Must be set up BEFORE importing OpenAI
import { useAzureMonitor, AzureMonitorOpenTelemetryOptions } from '@azure/monitor-opentelemetry';

// Get connection string and log it for debugging
const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '';
console.log(`[Azure Monitor] Connection string present: ${connectionString.length > 0 ? 'YES' : 'NO'}`);
if (connectionString.length > 0) {
  console.log(`[Azure Monitor] Connection string starts with: ${connectionString.substring(0, 50)}...`);
}

// Configure Azure Monitor with OpenTelemetry
const options: AzureMonitorOpenTelemetryOptions = {
  azureMonitorExporterOptions: {
    connectionString: connectionString
  },
  instrumentationOptions: {
    azureSdk: { enabled: true },
    http: { enabled: true },
  }
};

// Start Azure Monitor with OpenTelemetry
console.log('[Azure Monitor] Initializing Azure Monitor OpenTelemetry...');
useAzureMonitor(options);
console.log('[Azure Monitor] Azure Monitor OpenTelemetry initialized successfully');

import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes/dashboard';
import patientsRoutes from './routes/patients';
import decisionsRoutes from './routes/decisions';
import timelineRoutes from './routes/timeline';
import contextRoutes from './routes/context';
import patternsRoutes from './routes/patterns';
import aiRoutes from './routes/ai';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/decisions', decisionsRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/patterns', patternsRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`DCG Backend running on port ${PORT}`);
});
