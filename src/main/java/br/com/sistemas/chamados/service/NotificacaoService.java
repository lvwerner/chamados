package br.com.sistemas.chamados.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import br.com.sistemas.chamados.entity.Notificacao;
import br.com.sistemas.chamados.entity.StatusNotificacao;
import br.com.sistemas.chamados.evento.ChamadoAbertoEvento;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.integracao.CanalNotificacao;
import br.com.sistemas.chamados.integracao.FalhaIntegracaoException;
import br.com.sistemas.chamados.repository.NotificacaoRepository;

/**
 * SERVICE: consumidor do evento "chamado aberto".
 * - Idempotência: evento já ENVIADO é ignorado (chave = eventoId).
 * - Retentativa: até MAX_TENTATIVAS, com espera exponencial (backoff) entre elas.
 * - Isolamento: a falha final vira status FALHOU e nunca desfaz o chamado.
 */
@Service
public class NotificacaoService {

    public enum Resultado { ENVIADA, IGNORADO_DUPLICADO, FALHOU }

    static final int MAX_TENTATIVAS = 3;
    private static final Logger log = LoggerFactory.getLogger(NotificacaoService.class);

    private final NotificacaoRepository repository;
    private final CanalNotificacao canal;
    private final long backoffInicialMs;

    public NotificacaoService(NotificacaoRepository repository, CanalNotificacao canal,
                              @Value("${notificacao.backoff-inicial-ms:200}") long backoffInicialMs) {
        this.repository = repository;
        this.canal = canal;
        this.backoffInicialMs = backoffInicialMs;
    }

    /** REQUIRES_NEW: roda depois do commit do chamado, em transação própria. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Resultado processar(ChamadoAbertoEvento evento) {
        Notificacao registro = repository.findById(evento.eventoId()).orElse(null);
        if (registro != null && registro.getStatus() == StatusNotificacao.ENVIADA) {
            log.info("notificacao.ignorada motivo=duplicada evento={}", evento.eventoId());
            return Resultado.IGNORADO_DUPLICADO;
        }
        if (registro == null) {
            registro = new Notificacao(evento);
        }

        for (int tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
            registro.registrarTentativa();
            try {
                canal.enviar(evento);
                registro.concluir(StatusNotificacao.ENVIADA);
                repository.save(registro);
                return Resultado.ENVIADA;
            } catch (FalhaIntegracaoException ex) {
                long espera = backoffInicialMs * (1L << (tentativa - 1)); // 200, 400, 800 ms...
                log.warn("notificacao.falha evento={} tentativa={}/{} proximaEsperaMs={}",
                    evento.eventoId(), tentativa, MAX_TENTATIVAS, tentativa < MAX_TENTATIVAS ? espera : 0);
                if (tentativa < MAX_TENTATIVAS) {
                    esperar(espera);
                }
            }
        }
        registro.concluir(StatusNotificacao.FALHOU);
        repository.save(registro);
        log.error("notificacao.esgotada evento={} chamado={} status=FALHOU", evento.eventoId(), evento.chamadoId());
        return Resultado.FALHOU;
    }

    /** Reentrega manual de um evento já registrado (simula a fila entregando de novo). */
    @Transactional
    public Resultado reprocessar(String eventoId) {
        Notificacao registro = repository.findById(eventoId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Evento " + eventoId + " não encontrado"));
        return processar(registro.comoEvento());
    }

    @Transactional(readOnly = true)
    public List<Notificacao> listar() {
        return repository.findAllByOrderByProcessadoEmDesc();
    }

    private void esperar(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
