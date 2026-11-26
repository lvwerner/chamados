package br.com.sistemas.chamados.entity;

import java.time.LocalDateTime;

import br.com.sistemas.chamados.evento.ChamadoAbertoEvento;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * ENTITY: registro de cada evento processado pelo consumidor de notificações.
 * A chave primária é o eventoId: o banco recusa um segundo registro do mesmo
 * evento, o que garante a idempotência mesmo se a verificação em código falhar.
 */
@Entity
@Table(name = "notificacoes")
public class Notificacao {

    @Id
    @Column(length = 36)
    private String eventoId;

    @Column(nullable = false)
    private Long chamadoId;

    @Column(nullable = false, length = 20)
    private String prioridade;

    @Column(nullable = false, length = 100)
    private String categoria;

    @Column(nullable = false)
    private LocalDateTime dataAbertura;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private StatusNotificacao status;

    @Column(nullable = false)
    private int tentativas;

    private LocalDateTime processadoEm;

    protected Notificacao() { }

    public Notificacao(ChamadoAbertoEvento e) {
        this.eventoId = e.eventoId();
        this.chamadoId = e.chamadoId();
        this.prioridade = e.prioridade();
        this.categoria = e.categoria();
        this.dataAbertura = e.dataAbertura();
    }

    /** Reconstrói o evento original, usado no reprocessamento. */
    public ChamadoAbertoEvento comoEvento() {
        return new ChamadoAbertoEvento(eventoId, ChamadoAbertoEvento.TIPO, 1,
            chamadoId, prioridade, categoria, dataAbertura);
    }

    public void registrarTentativa() { this.tentativas++; }

    public void concluir(StatusNotificacao resultado) {
        this.status = resultado;
        this.processadoEm = LocalDateTime.now();
    }

    public String getEventoId() { return eventoId; }
    public Long getChamadoId() { return chamadoId; }
    public String getPrioridade() { return prioridade; }
    public String getCategoria() { return categoria; }
    public StatusNotificacao getStatus() { return status; }
    public int getTentativas() { return tentativas; }
    public LocalDateTime getProcessadoEm() { return processadoEm; }
}
