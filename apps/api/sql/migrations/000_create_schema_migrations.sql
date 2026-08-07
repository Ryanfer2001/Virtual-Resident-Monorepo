-- Tabela de controlo de migrações. Cada migração aplicada regista aqui o
-- seu nome de ficheiro, para que `node src/scripts/migrar.js` nunca a
-- reaplique. Não é tocada automaticamente pela API em runtime.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_ficheiro VARCHAR(255) NOT NULL,
  aplicada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_schema_migrations_nome (nome_ficheiro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
