"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config();
// Import Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const memoriesRoutes_1 = __importDefault(require("./routes/memoriesRoutes"));
const albumRoutes_1 = __importDefault(require("./routes/albumRoutes"));
const videoRoutes_1 = __importDefault(require("./routes/videoRoutes"));
const audioRoutes_1 = __importDefault(require("./routes/audioRoutes"));
const timelineRoutes_1 = __importDefault(require("./routes/timelineRoutes"));
const letterRoutes_1 = __importDefault(require("./routes/letterRoutes"));
const contributionRoutes_1 = __importDefault(require("./routes/contributionRoutes"));
const specialDateRoutes_1 = __importDefault(require("./routes/specialDateRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, morgan_1.default)('dev'));
// Static files for local media uploads fallback
const uploadsPath = path_1.default.join(process.cwd(), 'uploads');
app.use('/uploads', express_1.default.static(uploadsPath));
// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        application: 'Until We Meet Again - Digital Memorial Service',
        database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
    });
});
// Mount API routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/memories', memoriesRoutes_1.default);
app.use('/api/albums', albumRoutes_1.default);
app.use('/api/videos', videoRoutes_1.default);
app.use('/api/audio', audioRoutes_1.default);
app.use('/api/timeline', timelineRoutes_1.default);
app.use('/api/letters', letterRoutes_1.default);
app.use('/api/contributions', contributionRoutes_1.default);
app.use('/api/special-dates', specialDateRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled Application Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'An unexpected error occurred in the memorial vault',
    });
});
// Database Connection & Server Start
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/until_we_meet_again';
async function startServer() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('🕊️ Connected to MongoDB: Memorial Database Active');
    }
    catch (error) {
        console.warn('⚠️ MongoDB connection failed. Running in memory / offline mode:', error.message);
    }
    app.listen(PORT, () => {
        console.log(`🕊️ "Until We Meet Again" Memorial API running on port ${PORT}`);
        console.log(`🌸 Health check: http://localhost:${PORT}/api/health`);
    });
}
startServer();
exports.default = app;
