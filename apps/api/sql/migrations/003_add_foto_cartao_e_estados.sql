-- Fecha o gap identificado na auditoria: o dashboard do residente já
-- envia fotoCartaoBase64 (commit "Foto cartao"), mas a tabela `residentes`
-- ainda não tem onde a guardar. Acrescenta também um estado próprio para
-- cada uma das três fotografias (rosto/perfil, BI, cartão), em vez do
-- único `fotos_aprovadas` partilhado que existe hoje. Todas as colunas
-- são aditivas (NULL/DEFAULT) e não tocam em dados existentes.
--
-- IMPORTANTE antes de aplicar em produção: confirma o tipo real da coluna
-- `foto_perfil` com `SHOW COLUMNS FROM residentes LIKE 'foto_perfil'` — este
-- ambiente de desenvolvimento não teve acesso à base de dados para
-- confirmar. `foto_cartao` está definida abaixo com o mesmo tipo assumido
-- (LONGBLOB), consistente com o limite de 2MB já validado em
-- residenteController.atualizarFotos. Ajusta se `foto_perfil` for
-- diferente (ex.: MEDIUMBLOB).

ALTER TABLE residentes
  ADD COLUMN foto_cartao LONGBLOB NULL DEFAULT NULL AFTER foto_bi_tipo,
  ADD COLUMN foto_cartao_tipo VARCHAR(50) NULL DEFAULT NULL AFTER foto_cartao,

  ADD COLUMN estado_foto_perfil
    ENUM('ausente', 'pendente', 'aprovada', 'rejeitada')
    NOT NULL DEFAULT 'ausente' AFTER foto_cartao_tipo,
  ADD COLUMN estado_foto_bi
    ENUM('ausente', 'pendente', 'aprovada', 'rejeitada')
    NOT NULL DEFAULT 'ausente' AFTER estado_foto_perfil,
  ADD COLUMN estado_foto_cartao
    ENUM('ausente', 'pendente', 'aprovada', 'rejeitada')
    NOT NULL DEFAULT 'ausente' AFTER estado_foto_bi,

  ADD COLUMN motivo_rejeicao_foto_perfil VARCHAR(255) NULL DEFAULT NULL
    AFTER estado_foto_cartao,
  ADD COLUMN motivo_rejeicao_foto_bi VARCHAR(255) NULL DEFAULT NULL
    AFTER motivo_rejeicao_foto_perfil,
  ADD COLUMN motivo_rejeicao_foto_cartao VARCHAR(255) NULL DEFAULT NULL
    AFTER motivo_rejeicao_foto_bi,

  ADD COLUMN foto_perfil_revisado_em DATETIME NULL DEFAULT NULL
    AFTER motivo_rejeicao_foto_cartao,
  ADD COLUMN foto_perfil_revisado_por INT NULL DEFAULT NULL
    AFTER foto_perfil_revisado_em,
  ADD COLUMN foto_bi_revisado_em DATETIME NULL DEFAULT NULL
    AFTER foto_perfil_revisado_por,
  ADD COLUMN foto_bi_revisado_por INT NULL DEFAULT NULL
    AFTER foto_bi_revisado_em,
  ADD COLUMN foto_cartao_revisado_em DATETIME NULL DEFAULT NULL
    AFTER foto_bi_revisado_por,
  ADD COLUMN foto_cartao_revisado_por INT NULL DEFAULT NULL
    AFTER foto_cartao_revisado_em;

ALTER TABLE residentes
  ADD CONSTRAINT fk_residentes_foto_perfil_revisor
    FOREIGN KEY (foto_perfil_revisado_por) REFERENCES administradores (id),
  ADD CONSTRAINT fk_residentes_foto_bi_revisor
    FOREIGN KEY (foto_bi_revisado_por) REFERENCES administradores (id),
  ADD CONSTRAINT fk_residentes_foto_cartao_revisor
    FOREIGN KEY (foto_cartao_revisado_por) REFERENCES administradores (id);

-- Migra o estado legado (fotos_aprovadas cobre rosto+BI em conjunto) para
-- os novos campos granulares, só para residentes que já têm fotografia.
-- O campo legado `fotos_aprovadas` não é removido nem deixa de ser
-- atualizado pelo fluxo antigo — fica como compatibilidade.
UPDATE residentes
SET estado_foto_perfil = CASE
      WHEN foto_perfil IS NULL OR OCTET_LENGTH(foto_perfil) = 0 THEN 'ausente'
      WHEN fotos_aprovadas = 1 THEN 'aprovada'
      ELSE 'pendente'
    END,
    estado_foto_bi = CASE
      WHEN foto_bi IS NULL OR OCTET_LENGTH(foto_bi) = 0 THEN 'ausente'
      WHEN fotos_aprovadas = 1 THEN 'aprovada'
      ELSE 'pendente'
    END;
