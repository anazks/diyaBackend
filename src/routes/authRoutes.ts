import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { requireAuth, AuthenticatedRequest, recordAudit } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'memorial_secret_key_until_we_meet_again_2026';

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, relationship, role } = req.body;

    if (!name || !email || !password || !relationship) {
      res.status(400).json({ error: 'Please provide name, email, password, and relationship to Diya' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ error: 'An account with this email address already exists' });
      return;
    }

    // First user or specified admin
    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? 'admin' : (role || 'family_member');

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      relationship,
      role: assignedRole,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
    });

    const token = signToken(newUser._id.toString());

    await recordAudit(
      newUser._id.toString(),
      'USER_REGISTERED',
      'User',
      newUser._id.toString(),
      { email: newUser.email, role: newUser.role }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        relationship: newUser.relationship,
        avatarUrl: newUser.avatarUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Please enter email and password' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken(user._id.toString());

    await recordAudit(
      user._id.toString(),
      'USER_LOGIN',
      'User',
      user._id.toString()
    );

    res.json({
      message: 'Welcome back to the Memorial',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        relationship: user.relationship,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      relationship: req.user.relationship,
      avatarUrl: req.user.avatarUrl,
    },
  });
});

// GET /api/auth/family-members
router.get('/family-members', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const members = await User.find({ isActive: true })
      .select('name email role relationship avatarUrl createdAt')
      .sort({ createdAt: 1 });
    res.json({ members });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch family members' });
  }
});

export default router;
