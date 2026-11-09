import { api } from '../api.js';
import { pode, sessao } from '../auth.js';
import {
  esc, numero, dataHora, relativo, iniciais, badgeStatus, badgePrioridade, STATUS, campo,
  lerForm, limparErros, mostrarErros, mensagemDe, aviso, confirmarClique, enviando,
} from '../ui.js';

const CHAVE_AUTOR = 'chamados.autor';

function autorLembrado() {
  try { return localStorage.getItem(CHAVE_AUTOR) || sessao()?.usuario || ''; } catch { return sessao()?.usuario || ''; }
}
function lembrarAutor(nome) {
  try { localStorage.setItem(CHAVE_AUTOR, nome); } catch { /* navegador sem armazenamento */ }
}

function comentarios(c, fechado) {
  const itens = c.comentarios.length
    ? `<ol class="linha-tempo">${c.comentarios.map((k) => `
        <li class="linha-tempo__item">
          <div class="avatar" aria-hidden="true">${esc(iniciais(k.autor))}</div>
          <div>
            <p class="linha-tempo__meta"><strong>${esc(k.autor)}</strong>
              <time datetime="${k.data}" title="${dataHora(k.data)}">${relativo(k.data)}</time></p>
            <p class="texto-livre">${esc(k.texto)}</p>
          </div>
        </li>`).join('')}</ol>`
    : '<p class="nota">Nenhum comentário ainda.</p>';

  const formulario = fechado
    ? '<p class="nota">Chamado fechado não recebe novos comentários.</p>'
    : `<form class="form-comentario" id="form-comentario" novalidate>
        <p class="erro-geral" data-erro-geral hidden></p>
        ${campo('texto', 'Novo comentário', '<textarea id="texto" name="texto" rows="3" maxlength="1000" placeholder="Registre o andamento ou a resposta dada ao cliente"></textarea>')}
        <div class="form-comentario__rodape">
          ${campo('autor', 'Autor', `<input id="autor" name="autor" maxlength="100" value="${esc(autorLembrado())}">`)}
          <button class="botao botao--primario" type="submit">Comentar</button>
        </div>
      </form>`;

  return `<section class="painel">
    <h2 class="painel__titulo">Comentários <span class="contador">${c.comentarios.length}</span></h2>
    ${itens}${c.comentarios.length || !fechado ? formulario : ''}
  </section>`;
}

/** Ações de andamento conforme o papel: status a partir de TECNICO, atribuição só ADMIN. */
function andamento(c, tecnicos) {
  const mudaStatus = pode('TECNICO');
  const atribui = pode('ADMIN');
  if (!mudaStatus && !atribui) {
    return `<section class="painel painel--nota"><p>Status e técnico são alterados pela equipe de suporte.</p></section>`;
  }

  const opcoesStatus = Object.entries(STATUS)
    .filter(([v]) => v !== c.status)
    .map(([v, rotulo]) => `<option value="${v}">${rotulo}</option>`).join('');

  const tecnico = tecnicos.length
    ? `<div class="acao__linha">
        <select id="tecnicoId" name="tecnicoId" data-numero>${tecnicos.map((t) =>
          `<option value="${t.id}"${t.id === c.tecnicoId ? ' selected' : ''}>${esc(t.nome)}</option>`).join('')}
        </select>
        <button class="botao" type="submit">Atribuir</button>
      </div>`
    : '<p class="nota">Nenhum técnico cadastrado. <a href="#/tecnicos">Cadastrar técnico</a></p>';

  return `<section class="painel" id="andamento">
    <h2 class="painel__titulo">Andamento</h2>
    ${mudaStatus ? `<form class="acao" id="form-status">
      <label for="status">Mudar status para</label>
      <div class="acao__linha">
        <select id="status" name="status">${opcoesStatus}</select>
        <button class="botao" type="submit">Aplicar</button>
      </div>
    </form>` : ''}
    ${atribui ? `<form class="acao" id="form-tecnico">
      <label for="tecnicoId">${c.tecnicoId ? 'Trocar técnico' : 'Atribuir técnico'}</label>
      ${tecnico}
    </form>` : ''}
    <p class="erro-geral" data-erro-geral hidden></p>
  </section>`;
}

