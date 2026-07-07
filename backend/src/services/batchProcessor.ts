import { extractCrmRecords } from './aiExtractor';
import { RawCsvRow, CrmRecord, BatchExtractionResult, ImportResponse } from '../types/crm';

const BATCH_SIZE = 10;          // rows per AI call
const MAX_RETRIES = 3;          // max retry attempts for a failed batch
const RETRY_DELAY_MS = 1000;    // base delay for exponential backoff

/**
 * Sleep utility for exponential backoff between retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processes a single batch of rows with retry logic and exponential backoff.
 * If all retries fail, the entire batch is marked as skipped.
 */
async function processBatchWithRetry(
  batch: RawCsvRow[],
  batchIndex: number
): Promise<BatchExtractionResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Batch ${batchIndex + 1}: Attempt ${attempt}/${MAX_RETRIES}`);
      const result = await extractCrmRecords(batch);
      console.log(
        `Batch ${batchIndex + 1}: ✓ ${result.success.length} extracted, ${result.skipped.length} skipped`
      );
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `Batch ${batchIndex + 1}: Attempt ${attempt} failed — ${lastError.message}`
      );

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.log(`Batch ${batchIndex + 1}: Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted — skip the entire batch
  console.error(`Batch ${batchIndex + 1}: All ${MAX_RETRIES} attempts failed. Skipping batch.`);
  return {
    success: [],
    skipped: batch.map((row) => ({
      row,
      reason: `AI extraction failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`,
    })),
  };
}

/**
 * Main batch processor — splits all rows into batches and processes each one.
 * Emits progress callbacks so the frontend can track processing status.
 */
export async function processAllBatches(
  rows: RawCsvRow[],
  onProgress?: (processed: number, total: number) => void
): Promise<ImportResponse> {
  const allSuccess: CrmRecord[] = [];
  const allSkipped: ImportResponse['skipped'] = [];

  // Split into batches of BATCH_SIZE
  const batches: RawCsvRow[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${rows.length} rows in ${batches.length} batches of ${BATCH_SIZE}`);

  let processedCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const result = await processBatchWithRetry(batch, i);

    allSuccess.push(...result.success);
    allSkipped.push(...result.skipped);

    processedCount += batch.length;
    onProgress?.(processedCount, rows.length);
  }

  return {
    success: allSuccess,
    skipped: allSkipped,
    total_imported: allSuccess.length,
    total_skipped: allSkipped.length,
  };
}
