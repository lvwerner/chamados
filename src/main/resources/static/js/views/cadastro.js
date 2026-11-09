import { api } from '../api.js';
import { pode } from '../auth.js';
import {
  esc, cabecalho, vazio, lerForm, limparErros, mostrarErros, mensagemDe, aviso, confirmarClique, enviando,
} from '../ui.js';

/**
 * Tela de cadastro simples (lista + formulário lateral), usada por categorias e técnicos.
 * A edição usa ?editar=id na URL para o formulário carregar o registro.
 */
export function cadastroSimples(cfg) {
  return async function pagina({ el, params, recarregar }) {
    const itens = await api.get(`/${cfg.caminho}`);
    // Todos consultam; só o administrador cadastra, edita e exclui (igual à regra da API).
    const gerencia = pode('ADMIN');
    const editarId = gerencia ? params.get('editar') : null;
    const atual = editarId ? itens.find((i) => String(i.id) === editarId) : null;

    const tabela = itens.length
      ? `<div class="tabela-rolagem"><table class="tabela">
          <thead><tr>
            ${cfg.colunas.map((c) => `<th scope="col">${c.rotulo}</th>`).join('')}
            ${gerencia ? '<th scope="col"><span class="visualmente-oculto">Ações</span></th>' : ''}
          </tr></thead>
          <tbody>${itens.map((item) => `
            <tr${atual?.id === item.id ? ' class="linha--editando"' : ''}>
              ${cfg.colunas.map((c) => `<td>${c.valor(item)}</td>`).join('')}
              ${gerencia ? `<td><div class="acoes-linha">
                <a class="botao botao--pequeno" href="#/${cfg.caminho}?editar=${item.id}">Editar</a>
                <button class="botao botao--pequeno botao--perigo" type="button" data-excluir="${item.id}">Excluir</button>
              </div></td>` : ''}
            </tr>`).join('')}
          </tbody>
        </table></div>`
      : vazio(cfg.vazioTitulo, cfg.vazioTexto);

    if (!gerencia) {
      el.innerHTML = `
        ${cabecalho(cfg.titulo, cfg.subtitulo(itens.length))}
        <section class="painel painel--tabela">${tabela}</section>
        <p class="nota" style="margin-top:12px">Somente administradores cadastram, editam ou excluem ${cfg.titulo.toLowerCase()}.</p>`;
      return;
    }

    el.innerHTML = `
      ${cabecalho(cfg.titulo, cfg.subtitulo(itens.length))}
      <div class="cadastro">
        <section class="painel painel--tabela">${tabela}</section>
        <form class="painel cadastro__form" id="form-cadastro" novalidate>
          <h2 class="painel__titulo">${atual ? `Editar ${cfg.singular}` : cfg.tituloNovo}</h2>
          <p class="erro-geral" data-erro-geral hidden></p>
          ${cfg.campos(atual)}
          <div class="formulario__acoes">
            <button class="botao botao--primario" type="submit">${atual ? 'Salvar alterações' : 'Cadastrar'}</button>
            ${atual ? `<a class="botao" href="#/${cfg.caminho}">Cancelar</a>` : ''}
          </div>
        </form>
      </div>`;

    const form = el.querySelector('#form-cadastro');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      limparErros(form);
      enviando(form, async () => {
        try {
          const dados = lerForm(form);
          if (atual) {
            await api.put(`/${cfg.caminho}/${atual.id}`, dados);
            aviso(`${cfg.Singular} atualizad${cfg.genero}.`);
            location.hash = `#/${cfg.caminho}`;
          } else {
            await api.post(`/${cfg.caminho}`, dados);
            aviso(`${cfg.Singular} cadastrad${cfg.genero}.`);
            await recarregar();
            el.querySelector('#form-cadastro input')?.focus();
          }
        } catch (erro) {
          mostrarErros(form, erro);
        }
      });
    });

    el.querySelectorAll('[data-excluir]').forEach((botao) => {
      const item = itens.find((i) => String(i.id) === botao.dataset.excluir);
      confirmarClique(botao, 'Confirmar', async () => {
        try {
          await api.excluir(`/${cfg.caminho}/${item.id}`);
          aviso(`${cfg.Singular} "${item.nome}" excluíd${cfg.genero}.`);
          if (atual?.id === item.id) location.hash = `#/${cfg.caminho}`;
          else await recarregar();
        } catch (erro) {
          aviso(mensagemDe(erro), 'erro');
        }
      });
    });
  };
}

export const valorOuTraco = (v) => (v ? esc(v) : '<span class="vazio-inline">—</span>');
