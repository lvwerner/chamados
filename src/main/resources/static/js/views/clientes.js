import { api } from '../api.js';
import { pode } from '../auth.js';
import {
  esc, telefone, cabecalho, campo, vazio, paginacao, lerForm, limparErros, mostrarErros,
  mensagemDe, aviso, confirmarClique, enviando,
} from '../ui.js';
import { tabelaChamados } from './chamados.js';

export async function lista({ el }) {
  const clientes = await api.get('/clientes');
  const novo = '<a class="botao botao--primario" href="#/clientes/novo">Novo cliente</a>';

  if (!clientes.length) {
    el.innerHTML = `${cabecalho('Clientes', 'Nenhum cliente cadastrado', novo)}
      <section class="painel painel--tabela">${vazio('Nenhum cliente cadastrado', 'Cadastre o primeiro cliente para poder abrir chamados em nome dele.', novo)}</section>`;
    return;
  }

  el.innerHTML = `
    ${cabecalho('Clientes', `${clientes.length} ${clientes.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}`, novo)}
    <div class="filtros">
      <label class="campo busca"><span class="visualmente-oculto">Buscar cliente</span>
        <input type="search" id="busca" placeholder="Buscar por nome ou e-mail" autocomplete="off">
      </label>
    </div>
    <section class="painel painel--tabela">
      <div class="tabela-rolagem"><table class="tabela">
        <thead><tr><th scope="col">Nome</th><th scope="col">E-mail</th><th scope="col">Telefone</th></tr></thead>
        <tbody id="linhas"></tbody>
      </table></div>
      <p class="vazio" id="sem-resultado" hidden>Nenhum cliente encontrado para essa busca.</p>
    </section>`;

  const corpo = el.querySelector('#linhas');
  const busca = el.querySelector('#busca');
  const desenhar = () => {
    const termo = busca.value.trim().toLowerCase();
    const filtrados = clientes.filter((c) =>
      !termo || c.nome.toLowerCase().includes(termo) || c.email.toLowerCase().includes(termo));
    corpo.innerHTML = filtrados.map((c) => `
      <tr data-href="#/clientes/${c.id}">
        <td><a class="tabela__titulo" href="#/clientes/${c.id}">${esc(c.nome)}</a></td>
        <td>${esc(c.email)}</td>
        <td>${c.telefone ? esc(telefone(c.telefone)) : '<span class="vazio-inline">—</span>'}</td>
      </tr>`).join('');
    el.querySelector('#sem-resultado').hidden = filtrados.length > 0;
  };
  busca.addEventListener('input', desenhar);
  desenhar();
}

export async function detalhe({ el, m, params }) {
  const id = m[1];
  const page = Number(params.get('page') || 0);
  const [cliente, chamados] = await Promise.all([
    api.get(`/clientes/${id}`),
    api.get(`/clientes/${id}/chamados?page=${page}&size=10`),
  ]);

  el.innerHTML = `
    <nav class="trilha"><a href="#/clientes">Clientes</a><span aria-hidden="true">/</span><span>${esc(cliente.nome)}</span></nav>
    <header class="cabecalho">
      <div>
        <h1>${esc(cliente.nome)}</h1>
        <p class="cabecalho__meta">
          <a href="mailto:${esc(cliente.email)}">${esc(cliente.email)}</a>
          ${cliente.telefone ? `<span>${esc(telefone(cliente.telefone))}</span>` : ''}
        </p>
      </div>
      <div class="cabecalho__acoes">
        <a class="botao" href="#/clientes/${id}/editar">Editar</a>
        ${pode('ADMIN') ? '<button class="botao botao--perigo" type="button" id="excluir">Excluir</button>' : ''}
      </div>
    </header>
    <section class="painel painel--tabela">
      <div class="painel__topo">
        <h2 class="painel__titulo">Chamados <span class="contador">${chamados.page.totalElements}</span></h2>
        <a class="botao botao--pequeno" href="#/chamados/novo?clienteId=${id}">Abrir chamado</a>
      </div>
      ${chamados.content.length
        ? tabelaChamados(chamados.content, { mostrarCliente: false })
          + paginacao(chamados.page, (n) => `#/clientes/${id}${n > 0 ? `?page=${n}` : ''}`)
        : '<p class="vazio">Este cliente ainda não abriu chamados.</p>'}
    </section>`;

  const botaoExcluir = el.querySelector('#excluir');
  if (botaoExcluir) confirmarClique(botaoExcluir, 'Confirmar exclusão', async () => {
    try {
      await api.excluir(`/clientes/${id}`);
      aviso('Cliente excluído.');
      location.hash = '#/clientes';
    } catch (erro) {
      aviso(mensagemDe(erro), 'erro');
    }
  });
}

export async function formulario({ el, m }) {
  const id = m[1];
  const atual = id ? await api.get(`/clientes/${id}`) : null;
  const voltar = id ? `#/clientes/${id}` : '#/clientes';

  el.innerHTML = `
    <nav class="trilha"><a href="#/clientes">Clientes</a><span aria-hidden="true">/</span>${
      id ? `<a href="${voltar}">${esc(atual.nome)}</a><span aria-hidden="true">/</span><span>Editar</span>` : '<span>Novo</span>'}</nav>
    ${cabecalho(id ? 'Editar cliente' : 'Novo cliente')}
    <form class="painel formulario" id="form-cliente" novalidate>
      <p class="erro-geral" data-erro-geral hidden></p>
      ${campo('nome', 'Nome', `<input id="nome" name="nome" maxlength="100" autocomplete="name" value="${esc(atual?.nome)}">`)}
      <div class="grade-2">
        ${campo('email', 'E-mail', `<input id="email" name="email" type="email" maxlength="120" autocomplete="email" value="${esc(atual?.email)}">`)}
        ${campo('telefone', 'Telefone', `<input id="telefone" name="telefone" maxlength="20" inputmode="tel" value="${esc(atual?.telefone)}" placeholder="47999999999">`, 'Opcional.')}
      </div>
      <div class="formulario__acoes">
        <button class="botao botao--primario" type="submit">${id ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
        <a class="botao" href="${voltar}">Cancelar</a>
      </div>
    </form>`;

  const form = el.querySelector('#form-cliente');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    limparErros(form);
    enviando(form, async () => {
      try {
        const dados = lerForm(form);
        const salvo = id ? await api.put(`/clientes/${id}`, dados) : await api.post('/clientes', dados);
        aviso(id ? 'Cliente atualizado.' : 'Cliente cadastrado.');
        location.hash = `#/clientes/${salvo.id}`;
      } catch (erro) {
        mostrarErros(form, erro);
      }
    });
  });
}
