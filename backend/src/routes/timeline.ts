import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { trackTimelineAdvanced } from '../telemetry';
import { generateOutcomes } from '../services/demo/outcomeGenerator';
import { runIntegratedPatternDiscovery, runEnhancedMultiModelDiscovery } from '../services/demo/integratedPatternDiscovery';

const router = Router();
const prisma = new PrismaClient();

// Helper function to extract context fields from snapshots
function extractContextFields(socialSnapshot: any, clinicalSnapshot: any): Record<string, any> {
  const ctx: Record<string, any> = {}
  
  if (socialSnapshot) {
    ctx.caregiver_relationship = socialSnapshot.caregiver_relationship
    ctx.caregiver_medical_background = socialSnapshot.caregiver_medical_background
    ctx.caregiver_proximity_minutes = socialSnapshot.caregiver_proximity_minutes
    ctx.caregiver_availability = socialSnapshot.caregiver_availability
    ctx.caregiver_age = socialSnapshot.caregiver_age
    ctx.caregiver_health_status = socialSnapshot.caregiver_health_status
    ctx.caregiver_override = socialSnapshot.caregiver_override
    ctx.living_situation = socialSnapshot.living_situation
    ctx.has_caregiver = socialSnapshot.has_caregiver
    ctx.has_transportation = socialSnapshot.has_transportation
    ctx.patient_stated_preference = socialSnapshot.patient_stated_preference
  }
  
  if (clinicalSnapshot) {
    ctx.readmit_count_12m = clinicalSnapshot.readmit_count_12m
    ctx.adl_score = clinicalSnapshot.adl_score
    ctx.los_at_decision = clinicalSnapshot.los_at_decision
    ctx.age = clinicalSnapshot.age
  }
  
  return ctx
}

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
    
    // 2. Run pattern discovery on accumulated data
    // Month 4: Run candidate discovery (early signals with relaxed thresholds)
    // Month 5+: Run full statistical discovery
    // Month 6+: Run enhanced multi-model AI discovery with domain specialization
    let newPatterns: any[] = [];
    let multiModelResults: any = null;
    
    if (newMonth === 4) {
      // Month 4: Candidate pattern discovery (early signals)
      console.log(`[Timeline] Running CANDIDATE pattern discovery for month ${newMonth}...`);
      console.log(`[Timeline] Looking for early pattern signals with relaxed thresholds...`);
      newPatterns = await runIntegratedPatternDiscovery(newMonth);
    } else if (newMonth === 5) {
      // Month 5: Full statistical discovery (emerging patterns)
      console.log(`[Timeline] Running EMERGING pattern discovery for month ${newMonth}...`);
      newPatterns = await runIntegratedPatternDiscovery(newMonth);
    } else if (newMonth >= 6) {
      // Month 6+: Enhanced multi-model AI discovery with domain specialization
      // This uses 4 AI models in parallel with devil's advocate validation
      console.log(`[Timeline] Running ENHANCED MULTI-MODEL pattern discovery for month ${newMonth}...`);
      console.log(`[Timeline] This may take up to 2 minutes as we consult multiple AI models...`);
      
      // First run statistical discovery
      newPatterns = await runIntegratedPatternDiscovery(newMonth);
      
      // Then run enhanced multi-model discovery (if we have enough data)
      try {
        const outcomes = await prisma.dCG_Outcome.findMany({
          where: { data_month: { lte: newMonth } },
          include: {
            trace: {
              include: {
                social_snapshot: true,
                clinical_snapshot: true
              }
            }
          }
        });
        
        if (outcomes.length >= 100) {
          // Transform to decision context format
          const decisions = outcomes.map(o => ({
            id: o.trace_id,
            outcome: o.outcome_success,
            context: extractContextFields(o.trace.social_snapshot, o.trace.clinical_snapshot)
          }));
          
          const baselineSuccessRate = decisions.filter(d => d.outcome).length / decisions.length;
          
          console.log(`[Timeline] Running multi-model AI analysis on ${decisions.length} decisions...`);
          multiModelResults = await runEnhancedMultiModelDiscovery(decisions, baselineSuccessRate, newMonth);
          
          console.log(`[Timeline] Multi-model discovery found ${multiModelResults.patterns.length} additional AI-validated patterns`);
        }
      } catch (error) {
        console.error('[Timeline] Enhanced multi-model discovery failed:', error);
        // Continue with statistical patterns even if multi-model fails
      }
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
