import { useCallback, useEffect, useState } from 'react';
import { api, parseError } from '../api.js';
import Pagination from '../components/Pagination.jsx';
import { useRealtime } from '../components/RealtimeContext.jsx';

const BADGE = { pending: 'warning', approved: 'success', rejected: 'danger' };
const LABEL = { pending: 'Pendente', approved: 'Aprovada', rejected: 'Rejeitada' };

export default function Requests() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/registration-requests', { params: { status, page } });
      setData(data); setError('');
    } catch (ex) { setError(parseError(ex).message); }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);
  useRealtime((e) => { if (e.type === 'registration.requested' || e.type === 'reconnected') load(); });

  const act = async (id, action) => {
    setBusyId(id);
    try { await api.post(`/admin/registration-requests/${id}/${action}`); await load(); }
    catch (ex) { setError(parseError(ex).message); await load(); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <h4 className="mb-3">Solicitações de cadastro</h4>
      <ul className="nav nav-tabs mb-3">
        {['pending', 'approved', 'rejected'].map((s) => (
          <li className="nav-item" key={s}>
            <button className={`nav-link ${status === s ? 'active' : ''}`} onClick={() => { setStatus(s); setPage(1); }}>{LABEL[s]}</button>
          </li>
        ))}
      </ul>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card">
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead className="table-light"><tr><th>Nome</th><th>E-mail</th><th>Solicitada em</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.data.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">Nada por aqui.</td></tr>}
              {data.data.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td><td>{r.email}</td><td>{new Date(r.created_at).toLocaleString()}</td>
                  <td><span className={`badge text-bg-${BADGE[r.status]}`}>{LABEL[r.status]}</span>
                    {r.reviewer && <span className="text-muted small ms-2">por {r.reviewer.name}</span>}</td>
                  <td className="text-end">
                    {r.status === 'pending' && (
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-success" disabled={busyId === r.id} onClick={() => act(r.id, 'approve')}>Aprovar</button>
                        <button className="btn btn-outline-danger" disabled={busyId === r.id} onClick={() => act(r.id, 'reject')}>Rejeitar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer"><Pagination page={data.current_page} lastPage={data.last_page} total={data.total} onChange={setPage} /></div>
      </div>
    </>
  );
}
