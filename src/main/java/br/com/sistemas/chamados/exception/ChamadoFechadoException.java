package br.com.sistemas.chamados.exception;

/** Lançada ao tentar alterar um chamado já FECHADO (vira HTTP 409). */
public class ChamadoFechadoException extends RuntimeException {

    public ChamadoFechadoException(Long id) {
        super("Chamado " + id + " está fechado e não pode ser alterado");
    }
}
