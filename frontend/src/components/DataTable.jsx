import { FiChevronLeft, FiChevronRight, FiInbox } from 'react-icons/fi';
import Loader from './Loader.jsx';

export default function DataTable({ columns, rows, loading, empty = 'Aucune donnee', meta, onPageChange }) {
  if (loading) return <Loader />;

  return (
    <div className="panel animate-fade-up overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="border-b border-[#f1e2e5] bg-gradient-to-r from-[#fff7f8] to-[#fdf1f3] text-[11px] uppercase tracking-widest text-[#7a6670]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-5 py-4 font-black">{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1e2e5]/80">
            {rows?.length ? rows.map((row) => (
              <tr key={row.id} className="group transition-colors duration-150 hover:bg-[#fff7f8]/80">
                {columns.map((column) => (
                  <td key={column.key} className="px-5 py-4 align-middle text-[#4b3a42]">{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="mx-auto max-w-sm">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff7f8] text-2xl text-[#d9a9b2] ring-8 ring-[#fff7f8]/60">
                      <FiInbox />
                    </span>
                    <p className="mt-4 font-bold text-[#2e2430]">{empty}</p>
                    <p className="mt-1 text-sm text-[#7a6670]">Les donnees apparaitront ici des qu'elles seront disponibles.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {meta && (
        <div className="flex flex-col gap-3 border-t border-[#f1e2e5]/80 bg-[#fff7f8]/50 px-4 py-3 text-sm font-semibold text-[#7a6670] sm:flex-row sm:items-center sm:justify-between">
          <span>Page {meta.page} sur {meta.pages} · {meta.total} resultat(s)</span>
          <div className="flex gap-2">
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
