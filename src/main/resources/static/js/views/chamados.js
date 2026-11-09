import { api } from '../api.js';
import {
  esc, numero, dataHora, relativo, badgeStatus, badgePrioridade, STATUS, PRIORIDADE,
  opcoes, cabecalho, campo, vazio, paginacao, lerForm, limparErros, mostrarErros, aviso, enviando,
} from '../ui.js';

const ORDENS = {
  recentes: { rotulo: 'Mais recentes', sort: 'dataAbertura,desc' },
  antigos: { rotulo: 'Mais antigos', sort: 'dataAbertura,asc' },
  titulo: { rotulo: 'Título (A–Z)', sort: 'titulo,asc' },
};

/** Tabela de chamados usada na lista geral e no detalhe do cliente. */
export function tabelaChamados(lista, { mostrarCliente = true } = {}) {
  const linhas = lista.map((c) => `
    <tr class="p--${c.prioridade.toLowerCase()}" data-href="#/chamados/${c.id}">
      <td class="mono">${numero(c.id)}</td>
      <td>
        <a class="tabela__titulo" href="#/chamados/${c.id}">${esc(c.titulo)}</a>
        <span class="tabela__sub">${esc(c.categoriaNome)}</span>
      </td>
      ${mostrarCliente ? `<td>${esc(c.clienteNome)}</td>` : ''}
      <td>${badgePrioridade(c.prioridade)}</td>
      <td>${badgeStatus(c.status)}</td>
      <td>${c.tecnicoNome ? esc(c.tecnicoNome) : '<span class="vazio-inline">Sem técnico</span>'}</td>
      <td title="${dataHora(c.dataAbertura)}">${relativo(c.dataAbertura)}</td>
    </tr>`).join('');

  return `<div class="tabela-rolagem"><table class="tabela tabela--chamados">
    <thead><tr>
      <th scope="col">Nº</th><th scope="col">Assunto</th>
      ${mostrarCliente ? '<th scope="col">Cliente</th>' : ''}
      <th scope="col">Prioridade</th><th scope="col">Status</th>
      <th scope="col">Técnico</th><th scope="col">Aberto</th>
    </tr></thead>
    <tbody>${linhas}</tbody>
  </table></div>`;
}

