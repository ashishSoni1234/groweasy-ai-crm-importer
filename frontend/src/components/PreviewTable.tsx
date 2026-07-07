'use client';

import { useEffect, useRef } from 'react';
import { FileText, X, ChevronRight } from 'lucide-react';

interface PreviewTableProps {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  onConfirm: () => void;
  onReset: () => void;
}

export default function PreviewTable({
  fileName,
  headers,
  rows,
  onConfirm,
  onReset,
}: PreviewTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  // Animate table in on mount
  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.style.opacity = '0';
      tableRef.current.style.transform = 'translateY(10px)';
      requestAnimationFrame(() => {
        if (tableRef.current) {
          tableRef.current.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          tableRef.current.style.opacity = '1';
          tableRef.current.style.transform = 'translateY(0)';
        }
      });
    }
  }, []);

  const displayRows = rows.slice(0, 100); // show up to 100 rows in preview

  return (
    <div ref={tableRef} className="w-full space-y-4">
      {/* File info bar */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-500/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">{fileName}</p>
            <p className="text-slate-400 text-xs">
              {rows.length} rows · {headers.length} columns
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all duration-200"
          title="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* CSV Preview Table */}
      <div className="relative rounded-xl border border-white/10 overflow-hidden bg-white/3">
        <div className="overflow-x-auto overflow-y-auto max-h-[420px]">
          <table className="w-full text-sm border-collapse min-w-max">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-900/95 backdrop-blur-sm border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-12 border-r border-white/5">
                  #
                </th>
                {headers.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap border-r border-white/5 last:border-r-0"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors duration-150"
                >
                  <td className="px-4 py-2.5 text-slate-500 text-xs border-r border-white/5 font-mono">
                    {idx + 1}
                  </td>
                  {headers.map((header) => (
                    <td
                      key={header}
                      className="px-4 py-2.5 text-slate-300 whitespace-nowrap max-w-[200px] truncate border-r border-white/5 last:border-r-0"
                      title={row[header]}
                    >
                      {row[header] || (
                        <span className="text-slate-600 italic text-xs">empty</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Row count indicator if truncated */}
        {rows.length > 100 && (
          <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-400 text-xs text-center">
            Showing first 100 of {rows.length} rows. All {rows.length} rows will be processed.
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-slate-500 text-sm">
          Review your data above, then click &ldquo;Confirm Import&rdquo; to start AI extraction.
        </p>
        <button
          onClick={onConfirm}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 
            hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl 
            transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 
            hover:scale-[1.02] active:scale-[0.98]"
        >
          Confirm Import
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
