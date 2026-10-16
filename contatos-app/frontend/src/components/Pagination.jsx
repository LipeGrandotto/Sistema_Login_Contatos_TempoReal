/** Paginação alimentada pelos metadados do paginator do Laravel (current_page, last_page, total). */
export default function Pagination({ page, lastPage, total, onChange }) {
  if (!lastPage || lastPage <= 1) {
    return <div className="text-muted small">{total} registro(s)</div>;
  }
  const pages = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(lastPage, page + 2); p++) pages.push(p);

  return (
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div className="text-muted small">{total} registro(s) — página {page} de {lastPage}</div>
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onChange(page - 1)}>Anterior</button>
        </li>
        {pages.map((p) => (
          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onChange(p)}>{p}</button>
          </li>
        ))}
        <li className={`page-item ${page === lastPage ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onChange(page + 1)}>Próxima</button>
        </li>
      </ul>
    </div>
  );
}
