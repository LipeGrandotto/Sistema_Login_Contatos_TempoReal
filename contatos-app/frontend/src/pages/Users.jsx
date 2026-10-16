import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, parseError } from '../api.js';
import Pagination from '../components/Pagination.jsx';

const EMPTY = { name: '', email: '', password: '', role: 'operator' };

export default function Users() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState({ message: '', fields: {} });
  const [ok, setOk] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = useCallback(async () => {
    const { data } = await api.get('/admin/users', { params: { page } });
    setData(data);
  }, [page]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const create = async (e) => {
    e.preventDefault(); setErr({ message: '', fields: {} }); setOk(false);
    try { await api.post('/admin/users', form); setForm(EMPTY); setOk(true); load(); }
    catch (ex) { setErr(parseError(ex)); }
  };

  const toggle = async (u) => {
    try { await api.patch(`/admin/users/${u.id}/active`, { is_active: !u.is_active }); load(); }
    catch (ex) { setErr({ message: parseError(ex).message, fields: {} }); }
  };

  const field = (k, label, type = 'text') => (
    <div className="col-md-3">
      <label className="form-label">{label}</label>
      <input type={type} className={`form-control ${err.fields[k] ? 'is-invalid' : ''}`} value={form[k]} onChange={set(k)} autoComplete="off" required />
      {err.fields[k] && <div className="invalid-feedback">{err.fields[k]}</div>}
    </div>
  );

  return (
    <>
      <h4 className="mb-3">Usuários</h4>
      <form className="card card-body mb-4" onSubmit={create} noValidate>
        <h6>Cadastrar novo usuário</h6>
        {err.message && Object.keys(err.fields).length === 0 && <div className="alert alert-danger py-2">{err.message}</div>}
        {ok && <div className="alert alert-success py-2">Usuário criado.</div>}
        <div className="row g-3">
          {field('name', 'Nome')}
          {field('email', 'E-mail', 'email')}
          {field('password', 'Senha inicial', 'password')}
          <div className="col-md-2">
            <label className="form-label">Perfil</label>
            <select className="form-select" value={form.role} onChange={set('role')}>
              <option value="operator">Operador</option><option value="admin">Administrador</option>
            </select>
          </div>
          <div className="col-md-1 d-flex align-items-end"><button className="btn btn-primary w-100">Criar</button></div>
        </div>
      </form>

      <div className="card">
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead className="table-light"><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Último acesso</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.data.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td><td>{u.email}</td>
                  <td><span className="badge text-bg-secondary">{u.role}</span></td>
                  <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</td>
                  <td><span className={`badge text-bg-${u.is_active ? 'success' : 'danger'}`}>{u.is_active ? 'Ativo' : 'Inativo'}</span></td>
                  <td className="text-end">
                    {u.id !== me.id && <button className="btn btn-sm btn-outline-secondary" onClick={() => toggle(u)}>{u.is_active ? 'Desativar' : 'Reativar'}</button>}
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
