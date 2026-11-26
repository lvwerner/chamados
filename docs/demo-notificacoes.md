# Demonstração: notificação por evento com idempotência (Grupo 6)

Ambiente controlado: aplicação local, banco H2 em memória, canal de notificação **simulado** (não envia nada para fora) e dados fictícios (`@exemplo.test`).

## Como funciona

1. `ChamadoService.criar` grava o chamado e publica `ChamadoAbertoEvento` (sem nome, e-mail, telefone ou descrição do cliente).
2. `NotificacaoListener` recebe o evento **depois do commit** (`@TransactionalEventListener(AFTER_COMMIT)`).
3. `NotificacaoService` usa o `eventoId` como **chave idempotente**: evento já ENVIADO é ignorado.
4. Falha do destino: até 3 tentativas com espera exponencial (200 ms, 400 ms). Esgotou: status `FALHOU`, e o chamado continua salvo.
5. `POST /notificacoes/{eventoId}/reprocessar` simula a fila entregando o mesmo evento outra vez.

A propriedade `notificacao.simular-falhas` define quantas vezes cada evento falha antes de dar certo.

## Roteiro (Git Bash)

```bash
# Cenário 1: destino instável (falha 2 vezes e depois responde)
./mvnw spring-boot:run -Dspring-boot.run.arguments=--notificacao.simular-falhas=2

curl -u admin:admin123 -H "Content-Type: application/json" -d '{"nome":"Cliente Ficticio","email":"cliente@exemplo.test"}' http://localhost:8080/clientes
curl -u admin:admin123 -H "Content-Type: application/json" -d '{"nome":"Rede"}' http://localhost:8080/categorias
curl -i -u usuario:usuario123 -H "Content-Type: application/json" \
  -d '{"titulo":"VPN fora do ar","descricao":"Dados ficticios","prioridade":"ALTA","clienteId":1,"categoriaId":1}' \
  http://localhost:8080/chamados

curl -u admin:admin123 http://localhost:8080/notificacoes          # status ENVIADA, tentativas 3
curl -u admin:admin123 -X POST http://localhost:8080/notificacoes/<eventoId>/reprocessar   # IGNORADO_DUPLICADO
curl -i -u usuario:usuario123 http://localhost:8080/notificacoes   # 403

# Cenário 2: destino fora do ar (falha 5 vezes)
./mvnw spring-boot:run -Dspring-boot.run.arguments=--notificacao.simular-falhas=5
# abrir um chamado: 201 mesmo assim; GET /notificacoes mostra FALHOU (3 tentativas)
# reprocessar: as falhas simuladas se esgotam e o resultado é ENVIADA
```

No console da aplicação, procure as linhas `notificacao.falha`, `notificacao.enviada`, `notificacao.ignorada` e `notificacao.esgotada`.

## Testes automatizados

- `NotificacaoServiceTest`: primeiro envio, evento repetido ignorado, falha temporária superada, falha persistente vira FALHOU, contrato sem dados pessoais.
- `NotificacaoIntegracaoTest`: abrir chamado gera uma notificação e a reentrega é ignorada.
- `NotificacaoFalhaIntegracaoTest`: destino fora do ar não impede a abertura; o reprocessamento recupera.
