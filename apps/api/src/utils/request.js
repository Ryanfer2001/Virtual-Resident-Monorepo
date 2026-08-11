/*
 * Deteta o IP do pedido, com suporte a proxy reverso (x-forwarded-for).
 * Usado pelos controllers administrativos para gravar o IP na auditoria.
 */
function obterIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "desconhecido"
  );
}

module.exports = {
  obterIp
};
