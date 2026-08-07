-- Conta(s) administrativa(s). Nesta fase existe apenas uma conta ativa
-- (username "DevTeam", criada pelo script src/scripts/criarAdmin.js).
-- Não existe endpoint público para registar administradores.

CREATE TABLE IF NOT EXISTS administradores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'admin',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  tentativas_falhadas INT NOT NULL DEFAULT 0,
  bloqueado_ate DATETIME NULL DEFAULT NULL,
  ultimo_login DATETIME NULL DEFAULT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_administradores_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
