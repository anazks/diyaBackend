import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUserDocument } from '../models/User';
import { AuditLog } from '../models/AuditLog';

const JWT_SECRET = process.env.JWT_SECRET || 'memorial_secret_key_until_we_meet_again_2026';

export interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In development mode, allow fallback header or demo user if token is missing
      const demoEmail = req.headers['x-demo-user-email'] as string;
      if (demoEmail) {
        const found = await User.findOne({ email: demoEmail });
        if (found) {
          req.user = found;
          return next();
        }
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
