package br.com.sistemas.chamados.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.sistemas.chamados.dto.NotificacaoResponse;
import br.com.sistemas.chamados.service.NotificacaoService;

/**
 * Rotas de acompanhamento das notificações (somente ADMIN).
 * O reprocessamento simula a fila entregando o mesmo evento outra vez.
 */
@RestController
@RequestMapping("/notificacoes")
public class NotificacaoController {

    private final NotificacaoService service;

    public NotificacaoController(NotificacaoService service) {
        this.service = service;
    }

    @GetMapping
    public List<NotificacaoResponse> listar() {
        return service.listar().stream().map(NotificacaoResponse::de).toList();
    }

    @PostMapping("/{eventoId}/reprocessar")
    public Map<String, String> reprocessar(@PathVariable String eventoId) {
        return Map.of("eventoId", eventoId, "resultado", service.reprocessar(eventoId).name());
    }
}
