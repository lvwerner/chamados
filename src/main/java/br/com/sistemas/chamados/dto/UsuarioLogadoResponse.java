package br.com.sistemas.chamados.dto;

/** Quem está autenticado e qual o papel principal (ADMIN, TECNICO ou USUARIO). */
public record UsuarioLogadoResponse(String usuario, String papel) { }
