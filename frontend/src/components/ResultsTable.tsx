'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
} from 'lucide-react';
import { CrmRecord, SkippedRecord } from '@/types/crm';

interface ResultsTableProps {
  success: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  onReset: () => void;
}

const CRM_STATUS_COLORS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  DID_NOT_CONNECT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  BAD_LEAD: 'bg-red-500/20 text-red-400 border-red-500/30',
  SALE_DONE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const CRM_FIELD_LABELS: { key: keyof CrmRecord; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'country_code', label: 'CC' },
  { key: 'mobile_without_country_code', label: 'Mobile' },
  { key: 'company', label: 'Company' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'crm_status', label: 'Status' },
  { key: 'lead_owner', label: 'Owner' },
  { key: 'data_source', label: 'Source' },
  { key: 'crm_note', label: 'Notes' },
  { key: 'created_at', label: 'Created' },
  { key: 'description', label: 'Description' },
];

function downloadCsv(records: CrmRecord[], filename: string) {
  if (records.length === 0) return;
  const headers = Object.keys(records[0]) as (keyof CrmRecord)[];
  const csvContent = [
    headers.join(','),
    ...records.map((r) =>
      headers
        .map((h) => {
          const val = r[h] || '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResultsTable({
  success,
  skipped,
  totalImported,
  totalSkipped,
  onReset,
}: ResultsTableProps) {
  const [showSkipped, setShowSkipped] = useState(false);

  return (
    <div className="w-full space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{totalImported}</p>
            <p className="text-emerald-400 text-sm font-medium">Successfully Imported</p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{totalSkipped}</p>
            <p className="text-red-400 text-sm font-medium">Skipped Records</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Extracted CRM Records</h2>
        <div className="flex gap-3">
          <button
            onClick={() => downloadCsv(success, 'groweasy-crm-import.csv')}
            disabled={success.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
              border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-xl 
              transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 
              border border-white/10 text-slate-400 text-sm font-medium rounded-xl 
              transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            New Import
          </button>
        </div>
      </div>

      {/* Success Records Table */}
      {success.length > 0 ? (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
            <table className="w-full text-sm border-collapse min-w-max">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900/95 backdrop-blur-sm border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 w-10 border-r border-white/5">
                    #
                  </th>
                  {CRM_FIELD_LABELS.map(({ key, label }) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap border-r border-white/5 last:border-r-0"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {success.map((record, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono border-r border-white/5">
                      {idx + 1}
                    </td>
                    {CRM_FIELD_LABELS.map(({ key }) => (
                      <td
                        key={key}
                        className="px-4 py-3 border-r border-white/5 last:border-r-0 max-w-[200px]"
                      >
                        {key === 'crm_status' && record[key] ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap
                              ${CRM_STATUS_COLORS[record[key]] || 'bg-white/10 text-slate-400 border-white/10'}`}
                          >
                            {record[key].replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span
                            className={`text-sm truncate block whitespace-nowrap
                              ${record[key] ? 'text-slate-300' : 'text-slate-600 italic text-xs'}`}
                            title={record[key]}
                          >
                            {record[key] || '—'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 bg-white/3 rounded-xl border border-white/10">
          No records were successfully imported.
        </div>
      )}

      {/* Skipped Records (collapsible) */}
      {skipped.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowSkipped(!showSkipped)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-red-500/5 transition-colors duration-200"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-medium text-sm">
                {skipped.length} Skipped Records
              </span>
            </div>
            {showSkipped ? (
              <ChevronUp className="w-4 h-4 text-red-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-red-400" />
            )}
          </button>

          {showSkipped && (
            <div className="overflow-x-auto overflow-y-auto max-h-[300px] border-t border-red-500/20">
              <table className="w-full text-sm border-collapse min-w-max">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
                  <tr className="border-b border-red-500/20">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-red-400 w-10">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-red-400 whitespace-nowrap">
                      Reason
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-red-400 whitespace-nowrap">
                      Raw Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {skipped.map((item, idx) => (
                    <tr key={idx} className="border-b border-red-500/10 hover:bg-red-500/5">
                      <td className="px-4 py-2.5 text-slate-500 text-xs font-mono">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-red-300 text-xs max-w-[250px]">
                        {item.reason}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[400px] truncate font-mono">
                        {JSON.stringify(item.row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
