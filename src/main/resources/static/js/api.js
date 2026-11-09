import { sessao, sair } from './auth.js';

/** Erro devolvido pela API no formato ErroResposta { status, erro, detalhes }. */
export class ApiError extends Error {
  constructor(status, corpo) {
    super(corpo?.erro || `A API respondeu com erro ${status}`);
    this.status = status;
    this.detalhes = corpo?.detalhes || [];
  }
}

async function requisicao(metodo, url, corpo) {
  const headers = {
    // Identifica as telas do sistema: a API não pede a janela de login do navegador.
    'X-Requested-With': 'XMLHttpRequest',
    Authorization: sessao()?.credencial || '',
  };
  if (corpo) headers['Content-Type'] = 'application/json';

  const resposta = await fetch(url, {
    method: metodo,
    headers,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  if (resposta.status === 401) {
    // Credencial ausente ou inválida: volta para o login.
    sair();
    location.replace('login.html?expirou=1');
  }
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new ApiError(resposta.status, dados);
  return dados;
}

export const api = {
  get: (url) => requisicao('GET', url),
  post: (url, corpo) => requisicao('POST', url, corpo),
  put: (url, corpo) => requisicao('PUT', url, corpo),
  patch: (url, corpo) => requisicao('PATCH', url, corpo),
  excluir: (url) => requisicao('DELETE', url),
};
