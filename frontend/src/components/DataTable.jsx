import { FiChevronLeft, FiChevronRight, FiInbox } from 'react-icons/fi';
import Loader from './Loader.jsx';

export default function DataTable({
  columns,
  rows,
  loading,
  empty = 'Aucun resultat',
  meta,
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageSizeChange,
  resultLabel = 'resultat(s)',
  tableMinWidth = 760,
}) {
  if (loading) return <Loader />;
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const safePageSizeOptions = Array.isArray(pageSizeOptions) ? pageSizeOptions : [10, 20, 50];

  return (
    <div className="panel animate-fade-up overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-sm"
          style={{ minWidth: tableMinWidth }}
        >
          <thead className="border-b border-[#e6eee8] bg-gradient-to-r from-[#f1f8f3] to-[#f7faf7] text-[11px] uppercase tracking-widest text-[#60756b]">
            <tr>
              {safeColumns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-4 py-4 font-black ${column.className || ''}`}
                  style={column.width ? { width: column.width, minWidth: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6eee8]/80">
            {safeRows.length ? safeRows.map((row) => (
              <tr key={row.id} className="group transition-colors duration-150 hover:bg-[#f1f8f3]/80">
                {safeColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-4 align-middle text-[#40574a] ${column.className || ''}`}
                    style={column.width ? { width: column.width, minWidth: column.width } : undefined}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={safeColumns.length} className="px-4 py-16 text-center">
                  <div className="mx-auto max-w-sm">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1f8f3] text-2xl text-[#82b594] ring-8 ring-[#f1f8f3]/60">
                      <FiInbox />
                    </span>
                    <p className="mt-4 font-bold text-[#17362b]">{empty}</p>
                    <p className="mt-1 text-sm text-[#60756b]">Les donnees apparaitront ici des qu'elles seront disponibles.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {meta && (
        <div className="flex flex-col gap-3 border-t border-[#e6eee8]/80 bg-[#f1f8f3]/50 px-4 py-3 text-sm font-semibold text-[#60756b] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span>{meta.total} {resultLabel}</span>
            {onPageSizeChange && (
              <label className="flex items-center gap-2">
                <span className="text-xs">Lignes par page</span>
                <select
                  className="input h-9 min-w-20 px-2 py-1"
                  value={pageSize}
                  onChange={(event) => onPageSizeChange(Number(event.target.value))}
                >
                  {safePageSizeOptions.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs">Page {meta.page} sur {meta.pages}</span>
            <button className="btn-secondary px-3 py-1.5" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
              <FiChevronLeft /> Precedent
            </button>
            <button className="btn-secondary px-3 py-1.5" disabled={meta.page >= meta.pages} onClick={() => onPageChange(meta.page + 1)}>
              Suivant <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
