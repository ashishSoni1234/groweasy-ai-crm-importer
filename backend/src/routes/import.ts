import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseCsv } from '../services/csvParser';
import { processAllBatches } from '../services/batchProcessor';

const router = Router();

// Store uploaded files in memory (no disk writes needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Only allow CSV files
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * POST /api/import
 * 
 * Accepts a CSV file upload, parses it, sends rows through AI extraction
 * in batches, and returns structured CRM records.
 * 
 * Body: multipart/form-data with field "file" (CSV file)
 * 
 * Response: ImportResponse JSON
 */
router.post(
  '/import',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate that a file was uploaded
      if (!req.file) {
        res.status(400).json({
          error: 'No file uploaded. Please upload a CSV file.',
        });
        return;
      }

      console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

      // Step 1: Parse the CSV into raw rows
      let rawRows;
      try {
        rawRows = parseCsv(req.file.buffer);
      } catch (parseError) {
        res.status(400).json({
          error: `Failed to parse CSV: ${parseError instanceof Error ? parseError.message : 'Invalid CSV format'}`,
        });
        return;
      }

      if (rawRows.length === 0) {
        res.status(400).json({
          error: 'The uploaded CSV file is empty or has no data rows.',
        });
        return;
      }

      console.log(`Parsed ${rawRows.length} rows from CSV`);

      // Step 2: Process all rows through AI extraction in batches
      const result = await processAllBatches(rawRows, (processed, total) => {
        console.log(`Progress: ${processed}/${total} rows processed`);
      });

      console.log(
        `Import complete: ${result.total_imported} imported, ${result.total_skipped} skipped`
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
);

/**
 * GET /api/health
 * Health check endpoint for monitoring and Docker health checks
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    model: 'llama-3.3-70b-versatile',
  });
});

export default router;
