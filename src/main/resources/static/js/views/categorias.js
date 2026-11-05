import { esc, campo } from '../ui.js';
import { cadastroSimples, valorOuTraco } from './cadastro.js';

export const categorias = cadastroSimples({
  caminho: 'categorias',
  titulo: 'Categorias',
  singular: 'categoria',
  Singular: 'Categoria',
  genero: 'a',
  tituloNovo: 'Nova categoria',
  subtitulo: (n) => `${n} ${n === 1 ? 'categoria' : 'categorias'} · usadas para classificar os chamados`,
  vazioTitulo: 'Nenhuma categoria cadastrada',
  vazioTexto: 'Crie categorias como Hardware, Rede ou Acesso para organizar os chamados.',
  colunas: [
    { rotulo: 'Nome', valor: (c) => `<strong class="tabela__titulo">${esc(c.nome)}</strong>` },
    { rotulo: 'Descrição', valor: (c) => valorOuTraco(c.descricao) },
  ],
  campos: (atual) => `
    ${campo('nome', 'Nome', `<input id="nome" name="nome" maxlength="100" value="${esc(atual?.nome)}" placeholder="Ex.: Rede">`)}
    ${campo('descricao', 'Descrição', `<textarea id="descricao" name="descricao" rows="3" maxlength="255">${esc(atual?.descricao)}</textarea>`, 'Opcional.')}`,
});
