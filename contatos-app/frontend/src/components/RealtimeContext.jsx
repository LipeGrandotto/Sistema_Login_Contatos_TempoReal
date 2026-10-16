import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getEcho } from '../echo.js';

const noop = { subscribe: () => () => {}, items: [], unread: 0, status: 'n/a', markRead: () => {} };
const RealtimeContext = createContext(noop);

let seq = 0;

/**
 * Assina o canal privado "admin" (Reverb) e distribui os eventos para:
 *  - sino de notificações + toasts
 *  - páginas que queiram atualizar dados em tempo real (via subscribe)
 */
export function RealtimeProvider({ children }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [status, setStatus] = useState('connecting');
  const listeners = useRef(new Set());

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  useEffect(() => {
    const echo = getEcho();
    const channel = echo.private('admin');
    const connection = echo.connector.pusher.connection;
    let wasConnected = false;

    const emit = (evt) => listeners.current.forEach((fn) => fn(evt));

    const push = (type, text, payload) => {
      const n = { id: ++seq, type, text, at: new Date() };
      setItems((p) => [n, ...p].slice(0, 30));
      setUnread((u) => u + 1);
      setToasts((p) => [...p, n]);
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== n.id)), 6000);
      emit({ type, payload });
    };

    channel.listen('.contact.created', (e) =>
      push('contact.created', `Novo contato: ${e.name} (${e.city}/${e.state}) — por ${e.operator}`, e));
    channel.listen('.contact.deleted', (e) =>
      push('contact.deleted', `Contato #${e.id} excluído por ${e.operator}`, e));
    channel.listen('.registration.requested', (e) =>
      push('registration.requested', `Nova solicitação de acesso: ${e.name}`, e));

    const onState = ({ current }) => {
      setStatus(current);
      // Após reconectar, eventos podem ter sido perdidos: pede que as telas ressincronizem
      if (current === 'connected') {
        if (wasConnected) emit({ type: 'reconnected' });
        wasConnected = true;
      }
    };
    connection.bind('state_change', onState);
    setStatus(connection.state);

    return () => {
      connection.unbind('state_change', onState);
      echo.leave('admin');
    };
  }, []);

  const markRead = useCallback(() => setUnread(0), []);

  return (
    <RealtimeContext.Provider value={{ subscribe, items, unread, status, markRead }}>
      {children}
      <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1080 }}>
        {toasts.map((t) => (
          <div key={t.id} className="toast show align-items-center text-bg-primary border-0 mb-2" role="alert">
            <div className="d-flex">
              <div className="toast-body">{t.text}</div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Fechar"
                onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
            </div>
          </div>
        ))}
      </div>
    </RealtimeContext.Provider>
  );
}

export const useRealtimeState = () => useContext(RealtimeContext);

/** Executa handler(evt) a cada evento em tempo real (no-op para operadores). */
export function useRealtime(handler) {
  const { subscribe } = useContext(RealtimeContext);
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe((evt) => ref.current(evt)), [subscribe]);
}
