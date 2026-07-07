'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export default function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setError('Please upload a valid CSV file.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB.');
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-300 group
          ${
            isDragging
              ? 'border-violet-400 bg-violet-500/10 scale-[1.02] shadow-lg shadow-violet-500/20'
              : 'border-white/20 bg-white/5 hover:border-violet-400/50 hover:bg-white/10'
          }
        `}
        onClick={() => document.getElementById('csv-file-input')?.click()}
      >
        {/* Animated background glow */}
        <div
          className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none
          bg-gradient-to-br from-violet-500/5 to-indigo-500/5 
          ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        />

        <input
          id="csv-file-input"
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center gap-4 relative z-10">
          {/* Icon */}
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isDragging ? 'bg-violet-500/30 scale-110' : 'bg-white/10 group-hover:bg-violet-500/20'}`}
          >
            {isDragging ? (
              <FileText className="w-10 h-10 text-violet-400" />
            ) : (
              <Upload className="w-10 h-10 text-slate-400 group-hover:text-violet-400 transition-colors duration-300" />
            )}
          </div>

          {/* Text */}
          <div>
            <p className="text-xl font-semibold text-white mb-1">
              {isDragging ? 'Drop your CSV here' : 'Upload your CSV file'}
            </p>
            <p className="text-slate-400 text-sm">
              Drag & drop or{' '}
              <span className="text-violet-400 font-medium underline underline-offset-2">
                browse files
              </span>
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Supports any CSV format — Facebook Leads, Google Ads, Excel exports, etc.
            </p>
          </div>

          {/* Supported formats */}
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {['Facebook Leads', 'Google Ads', 'Excel CSV', 'Real Estate CRM', 'Custom'].map(
              (format) => (
                <span
                  key={format}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400"
                >
                  {format}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
