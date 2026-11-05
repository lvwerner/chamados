package br.com.sistemas.chamados.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.sistemas.chamados.dto.UsuarioLogadoResponse;

/**
 * A tela de login usa esta rota para conferir usuário e senha: se as credenciais
 * estiverem erradas, o Spring Security responde 401 antes de chegar aqui.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final List<String> PAPEIS = List.of("ADMIN", "TECNICO", "USUARIO");

    @GetMapping("/me")
    public UsuarioLogadoResponse eu(Authentication autenticacao) {
        List<String> autoridades = autenticacao.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .toList();
        String papel = PAPEIS.stream()
            .filter(p -> autoridades.contains("ROLE_" + p))
            .findFirst()
            .orElse("USUARIO");
        return new UsuarioLogadoResponse(autenticacao.getName(), papel);
    }
}
