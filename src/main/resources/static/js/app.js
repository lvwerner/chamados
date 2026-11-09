import { ApiError } from './api.js';
import { sessao, sair, NOME_PAPEL } from './auth.js';
import { esc, iniciais } from './ui.js';
import * as chamados from './views/chamados.js';
import { detalhe as detalheChamado } from './views/chamado.js';
import * as clientes from './views/clientes.js';
import { categorias } from './views/categorias.js';
import { tecnicos } from './views/tecnicos.js';

/** Rotas por hash (#/caminho): cada uma aponta para a função que desenha a tela. */
const rotas = [
  [/^\/chamados$/, chamados.lista],
  [/^\/chamados\/novo$/, chamados.formulario],
  [/^\/chamados\/(\d+)$/, detalheChamado],
  [/^\/chamados\/(\d+)\/editar$/, chamados.formulario],
  [/^\/clientes$/, clientes.lista],
  [/^\/clientes\/novo$/, clientes.formulario],
  [/^\/clientes\/(\d+)$/, clientes.detalhe],
  [/^\/clientes\/(\d+)\/editar$/, clientes.formulario],
  [/^\/categorias$/, categorias],
  [/^\/tecnicos$/, tecnicos],
];

const el = document.getElementById('conteudo');

function paginaErro(erro, secao) {
  const voltar = `<a class="botao" href="#/${secao || 'chamados'}">Voltar para a lista</a>`;
  let titulo = 'Algo deu errado';
  let texto = esc(erro?.message || 'Erro inesperado.');
  if (erro instanceof ApiError && erro.status === 404) {
    titulo = 'Registro não encontrado';
  } else if (!(erro instanceof ApiError) && !erro?.rotaInexistente) {
    titulo = 'Sem conexão com a API';
    texto = 'Confira se a aplicação Spring Boot está rodando e recarregue a página.';
  }
  el.innerHTML = `<section class="painel"><div class="vazio"><h2>${titulo}</h2><p>${texto}</p><p>${voltar}</p></div></section>`;
}

async function desenhar() {
  const [caminho, consulta = ''] = (location.hash.slice(1) || '/chamados').split('?');
  const params = new URLSearchParams(consulta);
  const secao = caminho.split('/')[1];

  document.querySelectorAll('.menu a').forEach((link) => {
    if (link.dataset.secao === secao) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const rota = rotas.find(([padrao]) => padrao.test(caminho));
  if (!rota) {
    paginaErro({ message: 'Esse endereço não existe no sistema.', rotaInexistente: true }, secao);
    return;
  }

  el.setAttribute('aria-busy', 'true');
  try {
    await rota[1]({ el, m: caminho.match(rota[0]), params, recarregar: desenhar });
  } catch (erro) {
    paginaErro(erro, secao);
  } finally {
    el.removeAttribute('aria-busy');
    const h1 = el.querySelector('h1, .vazio h2');
    document.title = h1 ? `${h1.textContent.trim()} · Central de Chamados` : 'Central de Chamados';
  }
}

// Clicar em qualquer ponto de uma linha da tabela abre o registro.
el.addEventListener('click', (e) => {
  const linha = e.target.closest('tr[data-href]');
  if (!linha || e.target.closest('a, button, input, select, textarea')) return;
  location.hash = linha.dataset.href;
});

window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  desenhar();
});

function mostrarUsuario(atual) {
  const caixa = document.getElementById('usuario');
  caixa.innerHTML = `
    <div class="usuario__nome">
      <span class="avatar" aria-hidden="true">${esc(iniciais(atual.usuario))}</span>
      <span>${esc(atual.usuario)}<small>${NOME_PAPEL[atual.papel] || atual.papel}</small></span>
    </div>
    <button class="usuario__sair" type="button" id="sair">Sair</button>`;
  caixa.querySelector('#sair').addEventListener('click', () => {
    sair();
    location.replace('login.html');
  });
}

// Sem sessão, nenhuma tela é desenhada: vai para o login.
const atual = sessao();
if (!atual) {
  location.replace('login.html');
} else {
  mostrarUsuario(atual);
  if (!location.hash) history.replaceState(null, '', '#/chamados');
  desenhar();
}
