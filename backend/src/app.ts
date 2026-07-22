import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler';
import { authRoutes } from './modules/auth/auth.routes';
import { fieldRoutes } from './modules/field/field.routes';
import { wellRoutes } from './modules/well/well.routes';
import { espRoutes } from './modules/esp/esp.routes';
import { uploadRoutes } from './modules/upload/upload.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { alertRoutes } from './modules/alerts/alerts.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/wells', wellRoutes);
app.use('/api/wells', espRoutes);
app.use('/api/wells', uploadRoutes);
app.use('/api/wells', analyticsRoutes);
app.use('/api/alerts', alertRoutes);

app.use(errorHandler);

export default app;
