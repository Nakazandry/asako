import Loader from './Loader.jsx';

export default function DataTable({ columns, rows, loading, empty = 'Aucune donnee', meta, onPageChange }) {
  if (loading) return <Loader />;

  return (
    <div className="panel overflow-hidden shadow-[0_18px_45px_rgba(46,36,48,0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-[#fff7f8] text-xs uppercase text-[#7a6670]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-5 py-4 font-black tracking-wide">{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1e2e5]">
            {rows?.length ? rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-[#fff7f8]">
                {columns.map((column) => (
                  <td key={column.key} className="px-5 py-4 align-middle text-[#4b3a42]">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <div className="mx-auto max-w-sm">
                    <p className="font-bold text-[#2e2430]">{empty}</p>
                    <p className="mt-1 text-sm text-[#7a6670]">Les donnees apparaitront ici des qu'elles seront disponibles.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {meta && (
        <div className="flex flex-col gap-3 border-t border-[#f1e2e5] bg-[#fff7f8]/60 px-4 py-3 text-sm text-[#7a6670] sm:flex-row sm:items-center sm:justify-between">
          <span>Page {meta.page} sur {meta.pages} · {meta.total} resultat(s)</span>
          <div className="flex gap-2">
            <button className="btn-secondary px-3 py-1.5" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
              Precedent
            </button>
            <button className="btn-secondary px-3 py-1.5" disabled={meta.page >= meta.pages} onClick={() => onPageChange(meta.page + 1)}>
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
