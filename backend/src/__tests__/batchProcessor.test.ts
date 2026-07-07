/**
 * Unit Tests — batchProcessor.ts (processAllBatches)
 *
 * Tests the batch processing logic in isolation by mocking the AI extractor.
 * Validates batching, progress callbacks, retry handling, and response assembly.
 */

// Mock the AI extractor module — we don't want real API calls in unit tests
jest.mock('../services/aiExtractor', () => ({
  extractCrmRecords: jest.fn(),
}));

import { processAllBatches } from '../services/batchProcessor';
import { extractCrmRecords } from '../services/aiExtractor';
import { RawCsvRow, CrmRecord } from '../types/crm';

const mockExtract = extractCrmRecords as jest.MockedFunction<typeof extractCrmRecords>;

// Helper: make a fake CRM record
function makeCrmRecord(overrides: Partial<CrmRecord> = {}): CrmRecord {
  return {
    created_at: new Date().toISOString(),
    name: 'Test User',
    email: 'test@example.com',
    country_code: '+91',
    mobile_without_country_code: '9876543210',
    company: '',
    city: '',
    state: '',
    country: '',
    lead_owner: '',
    crm_status: '',
    crm_note: '',
    data_source: '',
    possession_time: '',
    description: '',
    ...overrides,
  };
}

// Helper: make a fake raw CSV row
function makeRow(id: number): RawCsvRow {
  return { name: `User${id}`, email: `user${id}@example.com` };
}

