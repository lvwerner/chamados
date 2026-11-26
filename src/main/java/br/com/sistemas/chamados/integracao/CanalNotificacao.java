package br.com.sistemas.chamados.integracao;

import br.com.sistemas.chamados.evento.ChamadoAbertoEvento;

/**
 * Porta para o sistema externo de notificação (e-mail, chat, webhook...).
 * O Service depende desta interface, não de um fornecedor: trocar o canal real
 * não muda a regra de idempotência nem a de retentativa.
 */
public interface CanalNotificacao {

    /** Envia a notificação; lança FalhaIntegracaoException se o destino não responder. */
    void enviar(ChamadoAbertoEvento evento);
}
