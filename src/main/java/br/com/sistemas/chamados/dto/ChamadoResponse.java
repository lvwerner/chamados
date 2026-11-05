package br.com.sistemas.chamados.dto;

import java.time.LocalDateTime;

import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;
import br.com.sistemas.chamados.entity.Tecnico;

public record ChamadoResponse(
    Long id,
    String titulo,
    String descricao,
    Prioridade prioridade,
    StatusChamado status,
    LocalDateTime dataAbertura,
    LocalDateTime dataFechamento,
    Long clienteId,
    String clienteNome,
    Long categoriaId,
    String categoriaNome,
    Long tecnicoId,
    String tecnicoNome
) {

    public static ChamadoResponse de(Chamado c) {
        Tecnico t = c.getTecnico();
        return new ChamadoResponse(
            c.getId(), c.getTitulo(), c.getDescricao(), c.getPrioridade(), c.getStatus(),
            c.getDataAbertura(), c.getDataFechamento(),
            c.getCliente().getId(), c.getCliente().getNome(),
            c.getCategoria().getId(), c.getCategoria().getNome(),
            t == null ? null : t.getId(), t == null ? null : t.getNome());
    }
}
