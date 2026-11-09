/**
 * Sessão do usuário no navegador. Guardada no sessionStorage, que é apagado ao
 * fechar a aba. A API não tem sessão: cada requisição leva o cabeçalho Authorization.
 */
const CHAVE = 'chamados.sessao';
const NIVEL = { USUARIO: 1, TECNICO: 2, ADMIN: 3 };
export const NOME_PAPEL = { USUARIO: 'Usuário', TECNICO: 'Técnico', ADMIN: 'Administrador' };

export function sessao() {
  try { return JSON.parse(sessionStorage.getItem(CHAVE)); } catch { return null; }
}

export function salvarSessao(dados) {
  sessionStorage.setItem(CHAVE, JSON.stringify(dados));
}

export function sair() {
  try { sessionStorage.removeItem(CHAVE); } catch { /* navegador sem armazenamento */ }
}

/** Monta o valor do cabeçalho HTTP Basic: "Basic " + base64("usuario:senha"). */
export function credencial(usuario, senha) {
  const bytes = new TextEncoder().encode(`${usuario}:${senha}`);
  return 'Basic ' + btoa(String.fromCharCode(...bytes));
}

/** O usuário logado tem pelo menos este papel? (ADMIN > TECNICO > USUARIO) */
export function pode(papelMinimo) {
  const atual = sessao();
  return Boolean(atual) && NIVEL[atual.papel] >= NIVEL[papelMinimo];
}
