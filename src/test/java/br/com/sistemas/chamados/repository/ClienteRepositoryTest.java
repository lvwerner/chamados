package br.com.sistemas.chamados.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import br.com.sistemas.chamados.entity.Cliente;

/** @DataJpaTest sobe só a camada JPA com um H2 em memória isolado por teste. */
@DataJpaTest
class ClienteRepositoryTest {

    @Autowired
    private ClienteRepository repository;

    @Test
    void salvaClienteEGeraId() {
        Cliente salvo = repository.save(new Cliente("Ana Souza", "ana@exemplo.com", "47999999999"));

        assertThat(salvo.getId()).isNotNull();
        assertThat(repository.findById(salvo.getId())).isPresent();
    }

    @Test
    void existsByEmailIndicaEmailJaCadastrado() {
        repository.save(new Cliente("Ana Souza", "ana@exemplo.com", null));

        assertThat(repository.existsByEmail("ana@exemplo.com")).isTrue();
        assertThat(repository.existsByEmail("outro@exemplo.com")).isFalse();
    }

    @Test
    void existsByEmailAndIdNotIgnoraOProprioCliente() {
        Cliente ana = repository.save(new Cliente("Ana Souza", "ana@exemplo.com", null));
        Cliente joao = repository.save(new Cliente("Joao Silva", "joao@exemplo.com", null));

        assertThat(repository.existsByEmailAndIdNot("ana@exemplo.com", ana.getId())).isFalse();
        assertThat(repository.existsByEmailAndIdNot("ana@exemplo.com", joao.getId())).isTrue();
    }
}
