import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { trackTimelineAdvanced } from '../telemetry';

const router = Router();
const prisma = new PrismaClient();

router.get('/state', async (_req, res) => {
  try {
    let state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    if (!state) {
      state = await prisma.demo_State.create({
        data: { id: 'singleton', current_month: 1 }
      });
    }
    res.json({ currentMonth: state.current_month, totalMonths: 6 });
  } catch (error) {
    console.error('Error getting timeline state:', error);
    res.status(500).json({ error: 'Failed to get timeline state' });
  }
});

router.post('/advance', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    if (currentMonth >= 6) {
      return res.status(400).json({ error: 'Already at final month' });
    }

    const newMonth = currentMonth + 1;
    await prisma.demo_State.update({
      where: { id: 'singleton' },
      data: { current_month: newMonth }
    });

    trackTimelineAdvanced(currentMonth, newMonth);
    res.json({ currentMonth: newMonth, totalMonths: 6 });
  } catch (error) {
    console.error('Error advancing timeline:', error);
    res.status(500).json({ error: 'Failed to advance timeline' });
  }
});

router.post('/goto', async (req, res) => {
  try {
    const { month } = req.body;
    if (month < 1 || month > 6) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    await prisma.demo_State.update({
      where: { id: 'singleton' },
      data: { current_month: month }
    });

    trackTimelineAdvanced(currentMonth, month);
    res.json({ currentMonth: month, totalMonths: 6 });
  } catch (error) {
    console.error('Error going to month:', error);
    res.status(500).json({ error: 'Failed to go to month' });
  }
});

router.post('/reset', async (_req, res) => {
  try {
    await prisma.demo_State.update({
      where: { id: 'singleton' },
      data: { current_month: 1 }
    });

    trackTimelineAdvanced(0, 1);
    res.json({ currentMonth: 1, totalMonths: 6 });
  } catch (error) {
    console.error('Error resetting timeline:', error);
    res.status(500).json({ error: 'Failed to reset timeline' });
  }
});

router.get('/changes', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const changes = await prisma.demo_Change.findMany({
      where: { month_added: currentMonth },
      orderBy: { created_at: 'desc' }
    });

    res.json(changes);
  } catch (error) {
    console.error('Error getting changes:', error);
    res.status(500).json({ error: 'Failed to get changes' });
  }
});

export default router;
