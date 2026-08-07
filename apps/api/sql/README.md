# Migrações SQL — `apps/api`

Ficheiros versionados em `sql/migrations/`, aplicados por ordem numérica.
**Nunca correm automaticamente** quando a API arranca (`server.js`/`app.js`
não lhes tocam) — têm de ser aplicadas manualmente.

## Aplicar as migrações

```bash
cd apps/api
node src/scripts/migrar.js
```

O script:
- lê `sql/migrations/*.sql` por ordem alfabética/numérica;
- cria a tabela `schema_migrations` se ainda não existir;
- aplica apenas os ficheiros que ainda não estão registados nessa tabela;
- corre cada ficheiro dentro de uma transação (rollback automático em erro).

Pode ser corrido várias vezes em segurança — ficheiros já aplicados são
ignorados.

## Antes de aplicar em produção

A migração `003_add_foto_cartao_e_estados.sql` assume que `foto_cartao`
deve ter o mesmo tipo que `foto_perfil` (assumido `LONGBLOB` neste
ambiente, que não teve acesso à base de dados de produção para confirmar).
Corre isto primeiro e ajusta o ficheiro se for diferente:

```sql
SHOW COLUMNS FROM residentes LIKE 'foto_perfil';
```

## Criar a conta administrativa

Depois das migrações 001/002 aplicadas:

```bash
cd apps/api
npm run admin:seed
```

Lê `ADMIN_BOOTSTRAP_USERNAME` e `ADMIN_BOOTSTRAP_PASSWORD` do `.env`. Não
substitui a password se a conta já existir, e nunca imprime a password no
terminal.
