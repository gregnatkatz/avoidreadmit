import { PrismaClient } from '@prisma/client';
import { MONTH_LABELS, COST_PER_READMISSION, MONTHLY_DECISIONS } from './constants';

export async function seedMetrics(prisma: PrismaClient) {
  // Monthly metrics showing realistic/sporadic improvement over 9 months (April - December 2025)
  // Real-world data has anomalies, odd numbers, and non-linear patterns
  const metrics = [
    {
      month_number: 1,
      month_label: MONTH_LABELS[0], // April 2025
      total_decisions: 2847,  // Not exactly 3000 - some incomplete records
      decisions_with_context_match: 23,  // Pre-launch baseline - minimal adoption
      total_with_outcomes: 2341,
      successes: 1472,
      readmissions: 421,
      readmission_rate: 0.1798,  // 17.98%
      success_rate: 0.629,
      with_rich_context_success_rate: 0.713,
      without_rich_context_success_rate: 0.547,
      context_lift: 0.166,
      policy_followed_count: 2489,
      policy_followed_success: 0.647,
      exception_taken_count: 512,
      exception_taken_success: 0.473,
      active_patterns: 0,
      new_patterns: 0,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 0,
      savings_this_month: 0,
      cumulative_savings: 0
    },
    {
      month_number: 2,
      month_label: MONTH_LABELS[1], // May 2025
      total_decisions: 2923,
      decisions_with_context_match: 41,  // Initial rollout - team learning
      total_with_outcomes: 2387,
      successes: 1521,
      readmissions: 417,
      readmission_rate: 0.1747,
      success_rate: 0.637,
      with_rich_context_success_rate: 0.732,
      without_rich_context_success_rate: 0.551,
      context_lift: 0.181,
      policy_followed_count: 2534,
      policy_followed_success: 0.658,
      exception_taken_count: 489,
      exception_taken_success: 0.487,
      active_patterns: 0,
      new_patterns: 0,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 7,
      savings_this_month: 106400,
      cumulative_savings: 106400
    },
    {
      month_number: 3,
      month_label: MONTH_LABELS[2], // June 2025
      total_decisions: 3012,  // Slightly over target
      decisions_with_context_match: 49,  // Slow growth, some resistance
      total_with_outcomes: 2456,
      successes: 1587,
      readmissions: 423,  // Slight uptick - summer staffing issues
      readmission_rate: 0.1722,
      success_rate: 0.646,
      with_rich_context_success_rate: 0.751,
      without_rich_context_success_rate: 0.543,
      context_lift: 0.208,
      policy_followed_count: 2567,
      policy_followed_success: 0.671,
      exception_taken_count: 445,
      exception_taken_success: 0.509,
      active_patterns: 0,
      new_patterns: 0,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 11,
      savings_this_month: 167200,
      cumulative_savings: 273600
    },
    {
      month_number: 4,
      month_label: MONTH_LABELS[3], // July 2025
      total_decisions: 2891,
      decisions_with_context_match: 83,  // Gaining traction
      total_with_outcomes: 2478,
      successes: 1659,
      readmissions: 398,
      readmission_rate: 0.1606,
      success_rate: 0.669,
      with_rich_context_success_rate: 0.784,
      without_rich_context_success_rate: 0.549,
      context_lift: 0.235,
      policy_followed_count: 2589,
      policy_followed_success: 0.693,
      exception_taken_count: 402,
      exception_taken_success: 0.537,
      active_patterns: 0,
      new_patterns: 0,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 31,
      savings_this_month: 471200,
      cumulative_savings: 744800
    },
    {
      month_number: 5,
      month_label: MONTH_LABELS[4], // August 2025
      total_decisions: 3067,
      decisions_with_context_match: 163,  // First patterns discovered - big jump!
      total_with_outcomes: 2512,
      successes: 1753,
      readmissions: 387,
      readmission_rate: 0.1541,
      success_rate: 0.698,
      with_rich_context_success_rate: 0.817,
      without_rich_context_success_rate: 0.552,
      context_lift: 0.265,
      policy_followed_count: 2623,
      policy_followed_success: 0.724,
      exception_taken_count: 389,
      exception_taken_success: 0.568,
      active_patterns: 2,
      new_patterns: 2,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 57,
      savings_this_month: 866400,
      cumulative_savings: 1611200
    },
    {
      month_number: 6,
      month_label: MONTH_LABELS[5], // September 2025
      total_decisions: 2934,
      decisions_with_context_match: 138,  // Slight dip - Labor Day staffing, some skepticism
      total_with_outcomes: 2489,
      successes: 1768,
      readmissions: 371,
      readmission_rate: 0.1491,
      success_rate: 0.710,
      with_rich_context_success_rate: 0.823,
      without_rich_context_success_rate: 0.548,
      context_lift: 0.275,
      policy_followed_count: 2612,
      policy_followed_success: 0.738,
      exception_taken_count: 377,
      exception_taken_success: 0.584,
      active_patterns: 5,
      new_patterns: 3,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 73,
      savings_this_month: 1109600,
      cumulative_savings: 2720800
    },
    {
      month_number: 7,
      month_label: MONTH_LABELS[6], // October 2025
      total_decisions: 3124,
      decisions_with_context_match: 319,  // Major breakthrough - new pattern + training
      total_with_outcomes: 2547,
      successes: 1931,
      readmissions: 352,
      readmission_rate: 0.1382,
      success_rate: 0.758,
      with_rich_context_success_rate: 0.841,
      without_rich_context_success_rate: 0.553,
      context_lift: 0.288,
      policy_followed_count: 2678,
      policy_followed_success: 0.779,
      exception_taken_count: 346,
      exception_taken_success: 0.647,
      active_patterns: 9,
      new_patterns: 4,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 98,
      savings_this_month: 1489600,
      cumulative_savings: 4210400
    },
    {
      month_number: 8,
      month_label: MONTH_LABELS[7], // November 2025
      total_decisions: 2876,  // Thanksgiving week dip
      decisions_with_context_match: 467,  // Sustained growth despite lower volume
      total_with_outcomes: 2523,
      successes: 1989,
      readmissions: 341,
      readmission_rate: 0.1352,
      success_rate: 0.788,
      with_rich_context_success_rate: 0.852,
      without_rich_context_success_rate: 0.551,
      context_lift: 0.301,
      policy_followed_count: 2687,
      policy_followed_success: 0.812,
      exception_taken_count: 313,
      exception_taken_success: 0.671,
      active_patterns: 12,
      new_patterns: 3,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 121,
      savings_this_month: 1839200,
      cumulative_savings: 6049600
    },
    {
      month_number: 9,
      month_label: MONTH_LABELS[8], // December 2025
      total_decisions: 2789,  // Holiday season - lower volume
      decisions_with_context_match: 612,  // High adoption rate despite lower volume
      total_with_outcomes: 2534,
      successes: 2073,
      readmissions: 327,
      readmission_rate: 0.1290,
      success_rate: 0.818,
      with_rich_context_success_rate: 0.867,
      without_rich_context_success_rate: 0.549,
      context_lift: 0.318,
      policy_followed_count: 2698,
      policy_followed_success: 0.837,
      exception_taken_count: 291,
      exception_taken_success: 0.698,
      active_patterns: 15,
      new_patterns: 3,
      cost_per_readmission: COST_PER_READMISSION,
      readmissions_avoided: 139,
      savings_this_month: 2112800,
      cumulative_savings: 8162400
    }
  ];

  await prisma.dCG_MonthlyMetrics.createMany({ data: metrics });
  console.log('Created monthly metrics for 9 months');
}
