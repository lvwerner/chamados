package br.com.sistemas.chamados.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.sistemas.chamados.dto.ComentarioRequest;
import br.com.sistemas.chamados.dto.ComentarioResponse;
import br.com.sistemas.chamados.service.ComentarioService;
import jakarta.validation.Valid;

/** Comentário só existe dentro de um chamado, por isso a rota é aninhada. */
@RestController
@RequestMapping("/chamados/{chamadoId}/comentarios")
public class ComentarioController {

    private final ComentarioService service;

    public ComentarioController(ComentarioService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ComentarioResponse> criar(@PathVariable Long chamadoId,
                                                    @Valid @RequestBody ComentarioRequest dto) {
        ComentarioResponse criado = service.criar(chamadoId, dto);
        return ResponseEntity
            .created(URI.create("/chamados/" + chamadoId + "/comentarios/" + criado.id()))
            .body(criado);
    }

    @GetMapping
    public List<ComentarioResponse> listar(@PathVariable Long chamadoId) {
        return service.listar(chamadoId);
    }
}
