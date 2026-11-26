package br.com.sistemas.chamados.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import br.com.sistemas.chamados.dto.ChamadoRequest;
import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.entity.Categoria;
import br.com.sistemas.chamados.entity.Cliente;
import br.com.sistemas.chamados.entity.Notificacao;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusNotificacao;
import br.com.sistemas.chamados.repository.CategoriaRepository;
import br.com.sistemas.chamados.repository.ClienteRepository;
import br.com.sistemas.chamados.repository.NotificacaoRepository;
import br.com.sistemas.chamados.service.NotificacaoService.Resultado;

/** Fluxo completo com a aplicação real: abrir chamado → evento após commit → notificação. */
@SpringBootTest
class NotificacaoIntegracaoTest {

    @Autowired
    private ChamadoService chamadoService;
    @Autowired
    private NotificacaoService notificacaoService;
    @Autowired
    private ClienteRepository clienteRepository;
    @Autowired
    private CategoriaRepository categoriaRepository;
    @Autowired
    private NotificacaoRepository notificacaoRepository;

    @Test
    void abrirChamadoGeraUmaNotificacaoEReentregaEhIgnorada() {
        String sufixo = UUID.randomUUID().toString().substring(0, 8);
        Cliente cliente = clienteRepository.save(
            new Cliente("Cliente Ficticio", "ficticio-" + sufixo + "@exemplo.test", null));
        Categoria categoria = categoriaRepository.save(new Categoria("Rede " + sufixo, null));

        ChamadoResponse chamado = chamadoService.criar(new ChamadoRequest(
            "VPN fora do ar", "Teste de integração", Prioridade.ALTA, cliente.getId(), categoria.getId()));

        List<Notificacao> doChamado = notificacaoRepository.findAll().stream()
            .filter(n -> n.getChamadoId().equals(chamado.id())).toList();
        assertThat(doChamado).hasSize(1);
        assertThat(doChamado.get(0).getStatus()).isEqualTo(StatusNotificacao.ENVIADA);

        // A "fila" entrega o mesmo evento de novo: nada é reenviado.
        Resultado reentrega = notificacaoService.reprocessar(doChamado.get(0).getEventoId());
        assertThat(reentrega).isEqualTo(Resultado.IGNORADO_DUPLICADO);
        assertThat(notificacaoRepository.findAll().stream()
            .filter(n -> n.getChamadoId().equals(chamado.id()))).hasSize(1);
    }
}
