package br.com.sistemas.chamados.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import br.com.sistemas.chamados.entity.Categoria;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Cliente;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;

/** Testa a consulta com filtros opcionais e a paginação. */
@DataJpaTest
class ChamadoRepositoryTest {

    @Autowired
    private ChamadoRepository repository;
    @Autowired
    private ClienteRepository clienteRepository;
    @Autowired
    private CategoriaRepository categoriaRepository;

    private Cliente ana;
    private Cliente joao;
    private final Pageable todos = PageRequest.of(0, 10, Sort.by("titulo"));

    @BeforeEach
    void preparar() {
        ana = clienteRepository.save(new Cliente("Ana Souza", "ana@exemplo.com", null));
        joao = clienteRepository.save(new Cliente("Joao Silva", "joao@exemplo.com", null));
        Categoria hardware = categoriaRepository.save(new Categoria("Hardware", null));

        repository.save(new Chamado("C1", "d", Prioridade.ALTA, ana, hardware));
        repository.save(new Chamado("C2", "d", Prioridade.BAIXA, ana, hardware));
        Chamado c3 = new Chamado("C3", "d", Prioridade.ALTA, joao, hardware);
        c3.setStatus(StatusChamado.FECHADO);
        repository.save(c3);
    }

    @Test
    void chamadoNasceAbertoComDataDeAbertura() {
        Chamado salvo = repository.findAll(Sort.by("titulo")).get(0);

        assertThat(salvo.getStatus()).isEqualTo(StatusChamado.ABERTO);
        assertThat(salvo.getDataAbertura()).isNotNull();
        assertThat(salvo.getCliente().getNome()).isEqualTo("Ana Souza");
    }

    @Test
    void semFiltrosRetornaTodos() {
        assertThat(repository.filtrar(null, null, null, todos).getTotalElements()).isEqualTo(3);
    }

    @Test
    void filtraPorPrioridade() {
        Page<Chamado> pagina = repository.filtrar(null, Prioridade.ALTA, null, todos);

        assertThat(pagina.getContent()).extracting(Chamado::getTitulo).containsExactly("C1", "C3");
    }

    @Test
    void combinaStatusEPrioridadeECliente() {
        assertThat(repository.filtrar(StatusChamado.ABERTO, Prioridade.ALTA, null, todos)
            .getContent()).extracting(Chamado::getTitulo).containsExactly("C1");
        assertThat(repository.filtrar(null, null, joao.getId(), todos)
            .getContent()).extracting(Chamado::getTitulo).containsExactly("C3");
        assertThat(repository.filtrar(StatusChamado.FECHADO, null, ana.getId(), todos)
            .getContent()).isEmpty();
    }

    @Test
    void paginaOResultado() {
        Page<Chamado> segunda = repository.filtrar(null, null, null, PageRequest.of(1, 2, Sort.by("titulo")));

        assertThat(segunda.getTotalPages()).isEqualTo(2);
        assertThat(segunda.getContent()).extracting(Chamado::getTitulo).containsExactly("C3");
    }

    @Test
    void existsByClienteId() {
        Cliente semChamados = clienteRepository.save(new Cliente("Sem Chamados", "x@exemplo.com", null));

        assertThat(repository.existsByClienteId(ana.getId())).isTrue();
        assertThat(repository.existsByClienteId(semChamados.getId())).isFalse();
    }
}
