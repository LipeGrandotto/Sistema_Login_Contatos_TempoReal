import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, csrf, parseError } from '../api.js';
import { getEcho, disconnectEcho } from '../echo.js';

function Field({ label, error, ...props }) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <input className={`form-control ${error ? 'is-invalid' : ''}`} {...props} />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
}

function LoginForm({ initialEmail }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState({ message: '', fields: {} });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr({ message: '', fields: {} });
    try {
      await login(email, password);
      navigate('/');
    } catch (ex) {
      setErr(parseError(ex));
      setPassword('');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      {err.message && !err.fields.email && <div className="alert alert-danger py-2">{err.message}</div>}
      <Field label="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} error={err.fields.email} required />
      <Field label="Senha" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
    </form>
  );
}

/** Tela de espera: fica ouvindo o canal do WebSocket; NÃO precisa recarregar a página. */
function WaitingApproval({ channel, email, onGoLogin }) {
  const [status, setStatus] = useState('pending'); // pending | approved | rejected
  const [conn, setConn] = useState('connecting');

  useEffect(() => {
    const echo = getEcho();
    const name = `registration.${channel}`;
    echo.channel(name).listen('.registration.reviewed', (e) => setStatus(e.status));
    const c = echo.connector.pusher.connection;
    const onState = ({ current }) => setConn(current);
    c.bind('state_change', onState);
    setConn(c.state);
    return () => { c.unbind('state_change', onState); echo.leave(name); disconnectEcho(); };
  }, [channel]);

  if (status === 'approved') {
    return (
      <div className="text-center">
        <div className="alert alert-success">✅ Seu acesso foi <strong>aprovado</strong>!</div>
        <button className="btn btn-success" onClick={() => onGoLogin(email)}>Ir para o login</button>
      </div>
    );
  }
  if (status === 'rejected') {
    return (
      <div className="text-center">
        <div className="alert alert-danger">Sua solicitação não foi aprovada. Entre em contato com o administrador.</div>
        <button className="btn btn-outline-secondary" onClick={() => onGoLogin(email)}>Voltar</button>
      </div>
    );
  }
  return (
    <div className="text-center py-3">
      <div className="spinner-border text-primary mb-3" role="status" />
      <h5>Aguardando aprovação do administrador…</h5>
      <p className="text-muted mb-1">Mantenha esta tela aberta. A resposta aparece aqui automaticamente.</p>
      <small className={conn === 'connected' ? 'text-success' : 'text-warning'}>● tempo real: {conn}</small>
    </div>
  );
}

function RegisterForm({ onSubmitted }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [err, setErr] = useState({ message: '', fields: {} });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr({ message: '', fields: {} });
    try {
      await csrf();
      const { data } = await api.post('/registration-requests', form);
      onSubmitted({ channel: data.channel, email: form.email });
    } catch (ex) { setErr(parseError(ex)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      {err.message && Object.keys(err.fields).length === 0 && <div className="alert alert-danger py-2">{err.message}</div>}
      <Field label="Nome completo" value={form.name} onChange={set('name')} error={err.fields.name} required />
      <Field label="E-mail" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={err.fields.email} required />
      <Field label="Senha" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={err.fields.password} required />
      <div className="form-text mb-3 mt-n2">Mín. 10 caracteres, com maiúscula, minúscula, número e símbolo.</div>
      <Field label="Confirmar senha" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} required />
      <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Enviando…' : 'Solicitar acesso'}</button>
    </form>
  );
}

export default function Login() {
  const [tab, setTab] = useState('login');
  const [waiting, setWaiting] = useState(null); // { channel, email }
  const [prefill, setPrefill] = useState('');

  const goLogin = (email) => { setPrefill(email); setWaiting(null); setTab('login'); };

  return (
    <div className="container" style={{ maxWidth: 440, paddingTop: '10vh' }}>
      <div className="card shadow-sm">
        <div className="card-body p-4">
          <h4 className="text-center mb-4">Contatos</h4>
          {waiting ? (
            <WaitingApproval channel={waiting.channel} email={waiting.email} onGoLogin={goLogin} />
          ) : (
            <>
              <ul className="nav nav-pills nav-fill mb-4">
                <li className="nav-item"><button className={`nav-link ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Entrar</button></li>
                <li className="nav-item"><button className={`nav-link ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Solicitar acesso</button></li>
              </ul>
              {tab === 'login' ? <LoginForm key={prefill} initialEmail={prefill} /> : <RegisterForm onSubmitted={setWaiting} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