export async function lista({ el, params }) {
  const filtros = {
    status: params.get('status') || '',
    prioridade: params.get('prioridade') || '',
    clienteId: params.get('clienteId') || '',
    ordem: ORDENS[params.get('ordem')] ? params.get('ordem') : 'recentes',
    page: Number(params.get('page') || 0),
  };

  const consulta = new URLSearchParams({ page: filtros.page, size: 10, sort: ORDENS[filtros.ordem].sort });
  for (const chave of ['status', 'prioridade', 'clienteId']) {
    if (filtros[chave]) consulta.set(chave, filtros[chave]);
  }
  const [dados, clientes] = await Promise.all([api.get(`/chamados?${consulta}`), api.get('/clientes')]);

  /** Monta o link mantendo os filtros atuais; qualquer mudança volta para a página 0. */
  const link = (mudancas) => {
    const f = { ...filtros, page: 0, ...mudancas };
    const p = new URLSearchParams();
    if (f.status) p.set('status', f.status);
    if (f.prioridade) p.set('prioridade', f.prioridade);
    if (f.clienteId) p.set('clienteId', f.clienteId);
    if (f.ordem !== 'recentes') p.set('ordem', f.ordem);
    if (f.page > 0) p.set('page', f.page);
    return '#/chamados' + (p.toString() ? `?${p}` : '');
  };

  const total = dados.page.totalElements;
  const filtrando = Boolean(filtros.status || filtros.prioridade || filtros.clienteId);
  const subtitulo = `${total} ${total === 1 ? 'chamado' : 'chamados'}${filtrando ? ' com os filtros atuais' : ''}`;

  const abas = [['', 'Todos'], ...Object.entries(STATUS)].map(([valor, rotulo]) => {
    const atual = filtros.status === valor;
    return `<a class="aba" href="${link({ status: valor })}"${atual ? ' aria-current="page"' : ''}>${rotulo}</a>`;
  }).join('');

  const corpo = dados.content.length
    ? tabelaChamados(dados.content) + paginacao(dados.page, (n) => link({ page: n }))
    : filtrando
      ? vazio('Nenhum chamado com esses filtros', 'Tente outra combinação ou limpe os filtros.', '<a class="botao" href="#/chamados">Limpar filtros</a>')
      : vazio('Nenhum chamado aberto ainda', 'Quando um cliente relatar um problema, registre aqui.', '<a class="botao botao--primario" href="#/chamados/novo">Abrir chamado</a>');

  el.innerHTML = `
    ${cabecalho('Chamados', subtitulo, '<a class="botao botao--primario" href="#/chamados/novo">Abrir chamado</a>')}
    <nav class="abas" aria-label="Filtrar por status">${abas}</nav>
    <form class="filtros" id="filtros">
      <label class="campo"><span>Prioridade</span>
        <select name="prioridade">${opcoes(PRIORIDADE, filtros.prioridade, 'Todas')}</select>
      </label>
      <label class="campo"><span>Cliente</span>
        <select name="clienteId"><option value="">Todos</option>${clientes.map((c) =>
          `<option value="${c.id}"${String(c.id) === filtros.clienteId ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
        </select>
      </label>
      <label class="campo"><span>Ordenar por</span>
        <select name="ordem">${Object.entries(ORDENS).map(([v, o]) =>
          `<option value="${v}"${v === filtros.ordem ? ' selected' : ''}>${o.rotulo}</option>`).join('')}
        </select>
      </label>
      ${filtrando ? '<a class="link-discreto" href="#/chamados">Limpar filtros</a>' : ''}
    </form>
    <section class="painel painel--tabela">${corpo}</section>`;

  el.querySelector('#filtros').addEventListener('change', (e) => {
    const f = new FormData(e.currentTarget);
    location.hash = link({ prioridade: f.get('prioridade'), clienteId: f.get('clienteId'), ordem: f.get('ordem') });
  });
}

/** Abrir chamado (sem id) ou editar chamado existente (com id). */
export async function formulario({ el, m, params }) {
  const id = m[1];
  const [clientes, categorias, atual] = await Promise.all([
    api.get('/clientes'),
    api.get('/categorias'),
    id ? api.get(`/chamados/${id}`) : null,
  ]);

  const trilha = `<nav class="trilha"><a href="#/chamados">Chamados</a><span aria-hidden="true">/</span>${
    id ? `<a href="#/chamados/${id}">${numero(id)}</a><span aria-hidden="true">/</span><span>Editar</span>` : '<span>Novo</span>'}</nav>`;

  if (atual?.status === 'FECHADO') {
    el.innerHTML = `${trilha}${cabecalho('Editar chamado')}
      <div class="painel painel--nota"><p>Este chamado está fechado e não pode mais ser editado.</p></div>`;
    return;
  }

  const clienteSelecionado = String(atual?.clienteId ?? params.get('clienteId') ?? '');
  const prioridadeAtual = atual?.prioridade || 'MEDIA';
  const faltando = [];
  if (!clientes.length) faltando.push('<a href="#/clientes/novo">cadastre um cliente</a>');
  if (!categorias.length) faltando.push('<a href="#/categorias">cadastre uma categoria</a>');

  el.innerHTML = `
    ${trilha}
    ${cabecalho(id ? 'Editar chamado' : 'Abrir chamado', id ? '' : 'O chamado começa com status Aberto e sem técnico atribuído.')}
    ${faltando.length ? `<p class="alerta">Antes de abrir um chamado, ${faltando.join(' e ')}.</p>` : ''}
    <form class="painel formulario" id="form-chamado" novalidate>
      <p class="erro-geral" data-erro-geral hidden></p>
      ${campo('titulo', 'Título', `<input id="titulo" name="titulo" maxlength="150" value="${esc(atual?.titulo)}" placeholder="Ex.: Impressora do financeiro não liga">`)}
      ${campo('descricao', 'Descrição', `<textarea id="descricao" name="descricao" rows="6" maxlength="2000">${esc(atual?.descricao)}</textarea>`,
        'Conte o que está acontecendo, desde quando e o que já foi tentado.')}
      <fieldset class="campo">
        <legend>Prioridade</legend>
        <div class="segmentado">${Object.entries(PRIORIDADE).map(([v, rotulo]) => `
          <label class="segmentado__op p--${v.toLowerCase()}">
            <input type="radio" name="prioridade" value="${v}"${v === prioridadeAtual ? ' checked' : ''}>
            <span>${rotulo}</span>
          </label>`).join('')}
        </div>
        <p class="campo__erro" data-erro="prioridade"></p>
      </fieldset>
      <div class="grade-2">
        ${campo('clienteId', 'Cliente', `<select id="clienteId" name="clienteId" data-numero>
          <option value="">Selecione</option>
          ${clientes.map((c) => `<option value="${c.id}"${String(c.id) === clienteSelecionado ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
        </select>`)}
        ${campo('categoriaId', 'Categoria', `<select id="categoriaId" name="categoriaId" data-numero>
          <option value="">Selecione</option>
          ${categorias.map((c) => `<option value="${c.id}"${c.id === atual?.categoriaId ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
        </select>`)}
      </div>
      <div class="formulario__acoes">
        <button class="botao botao--primario" type="submit">${id ? 'Salvar alterações' : 'Abrir chamado'}</button>
        <a class="botao" href="${id ? `#/chamados/${id}` : '#/chamados'}">Cancelar</a>
      </div>
    </form>`;

  const form = el.querySelector('#form-chamado');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    limparErros(form);
    enviando(form, async () => {
      try {
        const dados = lerForm(form);
        const salvo = id ? await api.put(`/chamados/${id}`, dados) : await api.post('/chamados', dados);
        aviso(id ? 'Chamado atualizado.' : `Chamado ${numero(salvo.id)} aberto.`);
        location.hash = `#/chamados/${salvo.id}`;
      } catch (erro) {
        mostrarErros(form, erro);
      }
    });
  });
}
