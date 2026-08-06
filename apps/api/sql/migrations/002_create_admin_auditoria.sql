-- Registo de auditoria de todas as ações administrativas. Nunca é
-- apagado através do frontend; só leitura para a interface de admin.

CREATE TABLE IF NOT EXISTS admin_auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  acao VARCHAR(80) NOT NULL,
  entidade VARCHAR(60) NOT NULL,
  entidade_id VARCHAR(60) NULL DEFAULT NULL,
  valores_anteriores JSON NULL DEFAULT NULL,
  valores_novos JSON NULL DEFAULT NULL,
  motivo VARCHAR(500) NULL DEFAULT NULL,
  ip VARCHAR(64) NULL DEFAULT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_auditoria_admin
    FOREIGN KEY (admin_id) REFERENCES administradores (id),
  KEY idx_admin_auditoria_entidade (entidade, entidade_id),
  KEY idx_admin_auditoria_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