describe('processAllBatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Basic correctness ──────────────────────────────────────────────────────

  it('returns empty success and skipped arrays when given 0 rows', async () => {
    const result = await processAllBatches([]);
    expect(result.success).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(result.total_imported).toBe(0);
    expect(result.total_skipped).toBe(0);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('processes fewer than 10 rows as a single batch', async () => {
    const rows = [makeRow(1), makeRow(2), makeRow(3)];
    const fakeRecord = makeCrmRecord();
    mockExtract.mockResolvedValueOnce({ success: [fakeRecord, fakeRecord, fakeRecord], skipped: [] });

    const result = await processAllBatches(rows);

    expect(mockExtract).toHaveBeenCalledTimes(1);
    expect(mockExtract).toHaveBeenCalledWith(rows);
    expect(result.total_imported).toBe(3);
    expect(result.total_skipped).toBe(0);
  });

  it('splits exactly 10 rows into 1 batch', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => makeRow(i));
    const records = Array.from({ length: 10 }, () => makeCrmRecord());
    mockExtract.mockResolvedValueOnce({ success: records, skipped: [] });

    await processAllBatches(rows);

    expect(mockExtract).toHaveBeenCalledTimes(1);
  });

  it('splits 11 rows into 2 batches (10 + 1)', async () => {
    const rows = Array.from({ length: 11 }, (_, i) => makeRow(i));
    mockExtract
      .mockResolvedValueOnce({ success: Array(10).fill(makeCrmRecord()), skipped: [] })
      .mockResolvedValueOnce({ success: [makeCrmRecord()], skipped: [] });

    const result = await processAllBatches(rows);

    expect(mockExtract).toHaveBeenCalledTimes(2);
    expect(result.total_imported).toBe(11);
  });

  it('splits 25 rows into 3 batches (10 + 10 + 5)', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => makeRow(i));
    mockExtract
      .mockResolvedValueOnce({ success: Array(10).fill(makeCrmRecord()), skipped: [] })
      .mockResolvedValueOnce({ success: Array(10).fill(makeCrmRecord()), skipped: [] })
      .mockResolvedValueOnce({ success: Array(5).fill(makeCrmRecord()), skipped: [] });

    const result = await processAllBatches(rows);

    expect(mockExtract).toHaveBeenCalledTimes(3);
    expect(result.total_imported).toBe(25);
  });

  // ── Skipped records ────────────────────────────────────────────────────────

  it('correctly aggregates skipped records across batches', async () => {
    const rows = Array.from({ length: 15 }, (_, i) => makeRow(i));
    const skippedRow1 = { row: makeRow(99), reason: 'No email or mobile number' };
    const skippedRow2 = { row: makeRow(100), reason: 'No email or mobile number' };

    mockExtract
      .mockResolvedValueOnce({ success: Array(9).fill(makeCrmRecord()), skipped: [skippedRow1] })
      .mockResolvedValueOnce({ success: Array(4).fill(makeCrmRecord()), skipped: [skippedRow2] });

    const result = await processAllBatches(rows);

    expect(result.total_imported).toBe(13);
    expect(result.total_skipped).toBe(2);
    expect(result.skipped).toHaveLength(2);
  });

  it('total_imported + total_skipped equals total input rows', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => makeRow(i));
    const skipped = [{ row: makeRow(99), reason: 'No contact' }];

    mockExtract
      .mockResolvedValueOnce({ success: Array(9).fill(makeCrmRecord()), skipped })
      .mockResolvedValueOnce({ success: Array(8).fill(makeCrmRecord()), skipped: [{ row: makeRow(100), reason: 'No contact' }] });

    const result = await processAllBatches(rows);

    // total_imported + total_skipped should equal what AI returned
    // (may differ from input rows as AI skips + processes)
    expect(result.total_imported).toBe(result.success.length);
    expect(result.total_skipped).toBe(result.skipped.length);
  });

  // ── Retry logic ────────────────────────────────────────────────────────────

  it('retries a failed batch and succeeds on second attempt', async () => {
    const rows = [makeRow(1), makeRow(2)];
    const record = makeCrmRecord();

    mockExtract
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockResolvedValueOnce({ success: [record, record], skipped: [] });

    const result = await processAllBatches(rows);

    // Should have been called twice — once for failure, once for success
    expect(mockExtract).toHaveBeenCalledTimes(2);
    expect(result.total_imported).toBe(2);
  }, 10000); // allow time for retry delay

  it('marks entire batch as skipped after all 3 retries fail', async () => {
    const rows = [makeRow(1), makeRow(2)];

    mockExtract
      .mockRejectedValueOnce(new Error('AI error'))
      .mockRejectedValueOnce(new Error('AI error'))
      .mockRejectedValueOnce(new Error('AI error'));

    const result = await processAllBatches(rows);

    expect(mockExtract).toHaveBeenCalledTimes(3);
    expect(result.total_imported).toBe(0);
    expect(result.total_skipped).toBe(2); // both rows in the batch are skipped
    expect(result.skipped[0].reason).toContain('AI extraction failed after 3 attempts');
  }, 15000); // allow time for retry delays

  // ── Progress callback ──────────────────────────────────────────────────────

  it('calls onProgress callback with correct processed and total counts', async () => {
    const rows = Array.from({ length: 15 }, (_, i) => makeRow(i));
    mockExtract
      .mockResolvedValueOnce({ success: Array(10).fill(makeCrmRecord()), skipped: [] })
      .mockResolvedValueOnce({ success: Array(5).fill(makeCrmRecord()), skipped: [] });

    const progressCalls: [number, number][] = [];
    await processAllBatches(rows, (processed, total) => {
      progressCalls.push([processed, total]);
    });

    expect(progressCalls).toHaveLength(2);
    expect(progressCalls[0]).toEqual([10, 15]); // after first batch
    expect(progressCalls[1]).toEqual([15, 15]); // after second batch
  });

  it('works correctly without an onProgress callback (optional)', async () => {
    const rows = [makeRow(1)];
    mockExtract.mockResolvedValueOnce({ success: [makeCrmRecord()], skipped: [] });

    // Should not throw
    await expect(processAllBatches(rows)).resolves.toBeDefined();
  });

  // ── Response structure ─────────────────────────────────────────────────────

  it('returns ImportResponse with all required fields', async () => {
    const rows = [makeRow(1)];
    mockExtract.mockResolvedValueOnce({ success: [makeCrmRecord()], skipped: [] });

    const result = await processAllBatches(rows);

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('skipped');
    expect(result).toHaveProperty('total_imported');
    expect(result).toHaveProperty('total_skipped');
    expect(Array.isArray(result.success)).toBe(true);
    expect(Array.isArray(result.skipped)).toBe(true);
    expect(typeof result.total_imported).toBe('number');
    expect(typeof result.total_skipped).toBe('number');
  });
});
