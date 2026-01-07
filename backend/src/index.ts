import appInsights from 'applicationinsights';

appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '')
  .setAutoDependencyCorrelation(true)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true, true)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectConsole(true, true)
  .setUseDiskRetryCaching(true)
  .setSendLiveMetrics(true)
  .start();

const client = appInsights.defaultClient;
if (client) {
  client.context.tags[client.context.keys.cloudRole] = 'dcg-backend';
}

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
