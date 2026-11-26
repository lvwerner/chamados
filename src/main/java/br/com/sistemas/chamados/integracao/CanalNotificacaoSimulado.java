package br.com.sistemas.chamados.integracao;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import br.com.sistemas.chamados.evento.ChamadoAbertoEvento;

/**
 * Canal de notificação SIMULADO para a demonstração em ambiente controlado:
 * não envia nada para fora, só registra no log (sem dados pessoais).
 *
 * Para ensaiar falhas do destino, a propriedade notificacao.simular-falhas define
 * quantas vezes cada evento falha antes de dar certo (0 = nunca falha).
 */
@Component
public class CanalNotificacaoSimulado implements CanalNotificacao {

    private static final Logger log = LoggerFactory.getLogger(CanalNotificacaoSimulado.class);

    private final int falhasPorEvento;
    private final Map<String, Integer> falhasJaSimuladas = new ConcurrentHashMap<>();

    public CanalNotificacaoSimulado(@Value("${notificacao.simular-falhas:0}") int falhasPorEvento) {
        this.falhasPorEvento = falhasPorEvento;
    }

    @Override
    public void enviar(ChamadoAbertoEvento evento) {
        int falhas = falhasJaSimuladas.merge(evento.eventoId(), 1, Integer::sum);
        if (falhas <= falhasPorEvento) {
            throw new FalhaIntegracaoException("destino de notificação indisponível (simulado)");
        }
        log.info("notificacao.enviada evento={} chamado={} prioridade={} categoria={}",
            evento.eventoId(), evento.chamadoId(), evento.prioridade(), evento.categoria());
    }
}
