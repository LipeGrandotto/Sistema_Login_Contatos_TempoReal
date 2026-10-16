import { useCallback, useEffect, useRef, useState } from 'react';
import { api, parseError } from '../api.js';
import { useRealtime } from '../components/RealtimeContext.jsx';

function Stat({ label, value, variant = 'primary' }) {
  return (
    <div className="col-6 col-lg">
      <div className={`card border-${variant} h-100`}>
        <div className="card-body">
          <div className="text-muted small">{label}</div>
          <div className={`fs-2 fw-semibold text-${variant}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function BarList({ title, rows, labelKey }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="card h-100">
      <div className="card-header">{title}</div>
      <div className="card-body">
        {rows.length === 0 && <div className="text-muted">Sem dados.</div>}
        {rows.map((r) => (
          <div key={r[labelKey]} className="mb-2">
            <div className="d-flex justify-content-between small"><span>{r[labelKey]}</span><strong>{r.total}</strong></div>
            <div className="progress" style={{ height: 8 }}>
              <div className="progress-bar" style={{ width: `${(r.total / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const timer = useRef(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/admin/dashboard'); setD(data); setError(''); }
    catch (ex) { setError(parseError(ex).message); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000); // rede de segurança caso o WebSocket caia
    return () => { clearInterval(id); clearTimeout(timer.current); };
  }, [load]);

  // Tempo real: debounce evita rajada de consultas quando chegam vários eventos juntos
  useRealtime(() => { clearTimeout(timer.current); timer.current = setTimeout(load, 400); });

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!d) return <div className="text-center mt-5"><div className="spinner-border" /></div>;

  const maxDay = Math.max(1, ...d.per_day.map((x) => x.total));

  return (
    <>
      <div className="d-flex align-items-center mb-3"><h4 className="mb-0">Dashboard</h4><span className="badge text-bg-success ms-3">ao vivo</span></div>
      <div className="row g-3 mb-4">
        <Stat label="Contatos (total)" value={d.totals.contacts} />
        <Stat label="Hoje" value={d.totals.today} variant="success" />
        <Stat label="Últimos 7 dias" value={d.totals.last_7_days} variant="info" />
        <Stat label="Operadores ativos" value={d.totals.operators} variant="secondary" />
        <Stat label="Solicitações pendentes" value={d.totals.pending_requests} variant="warning" />
      </div>

      <div className="card mb-4">
        <div className="card-header">Contatos por dia (últimos 14 dias)</div>
        <div className="card-body">
          <div className="d-flex align-items-end gap-1" style={{ height: 150 }}>
            {d.per_day.map((x) => (
              <div key={x.day} className="flex-fill text-center" title={`${x.day}: ${x.total}`}>
                <div className="small text-muted">{x.total}</div>
                <div className="bg-primary rounded-top" style={{ height: `${(x.total / maxDay) * 100}px`, minHeight: 2 }} />
                <div className="text-muted" style={{ fontSize: 10 }}>{x.day.slice(8)}/{x.day.slice(5, 7)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-6"><BarList title="Top estados (UF)" rows={d.by_state} labelKey="state" /></div>
        <div className="col-md-6"><BarList title="Por operador" rows={d.by_operator} labelKey="name" /></div>
      </div>
    </>
  );
}