export async function detalhe({ el, m, recarregar }) {
  const id = m[1];
  const [c, tecnicos] = await Promise.all([api.get(`/chamados/${id}`), api.get('/tecnicos')]);
  const fechado = c.status === 'FECHADO';

  el.innerHTML = `
    <nav class="trilha"><a href="#/chamados">Chamados</a><span aria-hidden="true">/</span><span>${numero(c.id)}</span></nav>
    <header class="cabecalho">
      <div>
        <p class="mono numero">${numero(c.id)} · ${esc(c.categoriaNome)}</p>
        <h1>${esc(c.titulo)}</h1>
        <p class="cabecalho__meta">
          ${badgeStatus(c.status)} ${badgePrioridade(c.prioridade)}
          <span>Aberto ${relativo(c.dataAbertura)} por <a href="#/clientes/${c.clienteId}">${esc(c.clienteNome)}</a></span>
        </p>
      </div>
      ${fechado ? '' : `<div class="cabecalho__acoes"><a class="botao" href="#/chamados/${id}/editar">Editar</a></div>`}
    </header>

    <div class="detalhe">
      <div class="detalhe__principal">
        <section class="painel">
          <h2 class="painel__titulo">Descrição</h2>
          <p class="texto-livre">${esc(c.descricao)}</p>
        </section>
        ${comentarios(c, fechado)}
      </div>

      <aside class="detalhe__lateral">
        <section class="painel">
          <h2 class="painel__titulo">Informações</h2>
          <dl class="dados">
            <div><dt>Cliente</dt><dd><a href="#/clientes/${c.clienteId}">${esc(c.clienteNome)}</a></dd></div>
            <div><dt>Categoria</dt><dd>${esc(c.categoriaNome)}</dd></div>
            <div><dt>Técnico</dt><dd>${c.tecnicoNome ? esc(c.tecnicoNome) : '<span class="vazio-inline">Sem técnico</span>'}</dd></div>
            <div><dt>Aberto em</dt><dd>${dataHora(c.dataAbertura)}</dd></div>
            <div><dt>Fechado em</dt><dd>${dataHora(c.dataFechamento)}</dd></div>
          </dl>
        </section>
        ${fechado
          ? `<section class="painel painel--nota"><p>Fechado em ${dataHora(c.dataFechamento)}. Chamados fechados não aceitam mais alterações.</p></section>`
          : andamento(c, tecnicos)}
        ${pode('ADMIN') ? `<section class="painel">
          <button class="botao botao--perigo" type="button" id="excluir">Excluir chamado</button>
          <p class="campo__ajuda" style="margin-top:8px">Remove o chamado e todos os comentários.</p>
        </section>` : ''}
      </aside>
    </div>`;

  const formComentario = el.querySelector('#form-comentario');
  formComentario?.addEventListener('submit', (e) => {
    e.preventDefault();
    limparErros(formComentario);
    enviando(formComentario, async () => {
      try {
        const dados = lerForm(formComentario);
        await api.post(`/chamados/${id}/comentarios`, dados);
        if (dados.autor) lembrarAutor(dados.autor);
        aviso('Comentário registrado.');
        await recarregar();
      } catch (erro) {
        mostrarErros(formComentario, erro);
      }
    });
  });

  const painelAndamento = el.querySelector('#andamento');
  const erroAndamento = painelAndamento?.querySelector('[data-erro-geral]');
  const acaoAndamento = (form, executar, mensagem) => form?.addEventListener('submit', (e) => {
    e.preventDefault();
    erroAndamento.hidden = true;
    enviando(form, async () => {
      try {
        await executar(lerForm(form));
        aviso(mensagem);
        await recarregar();
      } catch (erro) {
        erroAndamento.textContent = mensagemDe(erro);
        erroAndamento.hidden = false;
      }
    });
  });
  acaoAndamento(el.querySelector('#form-status'), (d) => api.patch(`/chamados/${id}/status`, d), 'Status atualizado.');
  acaoAndamento(el.querySelector('#form-tecnico'), (d) => api.patch(`/chamados/${id}/atribuir`, d), 'Técnico atribuído.');

  const botaoExcluir = el.querySelector('#excluir');
  if (botaoExcluir) confirmarClique(botaoExcluir, 'Confirmar exclusão', async () => {
    try {
      await api.excluir(`/chamados/${id}`);
      aviso(`Chamado ${numero(id)} excluído.`);
      location.hash = '#/chamados';
    } catch (erro) {
      aviso(mensagemDe(erro), 'erro');
    }
  });
}
