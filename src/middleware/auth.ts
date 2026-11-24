import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User, IUserDocument } from '../models/User';
import { AuditLog } from '../models/AuditLog';

const JWT_SECRET = process.env.JWT_SECRET || 'memorial_secret_key_until_we_meet_again_2026';

export interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
}

/** The single account everyone shares when OPEN_ACCESS is on (no sign-in). */
function getSharedFamilyUser() {
  return User.findOneAndUpdate(
    { email: 'family@memorial.local' },
    {
      $setOnInsert: {
        name: 'Family',
        relationship: 'Family',
        role: 'admin',
        isActive: true,
        password: crypto.randomBytes(32).toString('hex'), // never used to sign in
      },
    },
    { upsert: true, new: true }
  );
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: 'The server is not connected to its database. Start MongoDB, then restart the server.' });
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (!authHeader && process.env.OPEN_ACCESS === 'true') {
        req.user = (await getSharedFamilyUser()) as IUserDocument;
        next();
        return;
      }

      res.status(401).json({ error: 'Authentication required to view memorial records' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User session has expired or account is inactive' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) {
      console.error('Authentication check failed:', error);
      res.status(500).json({ error: 'The server could not check your access. Please try again.' });
      return;
    }
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access is required for this action' });
    return;
  }
  next();
}

/**
 * Record an audit log for security, sensitive updates, or admin approvals.
 */
export async function recordAudit(
  performedByUserId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, any>,
  ipAddress?: string
) {
  try {
    await AuditLog.create({
      action,
      performedBy: performedByUserId,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
      details,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}
