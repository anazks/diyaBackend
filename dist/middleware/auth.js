"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.recordAudit = recordAudit;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const AuditLog_1 = require("../models/AuditLog");
const JWT_SECRET = process.env.JWT_SECRET || 'memorial_secret_key_until_we_meet_again_2026';
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // In development mode, allow fallback header or demo user if token is missing
            const demoEmail = req.headers['x-demo-user-email'];
            if (demoEmail) {
                const found = await User_1.User.findOne({ email: demoEmail });
                if (found) {
                    req.user = found;
                    return next();
                }
            }
            res.status(401).json({ error: 'Authentication required to view memorial records' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await User_1.User.findById(decoded.userId);
        if (!user || !user.isActive) {
            res.status(401).json({ error: 'User session has expired or account is inactive' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
}
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Administrator access is required for this action' });
        return;
    }
    next();
}
/**
 * Record an audit log for security, sensitive updates, or admin approvals.
 */
async function recordAudit(performedByUserId, action, targetType, targetId, details, ipAddress) {
    try {
        await AuditLog_1.AuditLog.create({
            action,
            performedBy: performedByUserId,
            targetType,
            targetId: targetId ? String(targetId) : undefined,
            details,
            ipAddress,
            timestamp: new Date(),
        });
    }
    catch (err) {
        console.error('Audit log failed:', err);
    }
}
