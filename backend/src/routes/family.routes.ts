import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Schema validation
const createMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  birthDate: z.string().optional().nullable(),
  deathDate: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  relationship: z.string().min(1, 'Relationship is required'),
  notes: z.string().optional().nullable(),
  parentId: z.string().optional().nullable()
});

const updateMemberSchema = createMemberSchema.partial();

/**
 * @route GET /api/family
 * @desc Get all family members for authenticated user
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const members = await prisma.familyMember.findMany({
      where: {
        userId: req.user?.id
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    res.json({ members });
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

/**
 * @route POST /api/family/person
 * @desc Add new family member
 * @access Private
 */
router.post('/person', authenticate, async (req, res) => {
  try {
    const data = createMemberSchema.parse(req.body);

    const member = await prisma.familyMember.create({
      data: {
        userId: req.user?.id,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        deathDate: data.deathDate ? new Date(data.deathDate) : undefined,
        gender: data.gender || '',
        relationship: data.relationship,
        notes: data.notes,
        parentId: data.parentId
      }
    });

    res.status(201).json({ member });
  } catch (error) {
    console.error('Error creating family member:', error);
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

/**
 * @route PUT /api/family/person/:id
 * @desc Update family member
 * @access Private
 */
router.put('/person/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateMemberSchema.parse(req.body);

    // Verify ownership
    const existingMember = await prisma.familyMember.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existingMember) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    if (existingMember.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const member = await prisma.familyMember.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        deathDate: data.deathDate ? new Date(data.deathDate) : undefined,
        gender: data.gender || '',
        relationship: data.relationship,
        notes: data.notes,
        parentId: data.parentId
      }
    });

    res.json({ member });
  } catch (error) {
    console.error('Error updating family member:', error);
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

/**
 * @route DELETE /api/family/person/:id
 * @desc Delete family member
 * @access Private
 */
router.delete('/person/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existingMember = await prisma.familyMember.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existingMember) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    if (existingMember.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.familyMember.delete({
      where: { id }
    });

    res.json({ message: 'Family member deleted' });
  } catch (error) {
    console.error('Error deleting family member:', error);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

/**
 * @route GET /api/family/tree
 * @desc Get family tree as hierarchical structure
 * @access Private
 */
router.get('/tree', authenticate, async (req, res) => {
  try {
    const members = await prisma.familyMember.findMany({
      where: {
        userId: req.user?.id
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    // Build tree structure
    const buildTree = (memberId: string | null) => {
      const member = members.find(m => m.id === memberId);
      if (!member) return null;

      const children = members.filter(m => m.parentId === memberId);

      return {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        birthDate: member.birthDate,
        deathDate: member.deathDate,
        gender: member.gender,
        relationship: member.relationship,
        notes: member.notes,
        photoUrl: member.photoUrl,
        children: children.map(child => buildTree(child.id)).filter(Boolean)
      };
    };

    // Find root members (those without parents in the tree)
    const rootMembers = members.filter(m => !m.parentId || !members.some(c => c.id === m.parentId));
    const tree = rootMembers.map(m => buildTree(m.id)).filter(Boolean);

    res.json({ tree, members });
  } catch (error) {
    console.error('Error building family tree:', error);
    res.status(500).json({ error: 'Failed to build family tree' });
  }
});

/**
 * @route GET /api/family/export/gedcom
 * @desc Export family tree as GEDCOM format
 * @access Private
 */
router.get('/export/gedcom', authenticate, async (req, res) => {
  try {
    const members = await prisma.familyMember.findMany({
      where: {
        userId: req.user?.id
      }
    });

    // Generate GEDCOM format
    let gedcom = '0 HEAD\n1 CHAR UTF-8\n2 GEND\n1 SOUR FamilyTreeApp\n1 DATE ';
    gedcom += new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'jan', 
      day: '2-digit' 
    }).toUpperCase() + '\n0 TRLR\n';

    let indiId = 1;
    const idMap = new Map<string, string>();

    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '');
    };

    // First pass: create all individuals
    for (const member of members) {
      const gedId = String.fromCharCode(64 + indiId); // A, B, C...
      idMap.set(member.id, gedId);
      gedcom += `0 @${gedId}@ INDI\n`;
      gedcom += `1 NAME ${member.firstName} /${member.lastName}/\n`;
      
      if (member.gender) {
        gedcom += `1 SEX ${member.gender[0].toUpperCase()}\n`;
      }
      
      if (member.birthDate) {
        gedcom += `1 BIRT\n2 DATE ${formatDate(member.birthDate)}\n`;
      }
      
      if (member.deathDate) {
        gedcom += `1 DEA\n2 DATE ${formatDate(member.deathDate)}\n`;
      }
      
      gedcom += `1 NOTE ${member.notes || ''}\n`;
      indiId++;
    }

    // Second pass: create family groups
    const rootMembers = members.filter(m => !m.parentId || !members.some(c => c.id === m.parentId));
    let famId = 1;

    for (const root of rootMembers) {
      const children = members.filter(m => m.parentId === root.id);
      if (children.length > 0) {
        gedcom += `0 @F${famId}@ FAM\n`;
        gedcom += `1 HUSB @${idMap.get(root.id)}@\n`;
        
        for (const child of children) {
          gedcom += `1 CHIL @${idMap.get(child.id)}@\n`;
        }
        
        famId++;
      }
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="family-tree.ged"');
    res.send(gedcom);
  } catch (error) {
    console.error('Error exporting GEDCOM:', error);
    res.status(500).json({ error: 'Failed to export GEDCOM' });
  }
});

export default router;