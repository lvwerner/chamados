import { esc, campo, opcoes, badgePerfil, PERFIL } from '../ui.js';
import { cadastroSimples } from './cadastro.js';

export const tecnicos = cadastroSimples({
  caminho: 'tecnicos',
  titulo: 'Técnicos',
  singular: 'técnico',
  Singular: 'Técnico',
  genero: 'o',
  tituloNovo: 'Novo técnico',
  subtitulo: (n) => `${n} ${n === 1 ? 'técnico' : 'técnicos'} · podem ser atribuídos aos chamados`,
  vazioTitulo: 'Nenhum técnico cadastrado',
  vazioTexto: 'Cadastre quem atende os chamados para poder atribuí-los.',
  colunas: [
    { rotulo: 'Nome', valor: (t) => `<strong class="tabela__titulo">${esc(t.nome)}</strong>` },
    { rotulo: 'E-mail', valor: (t) => esc(t.email) },
    { rotulo: 'Perfil', valor: (t) => badgePerfil(t.perfil) },
  ],
  campos: (atual) => `
    ${campo('nome', 'Nome', `<input id="nome" name="nome" maxlength="100" value="${esc(atual?.nome)}">`)}
    ${campo('email', 'E-mail', `<input id="email" name="email" type="email" maxlength="120" value="${esc(atual?.email)}">`)}
    ${campo('perfil', 'Perfil', `<select id="perfil" name="perfil">${opcoes(PERFIL, atual?.perfil || 'TECNICO')}</select>`)}`,
});
