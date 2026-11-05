package br.com.sistemas.chamados.repository;

import java.util.List;

import br.com.sistemas.chamados.entity.Comentario;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComentarioRepository extends JpaRepository<Comentario, Long> {
    List<Comentario> findByChamadoIdOrderByDataAsc(Long chamadoId);
}
