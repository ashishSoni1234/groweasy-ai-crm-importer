/**
 * Unit Tests — aiExtractor.ts (validateCrmRecord + buildUserMessage)
 *
 * Tests the core validation and message-building logic used by the AI extractor.
 * These are the most critical functions — they enforce all business rules from
 * the assignment (enum values, skip logic, date handling, multi-email/phone).
 */

import { validateCrmRecord, buildUserMessage } from '../services/aiExtractor';
import { CrmRecord } from '../types/crm';

// ─── validateCrmRecord ─────────────────────────────────────────────────────

describe('validateCrmRecord', () => {
  const validBase: Partial<CrmRecord> = {
    created_at: '2026-05-13T14:20:48.000Z',
    name: 'John Doe',
    email: 'john@example.com',
    country_code: '+91',
    mobile_without_country_code: '9876543210',
    company: 'GrowEasy',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    lead_owner: 'agent@groweasy.com',
    crm_status: 'GOOD_LEAD_FOLLOW_UP',
    crm_note: 'Follow up next week',
    data_source: 'sarjapur_plots',
    possession_time: '',
    description: '',
  };

  // ── CRM Status validation ──────────────────────────────────────────────────

  it('accepts all 4 valid crm_status values', () => {
    const statuses: CrmRecord['crm_status'][] = [
      'GOOD_LEAD_FOLLOW_UP',
      'DID_NOT_CONNECT',
      'BAD_LEAD',
      'SALE_DONE',
    ];
    for (const status of statuses) {
      const result = validateCrmRecord({ ...validBase, crm_status: status });
      expect(result.crm_status).toBe(status);
    }
  });

  it('strips invalid crm_status values to empty string', () => {
    const invalidStatuses = ['INTERESTED', 'CLOSED', 'PENDING', 'hot_lead', 'follow_up'];
    for (const status of invalidStatuses) {
      const result = validateCrmRecord({ ...validBase, crm_status: status as any });
      expect(result.crm_status).toBe('');
    }
  });

  it('returns empty string for missing crm_status', () => {
    const result = validateCrmRecord({ ...validBase, crm_status: undefined });
    expect(result.crm_status).toBe('');
  });

  // ── Data Source validation ─────────────────────────────────────────────────

  it('accepts all 5 valid data_source values', () => {
    const sources: CrmRecord['data_source'][] = [
      'leads_on_demand',
      'meridian_tower',
      'eden_park',
      'varah_swamy',
      'sarjapur_plots',
    ];
    for (const source of sources) {
      const result = validateCrmRecord({ ...validBase, data_source: source });
      expect(result.data_source).toBe(source);
    }
  });

  it('strips invalid data_source values to empty string', () => {
    const invalid = ['facebook', 'google_ads', 'linkedin', 'referral', 'unknown_source'];
    for (const src of invalid) {
      const result = validateCrmRecord({ ...validBase, data_source: src as any });
      expect(result.data_source).toBe('');
    }
  });

  it('returns empty string for missing data_source', () => {
    const result = validateCrmRecord({ ...validBase, data_source: undefined });
    expect(result.data_source).toBe('');
  });

  // ── Date handling (core bug fix) ───────────────────────────────────────────

  it('accepts a valid ISO 8601 created_at date', () => {
    const result = validateCrmRecord({ ...validBase, created_at: '2026-05-13T14:20:48.000Z' });
    expect(new Date(result.created_at).toISOString()).toBe('2026-05-13T14:20:48.000Z');
  });

  it('accepts a valid YYYY-MM-DD date and converts to ISO', () => {
    const result = validateCrmRecord({ ...validBase, created_at: '2026-05-13' });
    expect(() => new Date(result.created_at)).not.toThrow();
    expect(new Date(result.created_at).getFullYear()).toBe(2026);
  });

  it('replaces empty created_at with today\'s ISO date (not a hallucinated past date)', () => {
    const before = Date.now();
    const result = validateCrmRecord({ ...validBase, created_at: '' });
    const after = Date.now();
    const resultTime = new Date(result.created_at).getTime();

    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });

  it('replaces missing created_at with today\'s ISO date', () => {
    const before = Date.now();
    const result = validateCrmRecord({ ...validBase, created_at: undefined });
    const after = Date.now();
    const resultTime = new Date(result.created_at).getTime();

    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });

  it('replaces invalid date string with today\'s date (not hallucination)', () => {
    const before = Date.now();
    const result = validateCrmRecord({ ...validBase, created_at: 'not-a-date' });
    const after = Date.now();
    const resultTime = new Date(result.created_at).getTime();

    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });

  it('NEVER returns a fabricated past date (2024-03-16 regression test)', () => {
    // This was the specific hallucinated date found in audit testing
    const hallucinated = '2024-03-16T00:00:00.000Z';
    const result = validateCrmRecord({ ...validBase, created_at: undefined });
    expect(result.created_at).not.toBe(hallucinated);
  });

  // ── String fields fallback to empty string ─────────────────────────────────

  it('falls back all string fields to empty string when undefined', () => {
    const result = validateCrmRecord({});
    expect(result.name).toBe('');
    expect(result.email).toBe('');
    expect(result.country_code).toBe('');
    expect(result.mobile_without_country_code).toBe('');
    expect(result.company).toBe('');
    expect(result.city).toBe('');
    expect(result.state).toBe('');
    expect(result.country).toBe('');
    expect(result.lead_owner).toBe('');
    expect(result.crm_note).toBe('');
    expect(result.possession_time).toBe('');
    expect(result.description).toBe('');
  });

  it('returns a CrmRecord with all 15 required fields', () => {
    const result = validateCrmRecord(validBase);
    const required = [
      'created_at', 'name', 'email', 'country_code',
      'mobile_without_country_code', 'company', 'city', 'state',
      'country', 'lead_owner', 'crm_status', 'crm_note',
      'data_source', 'possession_time', 'description',
    ] as const;
    for (const field of required) {
      expect(result).toHaveProperty(field as string);
    }
  });

  it('preserves valid data correctly (no data loss)', () => {
    const result = validateCrmRecord(validBase);
    expect(result.name).toBe('John Doe');
    expect(result.email).toBe('john@example.com');
    expect(result.country_code).toBe('+91');
    expect(result.mobile_without_country_code).toBe('9876543210');
    expect(result.company).toBe('GrowEasy');
    expect(result.city).toBe('Mumbai');
    expect(result.state).toBe('Maharashtra');
    expect(result.country).toBe('India');
    expect(result.lead_owner).toBe('agent@groweasy.com');
    expect(result.crm_status).toBe('GOOD_LEAD_FOLLOW_UP');
    expect(result.crm_note).toBe('Follow up next week');
    expect(result.data_source).toBe('sarjapur_plots');
  });
});

