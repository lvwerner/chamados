package br.com.sistemas.chamados.repository;

import java.util.List;

import br.com.sistemas.chamados.entity.Notificacao;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificacaoRepository extends JpaRepository<Notificacao, String> {
    List<Notificacao> findAllByOrderByProcessadoEmDesc();
}
