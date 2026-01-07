import { PrismaClient } from '@prisma/client';
import { MONTH_LABELS, COST_PER_READMISSION, MONTHLY_DECISIONS } from './constants';

export async function seedMetrics(prisma: PrismaClient) {
  // Monthly metrics showing realistic/sporadic improvement over 6 months
  // Real-world insights don't grow linearly - some months have breakthroughs, others plateau
  const metrics = [
    {
      month_number: 1,
      month_label: MONTH_LABELS[0],
      total_decisions: MONTHLY_DECISIONS,
      decisions_with_context_match: 38,  // Initial baseline - just starting
      total_with_outcomes: 2400,
      successes: 1560,
      readmissions: 413,
      readmission_rate: 0.172,
      success_rate: 0.65,
      with_rich_context_success_rate: 0.76,
      without_rich_context_success_rate: 0.55,
      context_lift: 0.21,
      policy_followed_count: 2550,
      policy_followed_success: 0.68,
      exception_taken_count: 450,
      exception_taken_success: 0.52,
      active_patterns: 0,
      new_patterns: 0,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 0,
      savings_this_month: 0,
      cumulative_savings: 0
    },
    {
      month_number: 2,
      month_label: MONTH_LABELS[1],
      total_decisions: MONTHLY_DECISIONS,
      decisions_with_context_match: 87,  // Slow growth as team learns system
      total_with_outcomes: 2450,
      successes: 1642,
      readmissions: 408,
      readmission_rate: 0.167,
      success_rate: 0.67,
      with_rich_context_success_rate: 0.79,
      without_rich_context_success_rate: 0.55,
      context_lift: 0.24,
      policy_followed_count: 2570,
      policy_followed_success: 0.69,
      exception_taken_count: 430,
      exception_taken_success: 0.53,
      active_patterns: 0,
      new_patterns: 0,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 12,
      savings_this_month: 182400,
      cumulative_savings: 182400
    },
    {
      month_number: 3,
      month_label: MONTH_LABELS[2],
      total_decisions: MONTHLY_DECISIONS,
      decisions_with_context_match: 156,  // First pattern discovered - big jump!
      total_with_outcomes: 2480,
      successes: 1736,
      readmissions: 397,
      readmission_rate: 0.160,
      success_rate: 0.70,
      with_rich_context_success_rate: 0.81,
      without_rich_context_success_rate: 0.55,
      context_lift: 0.26,
      policy_followed_count: 2600,
      policy_followed_success: 0.72,
      exception_taken_count: 400,
      exception_taken_success: 0.56,
      active_patterns: 2,
      new_patterns: 2,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 38,
      savings_this_month: 577600,
      cumulative_savings: 760000
    },
    {
      month_number: 4,
      month_label: MONTH_LABELS[3],
      total_decisions: MONTHLY_DECISIONS,
      decisions_with_context_match: 142,  // Slight dip - holiday staffing, some skepticism
      total_with_outcomes: 2500,
      successes: 1775,
      readmissions: 388,
      readmission_rate: 0.155,
      success_rate: 0.71,
      with_rich_context_success_rate: 0.82,
      without_rich_context_success_rate: 0.55,
      context_lift: 0.27,
      policy_followed_count: 2620,
      policy_followed_success: 0.74,
      exception_taken_count: 380,
      exception_taken_success: 0.58,
      active_patterns: 2,
      new_patterns: 0,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 51,
      savings_this_month: 775200,
      cumulative_savings: 1535200
    },
    {
      month_number: 5,
      month_label: MONTH_LABELS[4],
      total_decisions: MONTHLY_DECISIONS,
      decisions_with_context_match: 312,  // Major breakthrough - new pattern + training
      total_with_outcomes: 2520,
      successes: 1915,
      readmissions: 366,
      readmission_rate: 0.145,
      success_rate: 0.76,
      with_rich_context_success_rate: 0.84,
      without_rich_context_success_rate: 0.55,
      context_lift: 0.29,
      policy_followed_count: 2660,
      policy_followed_success: 0.78,
      exception_taken_count: 340,
      exception_taken_success: 0.64,
      active_patterns: 4,
      new_patterns: 2,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 81,
      savings_this_month: 1231200,
      cumulative_savings: 2766400
    },
    {
      month_number: 6,
      month_label: MONTH_LABELS[5],
      total_decisions: MONTHLY_DECISIONS,
      decisions_with_context_match: 478,  // Sustained growth, system maturity
      total_with_outcomes: 2550,
      successes: 2015,
      readmissions: 351,
      readmission_rate: 0.138,
      success_rate: 0.79,
      with_rich_context_success_rate: 0.85,
      without_rich_context_success_rate: 0.55,
      context_lift: 0.30,
      policy_followed_count: 2690,
      policy_followed_success: 0.81,
      exception_taken_count: 310,
      exception_taken_success: 0.67,
      active_patterns: 5,
      new_patterns: 1,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 104,
      savings_this_month: 1580800,
      cumulative_savings: 4347200
    }
  ];

  await prisma.dCG_MonthlyMetrics.createMany({ data: metrics });
  console.log('Created monthly metrics');
}
