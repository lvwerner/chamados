package br.com.sistemas.chamados.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * Autenticação (HTTP Basic) e autorização por papel, seguindo os atores do
 * diagrama de caso de uso:
 * - USUARIO: cadastra e consulta clientes, abre e acompanha chamados, comenta;
 * - TECNICO: tudo do usuário + altera o status do chamado;
 * - ADMIN:   tudo do técnico + atribui técnico, mantém categorias e técnicos e exclui registros.
 * A hierarquia faz cada papel herdar as permissões do papel abaixo, então as regras
 * dizem só o papel mínimo de cada rota.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filtroDeSeguranca(
        HttpSecurity http,
        @Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) throws Exception {
        http
            // Sem sessão: cada requisição traz as credenciais, então não existe cookie
            // de sessão para um ataque CSRF aproveitar.
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // O H2 console é desenhado em frames da própria origem.
            .headers(h -> h.frameOptions(f -> f.sameOrigin()))
            .authorizeHttpRequests(auth -> auth
                // Telas e arquivos estáticos são públicos; os dados ficam protegidos na API.
                .requestMatchers("/", "/index.html", "/login.html", "/css/**", "/js/**",
                    "/h2-console/**", "/error").permitAll()

                // A primeira regra que casa com a requisição decide: as específicas vêm antes.
                .requestMatchers(HttpMethod.PATCH, "/chamados/*/atribuir").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/categorias/**", "/tecnicos/**").hasRole("USUARIO")
                .requestMatchers("/categorias/**", "/tecnicos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/chamados/*/status").hasRole("TECNICO")
                .anyRequest().hasRole("USUARIO"))
            // 401 e 403 saem pelo GlobalExceptionHandler, no mesmo formato ErroResposta.
            .httpBasic(basic -> basic.authenticationEntryPoint((request, response, ex) -> {
                // O cabeçalho WWW-Authenticate faz o navegador abrir a janela nativa de login.
                // As telas do sistema têm a própria página de login e se identificam com
                // X-Requested-With, então para elas o cabeçalho é omitido.
                if (!"XMLHttpRequest".equals(request.getHeader("X-Requested-With"))) {
                    response.setHeader("WWW-Authenticate", "Basic realm=\"chamados\"");
                }
                resolver.resolveException(request, response, null, ex);
            }))
            .exceptionHandling(e -> e.accessDeniedHandler(
                (request, response, ex) -> resolver.resolveException(request, response, null, ex)));
        return http.build();
    }

    @Bean
    public RoleHierarchy hierarquiaDePapeis() {
        return RoleHierarchyImpl.withDefaultRolePrefix()
            .role("ADMIN").implies("TECNICO")
            .role("TECNICO").implies("USUARIO")
            .build();
    }

    /**
     * Usuários de demonstração em memória, um por ator. As senhas podem vir de variáveis
     * de ambiente; os valores padrão servem só para rodar em aula.
     */
    @Bean
    public UserDetailsService usuarios(
        PasswordEncoder encoder,
        @Value("${SENHA_USUARIO:usuario123}") String senhaUsuario,
        @Value("${SENHA_TECNICO:tecnico123}") String senhaTecnico,
        @Value("${SENHA_ADMIN:admin123}") String senhaAdmin) {
        return new InMemoryUserDetailsManager(
            User.withUsername("usuario").password(encoder.encode(senhaUsuario)).roles("USUARIO").build(),
            User.withUsername("tecnico").password(encoder.encode(senhaTecnico)).roles("TECNICO").build(),
            User.withUsername("admin").password(encoder.encode(senhaAdmin)).roles("ADMIN").build());
    }

    /** Guarda a senha com hash (bcrypt por padrão), nunca em texto puro. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
