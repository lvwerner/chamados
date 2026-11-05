import { sessao, salvarSessao, credencial } from './auth.js';

// Quem já está logado vai direto para o sistema.
if (sessao()) location.replace('index.html');

const form = document.getElementById('form-login');
const erro = document.getElementById('erro');
const botao = form.querySelector('[type="submit"]');

if (new URLSearchParams(location.search).has('expirou')) {
  document.getElementById('expirou').hidden = false;
}

function mostrarErro(texto) {
  erro.textContent = texto;
  erro.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erro.hidden = true;
  const usuario = form.usuario.value.trim();
  const senha = form.senha.value;
  if (!usuario || !senha) {
    mostrarErro('Preencha usuário e senha.');
    return;
  }

  botao.disabled = true;
  try {
    const cabecalho = credencial(usuario, senha);
    // /auth/me só responde 200 se as credenciais forem válidas.
    const resposta = await fetch('auth/me', {
      headers: { Authorization: cabecalho, 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (resposta.status === 401) {
      mostrarErro('Usuário ou senha incorretos.');
      form.senha.select();
      return;
    }
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const eu = await resposta.json();
    salvarSessao({ usuario: eu.usuario, papel: eu.papel, credencial: cabecalho });
    location.replace('index.html');
  } catch {
    mostrarErro('Não foi possível falar com a API. Confira se a aplicação está rodando.');
  } finally {
    botao.disabled = false;
  }
});

document.querySelectorAll('[data-usuario]').forEach((item) => {
  item.addEventListener('click', () => {
    form.usuario.value = item.dataset.usuario;
    form.senha.value = item.dataset.senha;
    botao.focus();
  });
});
