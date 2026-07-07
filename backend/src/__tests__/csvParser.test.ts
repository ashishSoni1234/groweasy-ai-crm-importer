/**
 * Unit Tests — csvParser.ts
 *
 * Tests the CSV parsing service: validates it correctly parses various
 * CSV formats, handles BOM, empty lines, extra columns, and edge cases.
 */

import { parseCsv } from '../services/csvParser';

describe('parseCsv', () => {
  // ─── Happy Path ────────────────────────────────────────────────────────────

  it('parses a standard CSV with headers into objects', () => {
    const csv = `name,email,phone\nJohn Doe,john@example.com,9876543210\nJane Doe,jane@example.com,9123456789`;
    const buffer = Buffer.from(csv, 'utf-8');
    const result = parseCsv(buffer);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210',
    });
  });

  it('trims whitespace from values', () => {
    const csv = `name , email\n  Alice  ,  alice@example.com  `;
    const buffer = Buffer.from(csv, 'utf-8');
    const result = parseCsv(buffer);

    expect(result[0].name).toBe('Alice');
    expect(result[0].email).toBe('alice@example.com');
  });

  it('handles CSV with quoted fields containing commas', () => {
    const csv = `name,note\nJohn Doe,"Interested, will call back"`;
    const buffer = Buffer.from(csv, 'utf-8');
    const result = parseCsv(buffer);

    expect(result[0].note).toBe('Interested, will call back');
  });

  it('skips empty lines and returns only data rows', () => {
    const csv = `name,email\nAlice,alice@example.com\n\nBob,bob@example.com\n`;
    const buffer = Buffer.from(csv, 'utf-8');
    const result = parseCsv(buffer);

    expect(result).toHaveLength(2);
  });

  it('handles UTF-8 BOM prefix (common in Excel exports)', () => {
    const csvContent = 'name,email\nAlice,alice@example.com';
    // BOM is EF BB BF in UTF-8
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const buffer = Buffer.concat([bom, Buffer.from(csvContent, 'utf-8')]);
    const result = parseCsv(buffer);

    expect(result).toHaveLength(1);
    // BOM must be stripped from first header key
    expect(Object.keys(result[0])[0]).toBe('name');
  });

  it('returns an empty array for a CSV with only headers and no data rows', () => {
    const csv = `name,email,phone`;
    const buffer = Buffer.from(csv, 'utf-8');
    const result = parseCsv(buffer);

    expect(result).toHaveLength(0);
  });

  it('handles non-standard column names (any CSV format)', () => {
    const csv = `full_name,email_address,contact_number,remarks\nJohn Smith,js@example.com,9000000001,Follow up`;
    const buffer = Buffer.from(csv, 'utf-8');
    const result = parseCsv(buffer);

    expect(result[0]).toHaveProperty('full_name', 'John Smith');
    expect(result[0]).toHaveProperty('email_address', 'js@example.com');
  });

  it('handles rows with different column counts (relax_column_count)', () => {
    const csv = `name,email,phone\nAlice,alice@example.com\nBob,bob@example.com,9000000002`;
    const buffer = Buffer.from(csv, 'utf-8');
    // Should NOT throw — relax_column_count is enabled
    expect(() => parseCsv(buffer)).not.toThrow();
  });

  it('preserves original column names exactly as-is', () => {
    const csv = `First Name,Last Name,E-Mail Address\nJohn,Doe,john@example.com`;
    const buffer = Buffer.from(csv, 'utf-8');
    const result = parseCsv(buffer);

    expect(Object.keys(result[0])).toContain('First Name');
    expect(Object.keys(result[0])).toContain('Last Name');
    expect(Object.keys(result[0])).toContain('E-Mail Address');
  });

  // ─── Edge Cases ────────────────────────────────────────────────────────────

  it('handles CSV with Windows-style line endings (CRLF)', () => {
    const csv = 'name,email\r\nAlice,alice@example.com\r\nBob,bob@example.com';
    const buffer = Buffer.from(csv, 'utf-8');
    const result = parseCsv(buffer);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice');
  });

  it('handles large number of columns correctly', () => {
    const headers = Array.from({ length: 20 }, (_, i) => `col_${i}`).join(',');
    const values = Array.from({ length: 20 }, (_, i) => `val_${i}`).join(',');
    const csv = `${headers}\n${values}`;
    const buffer = Buffer.from(csv, 'utf-8');
    const result = parseCsv(buffer);

    expect(result).toHaveLength(1);
    expect(result[0]['col_0']).toBe('val_0');
    expect(result[0]['col_19']).toBe('val_19');
  });
});
