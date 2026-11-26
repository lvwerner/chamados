package br.com.sistemas.chamados.evento;

import java.time.LocalDateTime;
import java.util.UUID;

import br.com.sistemas.chamados.entity.Chamado;

/**
 * Contrato da mensagem "chamado aberto" (versão 1).
 *
 * Minimização de dados (LGPD, art. 6º, III): o evento leva só o necessário para
 * notificar a equipe de suporte. Nome, e-mail e telefone do cliente e o texto da
 * descrição ficam de fora; quem precisar deles consulta a API com permissão.
 *
 * O eventoId é a chave idempotente: o mesmo evento entregue duas vezes gera uma
 * única notificação.
 */
public record ChamadoAbertoEvento(
    String eventoId,
    String tipo,
    int versao,
    Long chamadoId,
    String prioridade,
    String categoria,
    LocalDateTime dataAbertura
) {

    public static final String TIPO = "chamado.aberto";

    public static ChamadoAbertoEvento de(Chamado c) {
        return new ChamadoAbertoEvento(
            UUID.randomUUID().toString(), TIPO, 1,
            c.getId(), c.getPrioridade().name(), c.getCategoria().getNome(), c.getDataAbertura());
    }
}
