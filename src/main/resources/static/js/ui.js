import { ApiError } from './api.js';

export const STATUS = {
  ABERTO: 'Aberto',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  FECHADO: 'Fechado',
};
export const PRIORIDADE = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };
export const PERFIL = { ADMIN: 'Administrador', TECNICO: 'Técnico' };

/** Escapa texto vindo da API antes de colocar no HTML. */
export function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export const numero = (id) => '#' + String(id).padStart(4, '0');

export function dataHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function relativo(iso) {
  if (!iso) return '—';
  const segundos = (Date.now() - new Date(iso).getTime()) / 1000;
  if (segundos < 60) return 'agora';
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h`;
  const dias = Math.floor(segundos / 86400);
  if (dias < 7) return dias === 1 ? 'ontem' : `há ${dias} dias`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function telefone(valor) {
  const d = String(valor || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor || '';
}

export function iniciais(nome) {
  const partes = String(nome || '?').trim().split(/\s+/);
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export const badgeStatus = (s) => `<span class="status status--${s.toLowerCase()}">${STATUS[s]}</span>`;
export const badgePrioridade = (p) =>
  `<span class="prio prio--${p.toLowerCase()} p--${p.toLowerCase()}">${PRIORIDADE[p]}</span>`;
export const badgePerfil = (p) => `<span class="perfil perfil--${p.toLowerCase()}">${PERFIL[p]}</span>`;

export function opcoes(mapa, selecionado = '', vazio = null) {
  const inicio = vazio === null ? '' : `<option value="">${vazio}</option>`;
  return inicio + Object.entries(mapa)
    .map(([v, rotulo]) => `<option value="${v}"${v === selecionado ? ' selected' : ''}>${rotulo}</option>`)
    .join('');
}

export function cabecalho(titulo, sub = '', acoes = '') {
  return `<header class="cabecalho">
    <div><h1>${titulo}</h1>${sub ? `<p class="cabecalho__sub">${sub}</p>` : ''}</div>
    ${acoes ? `<div class="cabecalho__acoes">${acoes}</div>` : ''}
  </header>`;
}

export function campo(nome, rotulo, controle, ajuda = '') {
  return `<div class="campo">
    <label for="${nome}">${rotulo}</label>
    ${controle}
    ${ajuda ? `<p class="campo__ajuda">${ajuda}</p>` : ''}
    <p class="campo__erro" data-erro="${nome}"></p>
  </div>`;
}

export function vazio(titulo, texto, acao = '') {
  return `<div class="vazio"><h2>${titulo}</h2><p>${texto}</p>${acao ? `<p>${acao}</p>` : ''}</div>`;
}

/** Barra "Mostrando 1–10 de 23" + Anterior/Próxima, a partir do objeto "page" da API. */
export function paginacao(page, linkPara) {
  if (!page || page.totalElements === 0) return '';
  const inicio = page.number * page.size + 1;
  const fim = Math.min(inicio + page.size - 1, page.totalElements);
  const temAnterior = page.number > 0;
  const temProxima = page.number < page.totalPages - 1;
  const botoes = page.totalPages > 1 ? `<div class="paginacao__botoes">
      <a class="botao botao--pequeno" href="${linkPara(page.number - 1)}"${temAnterior ? '' : ' aria-disabled="true" tabindex="-1"'}>Anterior</a>
      <a class="botao botao--pequeno" href="${linkPara(page.number + 1)}"${temProxima ? '' : ' aria-disabled="true" tabindex="-1"'}>Próxima</a>
    </div>` : '';
  return `<div class="paginacao"><span>Mostrando ${inicio}–${fim} de ${page.totalElements}</span>${botoes}</div>`;
}

/** Lê o formulário como objeto; campo vazio vira null e [data-numero] vira número. */
export function lerForm(form) {
  const dados = {};
  for (const [chave, valor] of new FormData(form)) {
    const texto = String(valor).trim();
    const ehNumero = form.elements[chave]?.dataset?.numero !== undefined;
    dados[chave] = texto === '' ? null : ehNumero ? Number(texto) : texto;
  }
  return dados;
}

export function limparErros(form) {
  form.querySelectorAll('[data-erro]').forEach((p) => { p.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
  const geral = form.querySelector('[data-erro-geral]');
  if (geral) geral.hidden = true;
}

export function mensagemDe(erro) {
  if (erro instanceof ApiError) return erro.message;
  return 'Não foi possível falar com a API. Confira se a aplicação está rodando.';
}

/** Coloca cada "campo: mensagem" do erro 400 embaixo do campo; o resto vai para o topo do formulário. */
export function mostrarErros(form, erro) {
  const soltas = [];
  const detalhes = erro instanceof ApiError ? erro.detalhes : [];
  for (const item of detalhes) {
    const [nome, ...resto] = item.split(':');
    const alvo = form.querySelector(`[data-erro="${nome.trim()}"]`);
    if (alvo) {
      alvo.textContent = resto.join(':').trim();
      form.elements[nome.trim()]?.setAttribute?.('aria-invalid', 'true');
    } else {
      soltas.push(item);
    }
  }
  const geral = form.querySelector('[data-erro-geral]');
  const temErroDeCampo = detalhes.length > soltas.length;
  if (geral && (!temErroDeCampo || soltas.length)) {
    geral.textContent = soltas.length ? soltas.join(' · ') : mensagemDe(erro);
    geral.hidden = false;
  }
  form.querySelector('[aria-invalid="true"]')?.focus();
}

export function aviso(texto, tipo = 'ok') {
  const caixa = document.createElement('div');
  caixa.className = `aviso${tipo === 'erro' ? ' aviso--erro' : ''}`;
  caixa.textContent = texto;
  document.getElementById('avisos').append(caixa);
  setTimeout(() => caixa.remove(), tipo === 'erro' ? 6000 : 3500);
}

/** Exclusão em dois cliques: o primeiro pede confirmação, o segundo executa. */
export function confirmarClique(botao, rotuloConfirmar, acao) {
  const original = botao.textContent;
  let timer = null;
  botao.addEventListener('click', async () => {
    if (!botao.classList.contains('botao--confirmar')) {
      botao.classList.add('botao--confirmar');
      botao.textContent = rotuloConfirmar;
      timer = setTimeout(() => {
        botao.classList.remove('botao--confirmar');
        botao.textContent = original;
      }, 4000);
      return;
    }
    clearTimeout(timer);
    botao.disabled = true;
    try {
      await acao();
    } finally {
      botao.disabled = false;
      botao.classList.remove('botao--confirmar');
      botao.textContent = original;
    }
  });
}

/** Desabilita o botão de envio enquanto a requisição está em andamento. */
export async function enviando(form, tarefa) {
  const botao = form.querySelector('[type="submit"]');
  if (botao) botao.disabled = true;
  try {
    await tarefa();
  } finally {
    if (botao) botao.disabled = false;
  }
}
