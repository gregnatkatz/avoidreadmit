import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { trackTimelineAdvanced } from '../telemetry';
import { generateOutcomes } from '../services/demo/outcomeGenerator';
import { runIntegratedPatternDiscovery } from '../services/demo/integratedPatternDiscovery';

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
    res.json({ currentMonth: state.current_month, totalMonths: 9 });
  } catch (error) {
    console.error('Error getting timeline state:', error);
    res.status(500).json({ error: 'Failed to get timeline state' });
  }
});

router.post('/advance', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    if (currentMonth >= 9) {
      return res.status(400).json({ error: 'Already at final month' });
    }

    const newMonth = currentMonth + 1;
    
    // 1. Generate outcomes for the new month
    console.log(`[Timeline] Generating outcomes for month ${newMonth}...`);
    const outcomeResults = await generateOutcomes(newMonth);
    
    // 2. Run pattern discovery on accumulated data (only after month 4)
    let newPatterns: any[] = [];
    if (newMonth >= 5) {
      console.log(`[Timeline] Running pattern discovery for months 1-${newMonth}...`);
      newPatterns = await runIntegratedPatternDiscovery(newMonth);
    }
    
    // 3. Update demo state
    await prisma.demo_State.update({
      where: { id: 'singleton' },
      data: { current_month: newMonth }
    });

    trackTimelineAdvanced(currentMonth, newMonth);
    
    res.json({ 
      currentMonth: newMonth, 
      totalMonths: 9,
      outcomes: outcomeResults,
      newPatterns: newPatterns.length,
      patternsDiscovered: newPatterns.map(p => ({
        id: p.pattern_number,
        title: p.title,
        lift: p.lift_vs_baseline
      }))
    });
  } catch (error) {
    console.error('Error advancing timeline:', error);
    res.status(500).json({ error: 'Failed to advance timeline' });
  }
});

router.post('/goto', async (req, res) => {
  try {
    const { month } = req.body;
    if (month < 1 || month > 9) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    await prisma.demo_State.update({
      where: { id: 'singleton' },
      data: { current_month: month }
    });

    trackTimelineAdvanced(currentMonth, month);
    res.json({ currentMonth: month, totalMonths: 9 });
  } catch (error) {
    console.error('Error going to month:', error);
    res.status(500).json({ error: 'Failed to go to month' });
  }
});

router.post('/reset', async (_req, res) => {
  try {
    console.log('[Timeline] Resetting demo state...');
    
    // 1. Delete all outcomes (so they can be regenerated)
    const deletedOutcomes = await prisma.dCG_Outcome.deleteMany();
    console.log(`[Timeline] Deleted ${deletedOutcomes.count} outcomes`);
    
    // 2. Get pattern IDs to delete (discovered patterns from month > 0)
    const patternsToDelete = await prisma.dCG_ContextPattern.findMany({
      where: { data_month: { gt: 0 } },
      select: { id: true }
    });
    const patternIds = patternsToDelete.map(p => p.id);
    
    // 3. Delete related records first (foreign key constraints)
    if (patternIds.length > 0) {
      // Delete pattern alerts
      const deletedAlerts = await prisma.patternAlert.deleteMany({
        where: { patternId: { in: patternIds } }
      });
      console.log(`[Timeline] Deleted ${deletedAlerts.count} pattern alerts`);
      
      // Delete pattern performance records
      const deletedPerformance = await prisma.patternPerformance.deleteMany({
        where: { patternId: { in: patternIds } }
      });
      console.log(`[Timeline] Deleted ${deletedPerformance.count} pattern performance records`);
      
      // Get snapshot IDs for these patterns
      const snapshots = await prisma.patternSnapshot.findMany({
        where: { patternId: { in: patternIds } },
        select: { id: true }
      });
      const snapshotIds = snapshots.map(s => s.id);
      
      // Delete decision pattern snapshots
      if (snapshotIds.length > 0) {
        const deletedDecisionSnapshots = await prisma.decisionPatternSnapshot.deleteMany({
          where: { snapshotId: { in: snapshotIds } }
        });
        console.log(`[Timeline] Deleted ${deletedDecisionSnapshots.count} decision pattern snapshots`);
      }
      
      // Delete pattern snapshots
      const deletedSnapshots = await prisma.patternSnapshot.deleteMany({
        where: { patternId: { in: patternIds } }
      });
      console.log(`[Timeline] Deleted ${deletedSnapshots.count} pattern snapshots`);
    }
    
    // 4. Now delete the patterns themselves
    const deletedPatterns = await prisma.dCG_ContextPattern.deleteMany({
      where: { data_month: { gt: 0 } }
    });
    console.log(`[Timeline] Deleted ${deletedPatterns.count} discovered patterns`);
    
    // 3. Reset demo state to month 1
    await prisma.demo_State.update({
      where: { id: 'singleton' },
      data: { current_month: 1 }
    });

    trackTimelineAdvanced(0, 1);
    res.json({ 
      currentMonth: 1, 
      totalMonths: 9,
      deletedOutcomes: deletedOutcomes.count,
      deletedPatterns: deletedPatterns.count
    });
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
