import { useCallback, useEffect, useRef, useState } from 'react';
import { api, parseError } from '../api.js';
import Pagination from '../components/Pagination.jsx';
import { useRealtime } from '../components/RealtimeContext.jsx';

const COLOR = (a) => (a.startsWith('auth') ? 'secondary' : a.startsWith('contact') ? 'primary' : a.startsWith('registration') ? 'warning' : 'info');

export default function Activity() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [error, setError] = useState('');
  const timer = useRef(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/admin/activity', { params: { page } }); setData(data); setError(''); }
    catch (ex) { setError(parseError(ex).message); }
  }, [page]);

  useEffect(() => { load(); return () => clearTimeout(timer.current); }, [load]);
  useRealtime(() => { clearTimeout(timer.current); timer.current = setTimeout(load, 400); });

  return (
    <>
      <h4 className="mb-3">Atividade da aplicação</h4>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card">
        <ul className="list-group list-group-flush">
          {data.data.map((a) => (
            <li key={a.id} className="list-group-item d-flex justify-content-between align-items-start gap-3">
              <div>
                <span className={`badge text-bg-${COLOR(a.action)} me-2`}>{a.action}</span>
                {a.description}
                <div className="text-muted small">{a.user ? `${a.user.name} (${a.user.role})` : 'visitante'} · IP {a.ip || '—'}</div>
              </div>
              <div className="text-muted small text-nowrap">{new Date(a.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
        <div className="card-footer"><Pagination page={data.current_page} lastPage={data.last_page} total={data.total} onChange={setPage} /></div>
      </div>
    </>
  );
}
