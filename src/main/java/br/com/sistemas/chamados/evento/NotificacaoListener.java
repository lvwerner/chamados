package br.com.sistemas.chamados.evento;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import br.com.sistemas.chamados.service.NotificacaoService;

/**
 * Consome o evento só DEPOIS do commit da abertura do chamado: se o chamado não
 * for gravado (rollback), nenhuma notificação é disparada; e se a notificação
 * falhar, o chamado já está salvo.
 */
@Component
public class NotificacaoListener {

    private final NotificacaoService service;

    public NotificacaoListener(NotificacaoService service) {
        this.service = service;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void aoAbrirChamado(ChamadoAbertoEvento evento) {
        service.processar(evento);
    }
}
