export function criarDataUrlImagem(
  base64?: string,
  tipo?: string,
): string {
  const valor = String(base64 || "").trim();

  if (!valor) {
    return "";
  }

  if (valor.startsWith("data:image/")) {
    return valor;
  }

  return `data:${tipo || "image/jpeg"};base64,${valor}`;
}