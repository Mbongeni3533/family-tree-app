import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Schema validation
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  invitationToken: z.string()
});

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional()
});

/**
 * @route POST /api/auth/invite
 * @desc Generate invitation token for user registration
 * @access Private (Admin only in production)
 */
router.post('/invite', async (req, res) => {
  try {
    const { email, name } = inviteSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate unique invitation token
    const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const user = await prisma.user.create({
      data: {
        email,
        name,
        invitationToken,
        invitedAt: new Date()
      }
    });

    res.status(201).json({
      message: 'Invitation created successfully',
      invitationToken,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

/**
 * @route POST /api/auth/register
 * @desc Register user with invitation token
 * @access Public (but requires valid invitation)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, invitationToken } = registerSchema.parse(req.body);

    // Find user by invitation token
    const user = await prisma.user.findFirst({
      where: {
        email,
        invitationToken
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid invitation token or email' });
    }

    // Check if invitation has expired (7 days)
    if (user.invitedAt && Date.now() - user.invitedAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user with password and clear invitation token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        name: name || user.name
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: updatedUser.id, email: updatedUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Registration successful',
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Authenticate user
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;