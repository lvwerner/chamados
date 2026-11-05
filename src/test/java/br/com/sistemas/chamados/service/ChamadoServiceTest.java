package br.com.sistemas.chamados.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.entity.Categoria;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Cliente;
import br.com.sistemas.chamados.entity.Perfil;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;
import br.com.sistemas.chamados.entity.Tecnico;
import br.com.sistemas.chamados.exception.ChamadoFechadoException;
import br.com.sistemas.chamados.exception.RegraNegocioException;
import br.com.sistemas.chamados.repository.CategoriaRepository;
import br.com.sistemas.chamados.repository.ChamadoRepository;
import br.com.sistemas.chamados.repository.ClienteRepository;
import br.com.sistemas.chamados.repository.TecnicoRepository;

/** Teste unitário das regras de status e atribuição (sem Spring, só Mockito). */
@ExtendWith(MockitoExtension.class)
class ChamadoServiceTest {

    @Mock
    private ChamadoRepository repository;
    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private CategoriaRepository categoriaRepository;
    @Mock
    private TecnicoRepository tecnicoRepository;

    @InjectMocks
    private ChamadoService service;

    private Chamado chamado;

    @BeforeEach
    void preparar() {
        chamado = new Chamado("Impressora", "Nao liga", Prioridade.ALTA,
            new Cliente("Ana Souza", "ana@exemplo.com", null), new Categoria("Hardware", null));
        when(repository.findById(1L)).thenReturn(Optional.of(chamado));
    }

    @Test
    void fecharPreencheDataFechamento() {
        ChamadoResponse resposta = service.alterarStatus(1L, StatusChamado.FECHADO);

        assertThat(resposta.status()).isEqualTo(StatusChamado.FECHADO);
        assertThat(resposta.dataFechamento()).isNotNull();
    }

    @Test
    void outrosStatusNaoPreenchemDataFechamento() {
        ChamadoResponse resposta = service.alterarStatus(1L, StatusChamado.EM_ATENDIMENTO);

        assertThat(resposta.status()).isEqualTo(StatusChamado.EM_ATENDIMENTO);
        assertThat(resposta.dataFechamento()).isNull();
    }

    @Test
    void naoAceitaMesmoStatus() {
        assertThatThrownBy(() -> service.alterarStatus(1L, StatusChamado.ABERTO))
            .isInstanceOf(RegraNegocioException.class);
    }

    @Test
    void chamadoFechadoNaoMudaDeStatus() {
        chamado.setStatus(StatusChamado.FECHADO);

        assertThatThrownBy(() -> service.alterarStatus(1L, StatusChamado.ABERTO))
            .isInstanceOf(ChamadoFechadoException.class);
    }

    @Test
    void atribuiTecnico() {
        when(tecnicoRepository.findById(7L))
            .thenReturn(Optional.of(new Tecnico("Carlos", "carlos@empresa.com", Perfil.TECNICO)));

        ChamadoResponse resposta = service.atribuir(1L, 7L);

        assertThat(resposta.tecnicoNome()).isEqualTo("Carlos");
    }

    @Test
    void chamadoFechadoNaoRecebeTecnico() {
        chamado.setStatus(StatusChamado.FECHADO);

        assertThatThrownBy(() -> service.atribuir(1L, 7L))
            .isInstanceOf(ChamadoFechadoException.class);
    }
}
