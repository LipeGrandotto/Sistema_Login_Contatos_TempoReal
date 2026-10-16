import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { api, csrf } from './api.js';

window.Pusher = Pusher;

let echo = null;

/** Singleton do Echo (Reverb). Canais privados são autorizados pela sessão via cookie. */
export function getEcho() {
  if (!echo) {
    const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
    echo = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
      wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
      wssPort: Number(import.meta.env.VITE_REVERB_PORT || 443),
      forceTLS: scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      // Autorização via axios (mesma origem: cookie de sessão + X-XSRF-TOKEN) — sem token em storage
      channelAuthorization: {
        customHandler: ({ socketId, channelName }, callback) => {
          csrf()
            .then(() => api.post('/broadcasting/auth', { socket_id: socketId, channel_name: channelName }))
            .then((r) => callback(null, r.data))
            .catch((e) => callback(e, null));
        },
      },
    });
  }
  return echo;
}

export function disconnectEcho() {
  if (echo) {
    echo.disconnect();
    echo = null;
  }
}
