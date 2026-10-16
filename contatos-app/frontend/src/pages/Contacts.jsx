import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, parseError } from '../api.js';
import Pagination from '../components/Pagination.jsx';
import { useRealtime } from '../components/RealtimeContext.jsx';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const EMPTY = { name: '', email: '', phone: '', company: '', city: '', state: 'GO', notes: '' };
const PER_PAGE = 20;

function ContactForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState({ message: '', fields: {} });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const input = (k, label, props = {}) => (
    <div className={props.col || 'col-md-6'}>
      <label className="form-label">{label}</label>
      <input className={`form-control ${err.fields[k] ? 'is-invalid' : ''}`} value={form[k]} onChange={set(k)} {...props} />
      {err.fields[k] && <div className="invalid-feedback">{err.fields[k]}</div>}
    </div>
  );

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr({ message: '', fields: {} }); setOk(false);
    try {
      await api.post('/contacts', form);
      setForm(EMPTY); setOk(true); onCreated();
    } catch (ex) { setErr(parseError(ex)); } finally { setBusy(false); }
  };

  return (
    <form className="card card-body mb-4" onSubmit={submit} noValidate>
      <h5 className="mb-3">Novo contato</h5>
      {err.message && Object.keys(err.fields).length === 0 && <div className="alert alert-danger py-2">{err.message}</div>}
      {ok && <div className="alert alert-success py-2">Contato cadastrado! O administrador foi notificado.</div>}
      <div className="row g-3">
        {input('name', 'Nome *', { required: true })}
        {input('email', 'E-mail *', { type: 'email', required: true })}
        {input('phone', 'Telefone *', { placeholder: '(62) 99999-0000', required: true })}
        {input('company', 'Empresa')}
        {input('city', 'Cidade *', { required: true, col: 'col-md-5' })}
        <div className="col-md-2">
          <label className="form-label">UF *</label>
          <select className={`form-select ${err.fields.state ? 'is-invalid' : ''}`} value={form.state} onChange={set('state')}>
            {UFS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        {input('notes', 'Observações', { col: 'col-md-5' })}
      </div>
      <div className="mt-3"><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Cadastrar contato'}</button></div>
    </form>
  );
}

export default function Contacts() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [data, setData] = useState({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    try {
      // A paginação acontece no backend: só trafega a página solicitada
      const { data } = await api.get('/contacts', { params: { page, per_page: PER_PAGE, q: term || undefined } });
      setData(data); setError('');
      // Apagou o último item de uma página: volta para a última página que ainda existe
      if (data.data.length === 0 && data.current_page > 1) setPage(data.last_page || 1);
    } catch (ex) { setError(parseError(ex).message); } finally { setLoading(false); }
  }, [page, term]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const remove = async (c) => {
    if (!window.confirm(`Excluir o contato "${c.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(c.id);
    try { await api.delete(`/contacts/${c.id}`); }
    catch (ex) { setError(parseError(ex).message); }
    finally { setDeletingId(null); await load(); }
  };

  // Admin: lista atualiza sozinha quando chega contato novo / após reconexão
  useRealtime((evt) => { if (evt.type === 'contact.created' || evt.type === 'contact.deleted' || evt.type === 'reconnected') load(); });

  return (
    <>
      {!isAdmin && <ContactForm onCreated={() => { setPage(1); setTerm(''); setQ(''); load(); }} />}

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h5 className="mb-0">{isAdmin ? 'Todos os contatos' : 'Meus contatos'}</h5>
        <form className="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); }}>
          <input className="form-control form-control-sm" placeholder="Buscar nome, e-mail ou cidade" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-outline-secondary btn-sm">Buscar</button>
        </form>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Empresa</th><th>Cidade/UF</th>{isAdmin && <th>Operador</th>}<th>Criado em</th><th /></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>}
              {!loading && data.data.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-4">Nenhum contato encontrado.</td></tr>}
              {!loading && data.data.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.company || '—'}</td>
                  <td>{c.city}/{c.state}</td>
                  {isAdmin && <td>{c.creator?.name}</td>}
                  <td>{new Date(c.created_at).toLocaleString()}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-danger" disabled={deletingId === c.id} onClick={() => remove(c)}>
                      {deletingId === c.id ? 'Excluindo…' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <Pagination page={data.current_page} lastPage={data.last_page} total={data.total} onChange={setPage} />
        </div>
      </div>
    </>
  );
}
