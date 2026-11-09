package br.com.sistemas.chamados.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import br.com.sistemas.chamados.config.SecurityConfig;
import br.com.sistemas.chamados.dto.CategoriaRequest;
import br.com.sistemas.chamados.dto.CategoriaResponse;
import br.com.sistemas.chamados.service.CategoriaService;
import br.com.sistemas.chamados.service.ChamadoService;
import br.com.sistemas.chamados.service.ClienteService;
import br.com.sistemas.chamados.service.TecnicoService;

/**
 * Autenticação e permissões por papel, com os usuários reais do SecurityConfig
 * (HTTP Basic e senha conferida pelo PasswordEncoder). Os Services são mocks:
 * aqui só importa se a requisição chega ao controller ou é barrada (401/403).
 */
@WebMvcTest(controllers = {AuthController.class, ChamadoController.class, ClienteController.class,
    CategoriaController.class, TecnicoController.class})
@Import(SecurityConfig.class)
class SegurancaTest {

    private static final RequestPostProcessor USUARIO = httpBasic("usuario", "usuario123");
    private static final RequestPostProcessor TECNICO = httpBasic("tecnico", "tecnico123");
    private static final RequestPostProcessor ADMIN = httpBasic("admin", "admin123");

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ChamadoService chamadoService;
    @MockitoBean
    private ClienteService clienteService;
    @MockitoBean
    private CategoriaService categoriaService;
    @MockitoBean
    private TecnicoService tecnicoService;

    @Test
    void semCredenciaisRetorna401NoFormatoPadrao() throws Exception {
        mvc.perform(get("/clientes"))
            .andExpect(status().isUnauthorized())
            .andExpect(header().exists("WWW-Authenticate"))
            .andExpect(jsonPath("$.erro").value("Autenticação necessária"));
    }

    @Test
    void telasDoSistemaNaoRecebemCabecalhoQueAbreJanelaDoNavegador() throws Exception {
        mvc.perform(get("/clientes").header("X-Requested-With", "XMLHttpRequest"))
            .andExpect(status().isUnauthorized())
            .andExpect(header().doesNotExist("WWW-Authenticate"));
    }

    @Test
    void senhaErradaRetorna401() throws Exception {
        mvc.perform(get("/clientes").with(httpBasic("admin", "errada")))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void authMeInformaUsuarioEPapel() throws Exception {
        mvc.perform(get("/auth/me").with(TECNICO))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.usuario").value("tecnico"))
            .andExpect(jsonPath("$.papel").value("TECNICO"));
    }

    @Test
    void usuarioConsultaMasNaoExclui() throws Exception {
        when(clienteService.listar()).thenReturn(List.of());

        mvc.perform(get("/clientes").with(USUARIO)).andExpect(status().isOk());
        mvc.perform(delete("/clientes/1").with(USUARIO))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.erro").value("Sem permissão para esta operação"));
    }

    @Test
    void somenteTecnicoOuAcimaAlteraStatus() throws Exception {
        String corpo = "{\"status\":\"EM_ATENDIMENTO\"}";

        mvc.perform(patch("/chamados/1/status").with(USUARIO)
                .contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/chamados/1/status").with(TECNICO)
                .contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isOk());
    }

    @Test
    void somenteAdminAtribuiTecnico() throws Exception {
        String corpo = "{\"tecnicoId\":1}";

        mvc.perform(patch("/chamados/1/atribuir").with(TECNICO)
                .contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/chamados/1/atribuir").with(ADMIN)
                .contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isOk());
    }

    @Test
    void categoriasTodosLeemMasSoAdminCadastra() throws Exception {
        when(categoriaService.listar()).thenReturn(List.of());
        when(categoriaService.criar(any(CategoriaRequest.class)))
            .thenReturn(new CategoriaResponse(1L, "Rede", null));
        String corpo = "{\"nome\":\"Rede\"}";

        mvc.perform(get("/categorias").with(USUARIO)).andExpect(status().isOk());
        mvc.perform(post("/categorias").with(TECNICO)
                .contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isForbidden());
        mvc.perform(post("/categorias").with(ADMIN)
                .contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isCreated());
    }
}
