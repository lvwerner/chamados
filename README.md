# Sistema de Chamados

API REST em arquitetura em camadas (Controller → Service → Repository → Entity) com Java 21, Spring Boot 4.1.1, Spring Data JPA, H2 e Bean Validation. Projeto da disciplina DAS – Design e Arquitetura de Sistemas (UNIVILLE).

## Como executar

Pré-requisito: JDK 21 com a variável `JAVA_HOME` configurada.

```bash
./mvnw spring-boot:run        # macOS / Linux / Git Bash
.\mvnw.cmd spring-boot:run    # Windows PowerShell
```

A API sobe em `http://localhost:8080`. O banco é um H2 em memória: os dados são perdidos ao reiniciar.

- Telas: `http://localhost:8080/` (abre a página de login)
- H2 console: `http://localhost:8080/h2-console` (JDBC URL `jdbc:h2:mem:chamadosdb`, usuário `sa`, senha em branco)
- Testes automatizados: `./mvnw test` (ou `.\mvnw.cmd test`)

## Autenticação e perfis

A API usa Spring Security com HTTP Basic, sem sessão: toda requisição envia usuário e senha no cabeçalho `Authorization`. Sem credenciais a resposta é **401**; com um perfil sem permissão, **403**. As telas e os arquivos estáticos são públicos, mas os dados só saem da API para quem está autenticado.

| Usuário | Senha | Perfil | Pode |
|---|---|---|---|
| `usuario` | `usuario123` | USUARIO | Cadastrar e consultar clientes, abrir, editar e acompanhar chamados, comentar, consultar categorias e técnicos |
| `tecnico` | `tecnico123` | TECNICO | Tudo do usuário + alterar status do chamado |
| `admin` | `admin123` | ADMIN | Tudo do técnico + atribuir técnico, manter categorias e técnicos e excluir registros |

Os perfis seguem uma hierarquia (ADMIN inclui TECNICO, que inclui USUARIO). As senhas podem ser trocadas pelas variáveis de ambiente `SENHA_USUARIO`, `SENHA_TECNICO` e `SENHA_ADMIN`. `GET /auth/me` devolve o usuário logado e seu perfil.

As telas escondem os botões que o perfil não pode usar, mas a regra vale na API: uma requisição forçada recebe 403.

## Estrutura

```
src/main/java/br/com/sistemas/chamados
├── controller   rotas HTTP e códigos de resposta
├── dto          contratos de entrada (Request) e saída (Response) da API
├── entity       mapeamento JPA (Cliente, Categoria, Tecnico, Chamado, Comentario + enums)
├── exception    exceções de domínio e GlobalExceptionHandler
├── repository   acesso a dados com Spring Data JPA
└── service      regras de negócio e transações
```

Relacionamentos: um **Chamado** pertence a um **Cliente** e a uma **Categoria** e pode ter um **Técnico** atribuído (`@ManyToOne`). Um Chamado tem vários **Comentários** (`@OneToMany` / `@ManyToOne`).

## Rotas

| Método | Rota | Ação | Sucesso |
|---|---|---|---|
| POST | `/clientes` | Criar cliente | 201 |
| GET | `/clientes` | Listar clientes | 200 |
| GET | `/clientes/{id}` | Buscar cliente | 200 |
| PUT | `/clientes/{id}` | Atualizar cliente | 200 |
| DELETE | `/clientes/{id}` | Excluir cliente | 204 |
| GET | `/clientes/{id}/chamados` | Chamados do cliente (paginado) | 200 |
| POST | `/categorias` | Criar categoria | 201 |
| GET | `/categorias` | Listar categorias | 200 |
| GET | `/categorias/{id}` | Buscar categoria | 200 |
| PUT | `/categorias/{id}` | Atualizar categoria | 200 |
| DELETE | `/categorias/{id}` | Excluir categoria | 204 |
| POST | `/tecnicos` | Criar técnico | 201 |
| GET | `/tecnicos` | Listar técnicos | 200 |
| GET | `/tecnicos/{id}` | Buscar técnico | 200 |
| PUT | `/tecnicos/{id}` | Atualizar técnico | 200 |
| DELETE | `/tecnicos/{id}` | Excluir técnico | 204 |
| POST | `/chamados` | Abrir chamado | 201 |
| GET | `/chamados` | Listar com filtros e paginação | 200 |
| GET | `/chamados/{id}` | Detalhe do chamado (com comentários) | 200 |
| PUT | `/chamados/{id}` | Atualizar chamado | 200 |
| DELETE | `/chamados/{id}` | Excluir chamado (e seus comentários) | 204 |
| PATCH | `/chamados/{id}/atribuir` | Atribuir técnico | 200 |
| PATCH | `/chamados/{id}/status` | Alterar status | 200 |
| POST | `/chamados/{id}/comentarios` | Comentar no chamado | 201 |
| GET | `/chamados/{id}/comentarios` | Listar comentários | 200 |
| GET | `/auth/me` | Usuário logado e perfil | 200 |

### Valores dos enums

