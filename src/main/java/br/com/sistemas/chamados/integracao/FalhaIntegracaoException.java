package br.com.sistemas.chamados.integracao;

/** Falha temporária ou definitiva ao falar com um sistema externo. */
public class FalhaIntegracaoException extends RuntimeException {

    public FalhaIntegracaoException(String mensagem) {
        super(mensagem);
    }
}
