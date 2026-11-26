package br.com.sistemas.chamados.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import br.com.sistemas.chamados.entity.Notificacao;
import br.com.sistemas.chamados.entity.StatusNotificacao;
import br.com.sistemas.chamados.evento.ChamadoAbertoEvento;
import br.com.sistemas.chamados.integracao.CanalNotificacao;
import br.com.sistemas.chamados.integracao.FalhaIntegracaoException;
import br.com.sistemas.chamados.repository.NotificacaoRepository;
import br.com.sistemas.chamados.service.NotificacaoService.Resultado;

/** Regras do consumidor de notificações: idempotência, retentativa e minimização de dados. */
class NotificacaoServiceTest {

    /** Canal falso: falha as N primeiras chamadas e conta quantas vezes foi chamado. */
    static class CanalFalso implements CanalNotificacao {
        int falhasRestantes;
        int chamadas;

        @Override
        public void enviar(ChamadoAbertoEvento evento) {
            chamadas++;
            if (falhasRestantes > 0) {
                falhasRestantes--;
                throw new FalhaIntegracaoException("destino indisponível (teste)");
            }
        }
    }

    private final NotificacaoRepository repository = mock(NotificacaoRepository.class);
    private final CanalFalso canal = new CanalFalso();
    private NotificacaoService service;

    private final ChamadoAbertoEvento evento = new ChamadoAbertoEvento(
        "evt-0001", ChamadoAbertoEvento.TIPO, 1, 10L, "ALTA", "Rede", LocalDateTime.now());

    @BeforeEach
    void preparar() {
        service = new NotificacaoService(repository, canal, 1); // backoff de 1 ms para o teste ser rápido
        when(repository.findById("evt-0001")).thenReturn(Optional.empty());
    }

    private Notificacao registroSalvo() {
        ArgumentCaptor<Notificacao> captor = ArgumentCaptor.forClass(Notificacao.class);
        verify(repository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void primeiroEnvioRegistraNotificacaoEnviada() {
        assertThat(service.processar(evento)).isEqualTo(Resultado.ENVIADA);

        assertThat(canal.chamadas).isEqualTo(1);
        assertThat(registroSalvo().getStatus()).isEqualTo(StatusNotificacao.ENVIADA);
    }

    @Test
    void eventoRepetidoEhIgnoradoSemNovoEnvio() {
        Notificacao jaEnviada = new Notificacao(evento);
        jaEnviada.concluir(StatusNotificacao.ENVIADA);
        when(repository.findById("evt-0001")).thenReturn(Optional.of(jaEnviada));

        assertThat(service.processar(evento)).isEqualTo(Resultado.IGNORADO_DUPLICADO);

        assertThat(canal.chamadas).isZero();
        verify(repository, never()).save(any());
    }

    @Test
    void falhaTemporariaEhSuperadaPelaRetentativa() {
        canal.falhasRestantes = 2;

        assertThat(service.processar(evento)).isEqualTo(Resultado.ENVIADA);

        Notificacao salvo = registroSalvo();
        assertThat(canal.chamadas).isEqualTo(3);
        assertThat(salvo.getTentativas()).isEqualTo(3);
        assertThat(salvo.getStatus()).isEqualTo(StatusNotificacao.ENVIADA);
    }

    @Test
    void falhaPersistenteViraFalhouSemLancarExcecao() {
        canal.falhasRestantes = 99;

        assertThat(service.processar(evento)).isEqualTo(Resultado.FALHOU);

        Notificacao salvo = registroSalvo();
        assertThat(salvo.getTentativas()).isEqualTo(NotificacaoService.MAX_TENTATIVAS);
        assertThat(salvo.getStatus()).isEqualTo(StatusNotificacao.FALHOU);
    }

    @Test
    void contratoDoEventoNaoTemDadosPessoais() {
        List<String> campos = Arrays.stream(ChamadoAbertoEvento.class.getRecordComponents())
            .map(c -> c.getName()).toList();

        assertThat(campos).containsExactly(
            "eventoId", "tipo", "versao", "chamadoId", "prioridade", "categoria", "dataAbertura");
        assertThat(campos).doesNotContain("clienteNome", "email", "telefone", "descricao");
    }
}