- `perfil` (técnico): `ADMIN`, `TECNICO`
- `prioridade`: `BAIXA`, `MEDIA`, `ALTA`, `CRITICA`
- `status`: `ABERTO`, `EM_ATENDIMENTO`, `AGUARDANDO_CLIENTE`, `FECHADO`

## Regras de negócio

- E-mail de cliente e de técnico é único; nome de categoria é único (sem diferenciar maiúsculas/minúsculas). Violação → **409**.
- Todo chamado nasce `ABERTO`, com `dataAbertura` preenchida automaticamente e sem técnico.
- Status e técnico só mudam pelas rotas `PATCH`. Não é aceito mudar para o status atual (**409**).
- Ao mudar para `FECHADO`, `dataFechamento` é preenchida.
- Chamado `FECHADO` não pode ser alterado: PUT, atribuição, mudança de status e novos comentários retornam **409**.
- Cliente, categoria ou técnico com chamados vinculados não podem ser excluídos (**409**).

## Erros

Todos os erros seguem o mesmo formato (`ErroResposta`):

```json
{
  "momento": "2026-11-05T15:01:13.63",
  "status": 400,
  "erro": "Dados inválidos",
  "detalhes": ["email: E-mail inválido", "nome: Nome é obrigatório"]
}
```

| Status | Quando |
|---|---|
| 400 | Bean Validation falhou, JSON malformado, valor de enum desconhecido, parâmetro de URL inválido ou `sort` por campo inexistente |
| 401 | Credenciais ausentes ou incorretas |
| 403 | Usuário autenticado sem o perfil exigido pela rota |
| 404 | Recurso (cliente, categoria, técnico, chamado) não encontrado |
| 409 | Regra de negócio violada (duplicidade, chamado fechado, exclusão com chamados) |

## Exemplos de teste (curl)

No Windows, use `curl.exe` no PowerShell ou rode os comandos no Git Bash. O `-u admin:admin123` envia as credenciais (HTTP Basic).

```bash
# Cadastros básicos
curl -i -u admin:admin123 -X POST http://localhost:8080/clientes -H "Content-Type: application/json" \
  -d '{"nome":"Ana Souza","email":"ana@exemplo.com","telefone":"47999999999"}'

curl -i -u admin:admin123 -X POST http://localhost:8080/categorias -H "Content-Type: application/json" \
  -d '{"nome":"Hardware","descricao":"Problemas com equipamentos"}'

curl -i -u admin:admin123 -X POST http://localhost:8080/tecnicos -H "Content-Type: application/json" \
  -d '{"nome":"Carlos Lima","email":"carlos@empresa.com","perfil":"TECNICO"}'

# Abrir chamado (nasce ABERTO)
curl -i -u admin:admin123 -X POST http://localhost:8080/chamados -H "Content-Type: application/json" \
  -d '{"titulo":"Impressora nao liga","descricao":"Setor financeiro","prioridade":"ALTA","clienteId":1,"categoriaId":1}'

# Atribuir técnico e mudar status
curl -i -u admin:admin123 -X PATCH http://localhost:8080/chamados/1/atribuir -H "Content-Type: application/json" -d '{"tecnicoId":1}'
curl -i -u admin:admin123 -X PATCH http://localhost:8080/chamados/1/status   -H "Content-Type: application/json" -d '{"status":"EM_ATENDIMENTO"}'

# Comentar e ver o detalhe com os comentários
curl -i -u admin:admin123 -X POST http://localhost:8080/chamados/1/comentarios -H "Content-Type: application/json" \
  -d '{"texto":"Verificando o cabo de energia","autor":"Carlos"}'
curl -i -u admin:admin123 http://localhost:8080/chamados/1

# Fechar (preenche dataFechamento); depois disso qualquer alteração retorna 409
curl -i -u admin:admin123 -X PATCH http://localhost:8080/chamados/1/status -H "Content-Type: application/json" -d '{"status":"FECHADO"}'
```

### Consultas com filtros e paginação

Todos os filtros de `GET /chamados` são opcionais e podem ser combinados. Sem `sort`, a ordenação padrão é `dataAbertura` decrescente, 10 itens por página.

```bash
curl -i -u admin:admin123 "http://localhost:8080/chamados"                                   # todos, página 0
curl -i -u admin:admin123 "http://localhost:8080/chamados?status=ABERTO"                     # só abertos
curl -i -u admin:admin123 "http://localhost:8080/chamados?prioridade=CRITICA"                # só críticos
curl -i -u admin:admin123 "http://localhost:8080/chamados?status=ABERTO&prioridade=ALTA&clienteId=1"
curl -i -u admin:admin123 "http://localhost:8080/chamados?page=0&size=5&sort=prioridade,asc" # paginação + ordenação
curl -i -u admin:admin123 "http://localhost:8080/chamados?sort=titulo,asc&sort=dataAbertura,desc"
curl -i -u admin:admin123 "http://localhost:8080/clientes/1/chamados?page=0&size=5"          # chamados de um cliente
```

Resposta paginada:

```json
{
  "content": [ { "id": 1, "titulo": "Impressora nao liga", "status": "ABERTO", "...": "..." } ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```