// ─── buildUserMessage ──────────────────────────────────────────────────────

describe('buildUserMessage', () => {
  it('includes the correct row count in the message', () => {
    const rows = [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ];
    const message = buildUserMessage(rows);
    expect(message).toContain('2 CSV rows');
  });

  it('includes all available column names in the message', () => {
    const rows = [{ full_name: 'Alice', email_address: 'alice@test.com', phone_number: '9999' }];
    const message = buildUserMessage(rows);
    expect(message).toContain('full_name');
    expect(message).toContain('email_address');
    expect(message).toContain('phone_number');
  });

  it('includes the JSON-serialized row data', () => {
    const rows = [{ name: 'Test User', email: 'test@example.com' }];
    const message = buildUserMessage(rows);
    expect(message).toContain('Test User');
    expect(message).toContain('test@example.com');
  });

  it('handles an empty rows array gracefully', () => {
    const message = buildUserMessage([]);
    expect(message).toContain('0 CSV rows');
    expect(message).toContain('Available columns:');
  });

  it('handles rows with special characters and commas in values', () => {
    const rows = [{ note: 'Interested, will callback', name: 'O\'Brien' }];
    const message = buildUserMessage(rows);
    expect(message).toContain('Interested, will callback');
    expect(message).toContain("O'Brien");
  });
});
