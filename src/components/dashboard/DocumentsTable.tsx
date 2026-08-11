import { ArrowDown, ArrowUp, ExternalLink } from 'lucide-react';
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
  { key: 'name', label: 'Document', widthClass: 'w-[17%]' },
  { key: 'iso', label: 'Standards', widthClass: 'w-[8%]' },
  { key: 'clauses', label: 'Clause', widthClass: 'w-[17%]' },
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
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocumentRow({ doc }: { doc: EvidenceDocument }) {
  const overdue = isOverdue(doc.dueDate);

  return (
    <tr className={overdue ? 'bg-amber-50/60' : 'hover:bg-slate-50'}>
      <td
        className="truncate overflow-hidden border-b border-slate-100 px-3 py-3.5 pl-5 text-[13.5px] font-medium text-slate-800"
        title={doc.name}
      >
        {doc.name}
      </td>
      <td
        className="overflow-hidden truncate border-b border-slate-100 px-3 py-3.5 font-mono text-xs text-slate-600"
        title={doc.iso}
      >
        {getStandardName(doc.iso)}
      </td>
      <td className="overflow-hidden border-b border-slate-100 px-3 py-3.5">
        <div className="flex min-w-0 flex-wrap gap-1">
          {doc.clauses.map((clause) => (
            <ClauseTag key={clause} iso={doc.iso} clause={clause} />
          ))}
        </div>
      </td>
      <td
        className="overflow-hidden truncate border-b border-slate-100 px-3 py-3.5 text-[13px] text-slate-600"
        title={doc.location}
      >
        {doc.location}
      </td>
      <td className="overflow-hidden border-b border-slate-100 px-3 py-3.5">
        <EvidenceStatusBadge status={doc.evidenceStatus} />
      </td>
      <td className="overflow-hidden border-b border-slate-100 px-3 py-3.5">
        <ComplianceResultBadge result={doc.complianceResult} />
      </td>
      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3.5 text-[13px] text-slate-600">
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
      <td className="border-b border-slate-100 px-3 py-3.5 pr-5">
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
