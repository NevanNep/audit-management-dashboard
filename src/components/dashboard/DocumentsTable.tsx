import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { ClauseTag } from '../ui/ClauseTag';
import { ComplianceResultBadge, EvidenceStatusBadge } from '../ui/StatusBadge';
import { formatDueDate, isOverdue } from '../../utils/evidenceFormatting';
import { getStandardName } from '../../data/isoStandards';
import type { EvidenceDocument, SortKey, SortState } from '../../types/evidence';

interface DocumentsTableProps {
  documents: EvidenceDocument[];
  totalCount: number;
  sortState: SortState;
  onSort: (key: SortKey) => void;
  onResetFilters: () => void;
}

interface ColumnDef {
  key: SortKey;
  label: string;
  widthClass: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'documentId', label: 'Document ID', widthClass: 'w-[9%]' },
  { key: 'name', label: 'Document', widthClass: 'w-[14%]' },
  { key: 'iso', label: 'Standards', widthClass: 'w-[8%]' },
  { key: 'clauses', label: 'Clause', widthClass: 'w-[15%]' },
  { key: 'location', label: 'Location', widthClass: 'w-[9%]' },
  { key: 'evidenceStatus', label: 'Evidence status', widthClass: 'w-[14%]' },
  { key: 'complianceResult', label: 'Compliance result', widthClass: 'w-[16%]' },
  { key: 'dueDate', label: 'Due date', widthClass: 'w-[10%]' },
];

function ariaSortFor(sortState: SortState, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sortState.key !== key) return 'none';
  return sortState.direction === 'asc' ? 'ascending' : 'descending';
}

export function DocumentsTable({ documents, totalCount, sortState, onSort, onResetFilters }: DocumentsTableProps) {
  const isEmpty = documents.length === 0;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="mb-4 rounded-[10px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <div className="text-sm font-semibold text-slate-800">Documents ({totalCount})</div>
      </div>

      {isEmpty ? (
        <EmptyState onReset={onResetFilters} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] table-fixed border-collapse">
            <thead>
              <tr>
                <th scope="col" className="w-8 border-b border-slate-200 py-2.5 pl-5">
                  <span className="sr-only">Expand row</span>
                </th>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSortFor(sortState, column.key)}
                    className={`${column.widthClass} border-b border-slate-200 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 first:pl-5`}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                    >
                      {column.label}
                      {sortState.key === column.key &&
                        (sortState.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        ))}
                    </button>
                  </th>
                ))}
                <th
                  scope="col"
                  className="w-[9%] border-b border-slate-200 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  isExpanded={expandedIds.has(doc.id)}
                  onToggle={toggleRow}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface DocumentRowProps {
  doc: EvidenceDocument;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

function DocumentRow({ doc, isExpanded, onToggle }: DocumentRowProps) {
  const overdue = isOverdue(doc.dueDate);
  const wrapClass = isExpanded ? 'whitespace-normal break-words' : 'truncate overflow-hidden whitespace-nowrap';

  return (
    <tr className={overdue ? 'bg-amber-50/60' : 'hover:bg-slate-50'}>
      <td className="border-b border-slate-100 py-3.5 pl-5 align-top">
        <button
          type="button"
          onClick={() => onToggle(doc.id)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse details for ${doc.name}` : `Expand details for ${doc.name}`}
          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </td>
      <td
        className={`border-b border-slate-100 px-3 py-3.5 align-top font-mono text-[13px] text-slate-600 ${wrapClass}`}
        title={isExpanded ? undefined : doc.documentId}
      >
        {doc.documentId}
      </td>
      <td
        className={`border-b border-slate-100 px-3 py-3.5 align-top text-[13.5px] font-medium text-slate-800 ${wrapClass}`}
        title={isExpanded ? undefined : doc.name}
      >
        {doc.name}
      </td>
      <td
        className={`border-b border-slate-100 px-3 py-3.5 align-top ${wrapClass}`}
        title={isExpanded ? undefined : doc.standards.map((standard) => standard.iso).join(', ')}
      >
        <div className="flex min-w-0 flex-wrap gap-1">
          {doc.standards.map((standard) => (
            <span
              key={standard.iso}
              title={standard.iso}
              className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600"
            >
              {getStandardName(standard.iso)}
            </span>
          ))}
        </div>
      </td>
      <td className="overflow-hidden border-b border-slate-100 px-3 py-3.5 align-top">
        <div className="flex min-w-0 flex-col gap-1.5">
          {doc.standards.map((standard) => (
            <div key={standard.iso} className="flex min-w-0 flex-wrap items-center gap-1">
              <span className="font-mono text-[10px] font-semibold text-slate-400">
                {getStandardName(standard.iso)}
              </span>
              {standard.clauses.map((clause) => (
                <ClauseTag key={`${standard.iso}-${clause}`} iso={standard.iso} clause={clause} expanded={isExpanded} />
              ))}
            </div>
          ))}
        </div>
      </td>
      <td
        className={`border-b border-slate-100 px-3 py-3.5 align-top text-[13px] text-slate-600 ${wrapClass}`}
        title={isExpanded ? undefined : doc.location}
      >
        {doc.location}
      </td>
      <td className="overflow-hidden border-b border-slate-100 px-3 py-3.5 align-top">
        <EvidenceStatusBadge status={doc.evidenceStatus} />
      </td>
      <td className="overflow-hidden border-b border-slate-100 px-3 py-3.5 align-top">
        <ComplianceResultBadge result={doc.complianceResult} />
      </td>
      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3.5 align-top text-[13px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          {overdue && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-amber-500"
              role="img"
              aria-label="Overdue"
              title="Overdue"
            />
          )}
          {formatDueDate(doc.dueDate)}
        </span>
      </td>
      <td className="border-b border-slate-100 px-3 py-3.5 pr-5 align-top">
        {doc.documentUrl ? (
          <a
            href={doc.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Opens the source document"
            className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-semibold text-accent hover:text-accent-hover"
          >
            Open
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Opens the source document in SharePoint</span>
          </a>
        ) : (
          <span className="text-[12.5px] font-medium text-slate-400" title="No source document uploaded yet">
            Not available
          </span>
        )}
      </td>
    </tr>
  );
}
