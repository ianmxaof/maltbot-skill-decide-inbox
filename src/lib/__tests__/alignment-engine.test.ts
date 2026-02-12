import { describe, it, expect } from 'vitest';
import {
  jaccard,
  rateSimilarity,
  hourOverlap,
  computeDimensions,
  computeOverallScore,
  summarizeFingerprint,
  generateAlignmentReason,
} from '@/lib/alignment-engine';
import type { GovernanceFingerprint, AlignmentDimensions } from '@/types/social';

// ─── Helpers ──────────────────────────────────────────────

function makeFingerprint(overrides: Partial<GovernanceFingerprint> = {}): GovernanceFingerprint {
  return {
    pairId: 'pair_test',
    approvalRate: 0.6,
    escalationRate: 0.1,
    ignoreRate: 0.3,
    avgResponseTimeMs: 5000,
    totalDecisions: 20,
    topDomains: ['ai', 'infra'],
    repoLanguages: ['typescript'],
    feedCategories: ['tech'],
    trackedRepoCount: 3,
    trackedFeedCount: 2,
    agentAutonomy: 'moderate',
    riskTolerance: 'moderate',
    focusAreas: ['llm', 'agents'],
    activeHours: [9, 10, 11, 14, 15],
    decisionVelocity: 'deliberate',
    peakDay: 'Tuesday',
    computedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── jaccard ──────────────────────────────────────────────

describe('jaccard', () => {
  it('returns 0 for two empty sets', () => {
    expect(jaccard([], [])).toBe(0);
  });

  it('returns 0 when there is no overlap', () => {
    expect(jaccard(['a', 'b'], ['c', 'd'])).toBe(0);
  });

  it('returns 1 for identical sets', () => {
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1);
  });

  it('returns correct value for partial overlap', () => {
    // intersection = ['a'], union = ['a','b','c'] → 1/3
    expect(jaccard(['a', 'b'], ['a', 'c'])).toBeCloseTo(1 / 3);
  });

  it('handles duplicates in input arrays', () => {
    // Sets: {a,b} and {a,b} → 1
    expect(jaccard(['a', 'a', 'b'], ['b', 'b', 'a'])).toBe(1);
  });
});

// ─── rateSimilarity ───────────────────────────────────────

describe('rateSimilarity', () => {
  it('returns 1 for identical values', () => {
    expect(rateSimilarity(0.5, 0.5)).toBe(1);
  });

  it('returns close to 0 when one value is 0 and the other is large', () => {
    // 1 - |0 - 100| / max(100, 0.001) = 1 - 1 = 0
    expect(rateSimilarity(0, 100)).toBe(0);
  });

  it('is symmetric', () => {
    expect(rateSimilarity(0.3, 0.7)).toBeCloseTo(rateSimilarity(0.7, 0.3));
  });

  it('handles two zeros', () => {
    // 1 - 0 / 0.001 = 1
    expect(rateSimilarity(0, 0)).toBe(1);
  });
});

// ─── hourOverlap ──────────────────────────────────────────

describe('hourOverlap', () => {
  it('returns 0 for two empty arrays', () => {
    expect(hourOverlap([], [])).toBe(0);
  });

  it('returns 0 when no hours overlap', () => {
    expect(hourOverlap([9, 10], [20, 21])).toBe(0);
  });

  it('returns 1 when hours are identical', () => {
    expect(hourOverlap([9, 10, 11], [9, 10, 11])).toBe(1);
  });

  it('returns correct ratio for partial overlap', () => {
    // shared = [10], union = [9,10,11] → 1/3
    expect(hourOverlap([9, 10], [10, 11])).toBeCloseTo(1 / 3);
  });
});

// ─── computeDimensions ───────────────────────────────────

describe('computeDimensions', () => {
  it('produces all-1 dimensions for identical fingerprints', () => {
    const fp = makeFingerprint();
    const dims = computeDimensions(fp, fp);
    expect(dims.contextOverlap).toBe(1);
    expect(dims.decisionSimilarity).toBe(1);
    expect(dims.signalAlignment).toBe(1);
    expect(dims.temporalSync).toBe(1);
  });

  it('produces lower scores for different fingerprints', () => {
    const a = makeFingerprint({
      topDomains: ['ai'],
      feedCategories: ['tech'],
      focusAreas: ['llm'],
      activeHours: [9, 10],
      approvalRate: 0.9,
      escalationRate: 0.05,
      ignoreRate: 0.05,
    });
    const b = makeFingerprint({
      topDomains: ['finance'],
      feedCategories: ['crypto'],
      focusAreas: ['defi'],
      activeHours: [22, 23],
      approvalRate: 0.2,
      escalationRate: 0.5,
      ignoreRate: 0.3,
    });
    const dims = computeDimensions(a, b);
    expect(dims.contextOverlap).toBe(0);
    expect(dims.signalAlignment).toBe(0);
    expect(dims.temporalSync).toBe(0);
    expect(dims.decisionSimilarity).toBeLessThan(0.5);
  });
});

// ─── computeOverallScore ─────────────────────────────────

describe('computeOverallScore', () => {
  it('returns 1 when all dimensions are 1', () => {
    const dims: AlignmentDimensions = {
      contextOverlap: 1,
      decisionSimilarity: 1,
      signalAlignment: 1,
      temporalSync: 1,
    };
    expect(computeOverallScore(dims)).toBeCloseTo(1);
  });

  it('returns 0 when all dimensions are 0', () => {
    const dims: AlignmentDimensions = {
      contextOverlap: 0,
      decisionSimilarity: 0,
      signalAlignment: 0,
      temporalSync: 0,
    };
    expect(computeOverallScore(dims)).toBe(0);
  });

  it('weights contextOverlap (0.35) most heavily', () => {
    const contextOnly: AlignmentDimensions = {
      contextOverlap: 1,
      decisionSimilarity: 0,
      signalAlignment: 0,
      temporalSync: 0,
    };
    const temporalOnly: AlignmentDimensions = {
      contextOverlap: 0,
      decisionSimilarity: 0,
      signalAlignment: 0,
      temporalSync: 1,
    };
    expect(computeOverallScore(contextOnly)).toBeGreaterThan(
      computeOverallScore(temporalOnly)
    );
    expect(computeOverallScore(contextOnly)).toBeCloseTo(0.35);
    expect(computeOverallScore(temporalOnly)).toBeCloseTo(0.10);
  });
});

// ─── summarizeFingerprint ────────────────────────────────

describe('summarizeFingerprint', () => {
  it('labels fast velocity correctly', () => {
    const fp = makeFingerprint({ decisionVelocity: 'fast' });
    const summary = summarizeFingerprint(fp);
    expect(summary.style).toContain('Quick-deciding');
  });

  it('labels batched velocity correctly', () => {
    const fp = makeFingerprint({ decisionVelocity: 'batched' });
    const summary = summarizeFingerprint(fp);
    expect(summary.style).toContain('Batch-processing');
  });

  it('describes focus with domains and repo count', () => {
    const fp = makeFingerprint({
      topDomains: ['ai', 'infra', 'frontend'],
      trackedRepoCount: 5,
    });
    const summary = summarizeFingerprint(fp);
    expect(summary.focus).toContain('ai');
    expect(summary.focus).toContain('5 repos');
  });

  it('returns "Building their context sources" when no domains', () => {
    const fp = makeFingerprint({ topDomains: [], trackedRepoCount: 0 });
    const summary = summarizeFingerprint(fp);
    expect(summary.focus).toBe('Building their context sources');
  });
});

// ─── generateAlignmentReason ─────────────────────────────

describe('generateAlignmentReason', () => {
  it('includes shared domain reason when contextOverlap > 0.5', () => {
    const fp = makeFingerprint({ topDomains: ['ai', 'infra'] });
    const dims: AlignmentDimensions = {
      contextOverlap: 0.8,
      decisionSimilarity: 0,
      signalAlignment: 0,
      temporalSync: 0,
    };
    const reason = generateAlignmentReason(dims, fp, fp);
    expect(reason).toContain('Both track');
  });

  it('includes decision pattern reason when decisionSimilarity > 0.7', () => {
    const fp = makeFingerprint();
    const dims: AlignmentDimensions = {
      contextOverlap: 0,
      decisionSimilarity: 0.9,
      signalAlignment: 0,
      temporalSync: 0,
    };
    const reason = generateAlignmentReason(dims, fp, fp);
    expect(reason).toContain('Similar decision patterns');
  });

  it('returns fallback when no dimension exceeds threshold', () => {
    const fp = makeFingerprint();
    const dims: AlignmentDimensions = {
      contextOverlap: 0.1,
      decisionSimilarity: 0.1,
      signalAlignment: 0.1,
      temporalSync: 0.1,
    };
    const reason = generateAlignmentReason(dims, fp, fp);
    expect(reason).toBe('Overlapping interests and approach');
  });
});
