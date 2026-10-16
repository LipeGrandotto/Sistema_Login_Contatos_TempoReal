import axios from 'axios';

// Sessão por cookie HttpOnly + CSRF (XSRF-TOKEN -> X-XSRF-TOKEN, tratado pelo axios).
// Nenhum token fica em localStorage/sessionStorage, então XSS não consegue roubar a sessão.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

export const csrf = () => axios.get('/sanctum/csrf-cookie', { withCredentials: true });

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/login') && !url.endsWith('/me')) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

/** Normaliza erros do Laravel para { message, fields } */
export function parseError(error) {
  const res = error.response;
  if (!res) return { message: 'Sem conexão com o servidor.', fields: {} };
  if (res.status === 422) {
    const fields = Object.fromEntries(Object.entries(res.data.errors || {}).map(([k, v]) => [k, v[0]]));
    return { message: res.data.message || 'Dados inválidos.', fields };
  }
  if (res.status === 429) return { message: 'Muitas tentativas. Aguarde um instante e tente novamente.', fields: {} };
  if (res.status === 403) return { message: 'Você não tem permissão para isso.', fields: {} };
  return { message: res.data?.message || 'Erro inesperado.', fields: {} };
}
