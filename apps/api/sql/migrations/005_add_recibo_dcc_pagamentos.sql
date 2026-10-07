-- Recibo de pagamento + email automático
--
-- Guarda os campos DCC devolvidos pela SISP no callback (dcc, dccAmount,
-- dccCurrency, dccMarkup, dccRate) e o registo de quando o email do
-- recibo foi enviado com sucesso (reciboEmailEnviadoEm). Tudo aditivo e
-- NULL por omissão — não reclassifica nenhum pagamento existente, não
-- afeta a fórmula de FingerPrint nem a lógica de aprovação/crédito.

ALTER TABLE pagamentos
  ADD COLUMN dcc VARCHAR(3) NULL DEFAULT NULL AFTER confirmadoEm,
  ADD COLUMN dccAmount VARCHAR(20) NULL DEFAULT NULL AFTER dcc,
  ADD COLUMN dccCurrency VARCHAR(10) NULL DEFAULT NULL AFTER dccAmount,
  ADD COLUMN dccMarkup VARCHAR(20) NULL DEFAULT NULL AFTER dccCurrency,
  ADD COLUMN dccRate VARCHAR(20) NULL DEFAULT NULL AFTER dccMarkup,
  ADD COLUMN reciboEmailEnviadoEm DATETIME NULL DEFAULT NULL AFTER dccRate;
