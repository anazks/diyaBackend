import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Load environment variables
dotenv.config();

// Import Routes
import authRoutes from './routes/authRoutes';
import memoriesRoutes from './routes/memoriesRoutes';
import albumRoutes from './routes/albumRoutes';
import videoRoutes from './routes/videoRoutes';
import audioRoutes from './routes/audioRoutes';
import timelineRoutes from './routes/timelineRoutes';
import letterRoutes from './routes/letterRoutes';
import contributionRoutes from './routes/contributionRoutes';
import specialDateRoutes from './routes/specialDateRoutes';
import uploadRoutes from './routes/uploadRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Static files for local media uploads fallback
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    application: 'Until We Meet Again - Digital Memorial Service',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/letters', letterRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/special-dates', specialDateRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected error occurred in the memorial vault',
  });
});

// Database Connection & Server Start
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/until_we_meet_again';

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🕊️ Connected to MongoDB: Memorial Database Active');
  } catch (error) {
    console.warn('⚠️ MongoDB connection failed. Running in memory / offline mode:', (error as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`🕊️ "Until We Meet Again" Memorial API running on port ${PORT}`);
    console.log(`🌸 Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer();

export default app;
