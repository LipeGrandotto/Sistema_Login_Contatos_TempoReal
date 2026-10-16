import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { RealtimeProvider, useRealtimeState } from './RealtimeContext.jsx';

function Bell() {
  const { items, unread, markRead, status } = useRealtimeState();
  const [open, setOpen] = useState(false);
  const toggle = () => { setOpen((o) => !o); markRead(); };
  const dot = status === 'connected' ? 'bg-success' : 'bg-warning';

  return (
    <div className="position-relative me-3">
      <button className="btn btn-outline-light btn-sm position-relative" onClick={toggle} aria-label="Notificações">
        🔔
        {unread > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{unread}</span>
        )}
      </button>
      <span className={`position-absolute bottom-0 end-0 p-1 border border-dark rounded-circle ${dot}`}
        title={`Tempo real: ${status}`} style={{ transform: 'translate(25%, 25%)' }} />
      {open && (
        <div className="dropdown-menu dropdown-menu-end show p-0 shadow" style={{ width: 340, maxHeight: 380, overflowY: 'auto' }}>
          {items.length === 0 && <div className="p-3 text-muted small">Sem notificações nesta sessão.</div>}
          {items.map((n) => (
            <div key={n.id} className="px-3 py-2 border-bottom small">
              <div>{n.text}</div>
              <div className="text-muted">{n.at.toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';

  const links = isAdmin
    ? [['/dashboard', 'Dashboard'], ['/contacts', 'Contatos'], ['/requests', 'Solicitações'], ['/users', 'Usuários'], ['/activity', 'Atividade']]
    : [['/contacts', 'Contatos']];

  const onLogout = async () => { await logout(); navigate('/login'); };

  return (
    <>
      <nav className="navbar navbar-expand navbar-dark bg-dark px-3">
        <span className="navbar-brand">Contatos</span>
        <ul className="navbar-nav me-auto">
          {links.map(([to, label]) => (
            <li className="nav-item" key={to}>
              <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>{label}</NavLink>
            </li>
          ))}
        </ul>
        {isAdmin && <Bell />}
        <span className="navbar-text me-3 small">{user.name} <span className="badge text-bg-secondary">{user.role}</span></span>
        <button className="btn btn-outline-light btn-sm" onClick={onLogout}>Sair</button>
      </nav>
      <main className="container py-4"><Outlet /></main>
    </>
  );
}

export default function Layout() {
  const { user } = useAuth();
  // WebSocket do admin só existe enquanto houver um admin logado
  return user.role === 'admin' ? <RealtimeProvider><Shell /></RealtimeProvider> : <Shell />;
}
