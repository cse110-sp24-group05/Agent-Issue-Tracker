import { describe, expect, test } from '@jest/globals';
import {
  tokenLevel,
  filterIssues,
  countByStatus,
} from '../../src/js/issue-helpers.js';

// Test tokenLevel
describe('tokenLevel', () => {
  test('returns token-over when 20% remaining', () => {
    expect(tokenLevel(800, 1000)).toBe('token-over');
  });

  test('returns token-over when less exactly 29% remaining', () => {
    expect(tokenLevel(710, 1000)).toBe('token-over');
  });

  test('returns token-over when used exceeds budget', () => {
    expect(tokenLevel(1500, 1000)).toBe('token-over');
  });

  test('returns token-warn when 30% remaining', () => {
    expect(tokenLevel(700, 1000)).toBe('token-warn');
  });

  test('returns token-warn when less exactly 59% remaining', () => {
    expect(tokenLevel(410, 1000)).toBe('token-warn');
  });

  test('returns token-ok when 60% remaining', () => {
    expect(tokenLevel(400, 1000)).toBe('token-ok');
  });

  test('returns token-ok when less exactly 99% remaining', () => {
    expect(tokenLevel(10, 1000)).toBe('token-ok');
  });

  test('returns token-ok when budge is 0', () => {
    expect(tokenLevel(0, 0)).toBe('token-ok');
  });
});

// fake data used across all tests
const mockIssues = [
  {
    id: 'issue-001',
    title: 'Fix login bug',
    status: 'open',
    priority: 'P0',
    assignee: 'Human-only',
    assignee_kind: 'human-only',
  },
  {
    id: 'issue-002',
    title: 'Update navbar',
    status: 'in-progress',
    priority: 'P3',
    assignee: 'Open-to-all',
    assignee_kind: 'open-to-all',
  },
  {
    id: 'issue-003',
    title: 'Fix kanban colors',
    status: 'blocked',
    priority: 'P2',
    assignee: 'AI-only',
    assignee_kind: 'ai-only',
  },
  {
    id: 'issue-004',
    title: 'Write tests',
    status: 'pending-review',
    priority: 'P2',
    assignee: 'Open-to-all',
    assignee_kind: 'open-to-all',
  },
  {
    id: 'issue-005',
    title: 'Deploy to cloudflare',
    status: 'closed',
    priority: 'P1',
    assignee: 'Human-only',
    assignee_kind: 'human-only',
  },
  {
    id: 'issue-006',
    title: 'Fix deployment',
    status: 'closed',
    priority: 'P1',
    assignee: 'AI-only',
    assignee_kind: 'ai-only',
  },
];

// Test filterIssues
describe('filterIssues', () => {
  // Filter by each individual field
  test('filters by status correctly for issue-001', () => {
    const result = filterIssues(mockIssues, 'open', '', '', '');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('issue-001');
  });

  test('filters by priority correctly for issue-003 and issue-004', () => {
    const result = filterIssues(mockIssues, '', 'P2', '', '');
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('issue-003');
    expect(result[1].id).toBe('issue-004');
  });

  test('filters by assignee (open-to-all) correctly for issue-002 and issue-004', () => {
    const result = filterIssues(mockIssues, '', '', 'open-to-all', '');
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('issue-002');
    expect(result[1].id).toBe('issue-004');
  });

  test('filters by assignee (ai-only) correctly for issue-003 and issue-006', () => {
    const result = filterIssues(mockIssues, '', '', 'ai-only', '');
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('issue-003');
    expect(result[1].id).toBe('issue-006');
  });

  test('filters by search correctly for issue-005', () => {
    const result = filterIssues(mockIssues, '', '', '', 'deploy to cloudflare');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('issue-005');
  });

  // Combine filters together
  test('filters by status and priority correctly for issue-005 and issue-006', () => {
    const result = filterIssues(mockIssues, 'closed', 'P1', '', '');
    expect(result.length).toBe(2);
    expect(result[0].assignee).toBe('Human-only');
    expect(result[1].assignee).toBe('AI-only');
  });

  // No filters - returns everything
  test('returns everything when no input filters', () => {
    const result = filterIssues(mockIssues, '', '', '', '');
    expect(result.length).toBe(6);
  });

  // No matches - returns empty
  test('returns empty array when no issues match filter', () => {
    const result = filterIssues(mockIssues, '', '', 'hien123', '');
    expect(result.length).toBe(0);
  });
});

// Test countByStatus
describe('countByStatus', () => {
  test('counts all statuses correctly', () => {
    const result = countByStatus(mockIssues);
    expect(result['open']).toBe(1);
    expect(result['in-progress']).toBe(1);
    expect(result['blocked']).toBe(1);
    expect(result['pending-review']).toBe(1);
    expect(result['closed']).toBe(2);
  });

  test('returns zero for all statuses when no issues ', () => {
    const result = countByStatus([]);
    expect(result['open']).toBe(0);
    expect(result['in-progress']).toBe(0);
    expect(result['blocked']).toBe(0);
    expect(result['pending-review']).toBe(0);
    expect(result['closed']).toBe(0);
  });
});
