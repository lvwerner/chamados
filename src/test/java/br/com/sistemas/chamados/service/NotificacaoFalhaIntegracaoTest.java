package br.com.sistemas.chamados.service;

import static org.assertj.core.api.Assertions.assertThat;

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
import br.com.sistemas.chamados.repository.ChamadoRepository;
import br.com.sistemas.chamados.repository.ClienteRepository;
import br.com.sistemas.chamados.repository.NotificacaoRepository;
import br.com.sistemas.chamados.service.NotificacaoService.Resultado;

/**
 * Destino de notificação fora do ar: o canal simulado falha 5 vezes por evento.
 * O chamado precisa ser criado mesmo assim, e o reprocessamento posterior entrega.
 */
@SpringBootTest(properties = {"notificacao.simular-falhas=5", "notificacao.backoff-inicial-ms=1"})
class NotificacaoFalhaIntegracaoTest {

    @Autowired
    private ChamadoService chamadoService;
    @Autowired
    private NotificacaoService notificacaoService;
    @Autowired
    private ClienteRepository clienteRepository;
    @Autowired
    private CategoriaRepository categoriaRepository;
    @Autowired
    private ChamadoRepository chamadoRepository;
    @Autowired
    private NotificacaoRepository notificacaoRepository;

    @Test
    void falhaDaNotificacaoNaoImpedeAberturaEReprocessamentoRecupera() {
        Cliente cliente = clienteRepository.save(new Cliente("Cliente Ficticio", "falha@exemplo.test", null));
        Categoria categoria = categoriaRepository.save(new Categoria("Hardware", null));

        ChamadoResponse chamado = chamadoService.criar(new ChamadoRequest(
            "Impressora", "Teste de falha", Prioridade.MEDIA, cliente.getId(), categoria.getId()));

        assertThat(chamadoRepository.existsById(chamado.id())).isTrue();
        Notificacao registro = notificacaoRepository.findAll().get(0);
        assertThat(registro.getStatus()).isEqualTo(StatusNotificacao.FALHOU);
        assertThat(registro.getTentativas()).isEqualTo(3);

        // Destino volta ao ar (as 5 falhas simuladas se esgotam): o reprocessamento entrega.
        assertThat(notificacaoService.reprocessar(registro.getEventoId())).isEqualTo(Resultado.ENVIADA);
        assertThat(notificacaoRepository.findById(registro.getEventoId()).orElseThrow().getStatus())
            .isEqualTo(StatusNotificacao.ENVIADA);
    }
}
