'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import UploadZone from '@/components/UploadZone';
import PreviewTable from '@/components/PreviewTable';
import ProcessingView from '@/components/ProcessingView';
import ResultsTable from '@/components/ResultsTable';
import { ImportStep, ImportResponse } from '@/types/crm';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'preview', label: 'Preview' },
  { id: 'processing', label: 'AI Processing' },
  { id: 'results', label: 'Results' },
] as const;

export default function HomePage() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: User selects a file → parse it client-side for preview
  const handleFileSelect = useCallback((selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError('The CSV file appears to be empty or has no data rows.');
          return;
        }
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvRows(results.data);
        setStep('preview');
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  // Step 3: User confirms → call backend API
  const handleConfirmImport = useCallback(async () => {
    if (!file) return;

    setStep('processing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BACKEND_URL}/api/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ImportResponse = await response.json();
      setImportResult(result);
      setStep('results');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to backend.';
      setError(message);
      setStep('preview'); // Go back to preview on error
    }
  }, [file]);

  // Reset everything → go back to upload
  const handleReset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setImportResult(null);
    setError(null);
  }, []);

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <main className="min-h-screen bg-[#080B14] text-white">
      {/* Ambient background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] left-[-5%] w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-indigo-300 bg-clip-text text-transparent">
              GrowEasy CRM Importer
            </h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Upload any CSV file — AI intelligently maps your data to GrowEasy CRM format
            using <span className="text-violet-400 font-medium">Llama 3.3</span>
          </p>
        </header>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-0">
            {STEPS.map((s, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={s.id} className="flex items-center">
                  {/* Step circle */}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-500
                        ${
                          isCompleted
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                            : isCurrent
                            ? 'bg-violet-500/20 border-2 border-violet-500 text-violet-400 shadow-lg shadow-violet-500/20'
                            : 'bg-white/5 border border-white/10 text-slate-500'
                        }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs font-medium transition-colors duration-300 ${
                        isCurrent ? 'text-violet-400' : isCompleted ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {/* Connector line */}
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`w-16 sm:w-24 h-0.5 mx-2 mb-4 transition-all duration-500 rounded-full
                        ${idx < currentStepIndex ? 'bg-violet-600' : 'bg-white/10'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-medium text-sm">Error</p>
              <p className="text-red-300/80 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {/* Step 1: Upload */}
          {step === 'upload' && <UploadZone onFileSelect={handleFileSelect} />}

          {/* Step 2: Preview */}
          {step === 'preview' && file && csvRows.length > 0 && (
            <PreviewTable
              fileName={file.name}
              headers={csvHeaders}
              rows={csvRows}
              onConfirm={handleConfirmImport}
              onReset={handleReset}
            />
          )}

          {/* Step 3: AI Processing */}
          {step === 'processing' && <ProcessingView totalRows={csvRows.length} />}

          {/* Step 4: Results */}
          {step === 'results' && importResult && (
            <ResultsTable
              success={importResult.success}
              skipped={importResult.skipped}
              totalImported={importResult.total_imported}
              totalSkipped={importResult.total_skipped}
              onReset={handleReset}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 text-slate-600 text-sm">
          <p>
            Powered by{' '}
            <span className="text-violet-500/70">Llama 3.3 70B</span> via Groq ·{' '}
            Built for <span className="text-violet-500/70">GrowEasy</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
