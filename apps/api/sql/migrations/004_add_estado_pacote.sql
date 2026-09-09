-- ETAPA 2 — Cabo Verde Virtual Resident
--
-- Pacotes pagos deixam de receber benefícios (saldo/swipes/eventos/
-- parking) no momento do registo — só passam a "ativo" depois do
-- pagamento SISP ser confirmado (ligação feita numa fase futura).
--
-- estadoPacote é uma coluna nova e independente de `estado`, que já
-- representa a verificação da conta/fotos (ver authController.registar
-- e adminDashboardController). Reutilizar `estado` misturaria os dois
-- conceitos e quebraria as contagens administrativas existentes
-- (ativas/pendentes/suspensas).
--
-- Aditiva, com DEFAULT 'ativo': não reclassifica nenhuma conta
-- existente — todas continuam com o pacote que já tinham.

ALTER TABLE residentes
  ADD COLUMN estadoPacote
    ENUM('ativo', 'pendente_pagamento')
    NOT NULL DEFAULT 'ativo'
    AFTER estado;
