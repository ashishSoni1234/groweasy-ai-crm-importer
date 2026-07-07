import { parse } from 'csv-parse/sync';
import { RawCsvRow } from '../types/crm';

/**
 * Parses a CSV buffer into an array of raw row objects.
 * Handles any column names — no assumptions made.
 */
export function parseCsv(buffer: Buffer): RawCsvRow[] {
  const content = buffer.toString('utf-8');

  const records = parse(content, {
    columns: true,           // first row becomes column headers
    skip_empty_lines: true,  // skip blank rows
    trim: true,              // trim whitespace from values
    relax_column_count: true, // allow rows with different column counts
    bom: true,               // handle BOM (byte order mark) in Excel exports
  }) as RawCsvRow[];

  return records;
}
