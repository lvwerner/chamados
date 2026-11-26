package br.com.sistemas.chamados.dto;

import java.time.LocalDateTime;

import br.com.sistemas.chamados.entity.Notificacao;
import br.com.sistemas.chamados.entity.StatusNotificacao;

public record NotificacaoResponse(
    String eventoId,
    Long chamadoId,
    String prioridade,
    String categoria,
    StatusNotificacao status,
    int tentativas,
    LocalDateTime processadoEm
) {

    public static NotificacaoResponse de(Notificacao n) {
        return new NotificacaoResponse(n.getEventoId(), n.getChamadoId(), n.getPrioridade(),
            n.getCategoria(), n.getStatus(), n.getTentativas(), n.getProcessadoEm());
    }
}
