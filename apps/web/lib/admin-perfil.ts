import { PACOTES } from "@/lib/pacotes";

/*
 * Deriva o perfil (Visitor/Diaspora/Business/Student) a partir do nome do
 * plano guardado em residente.pacote. Usa apps/web/lib/pacotes.ts como
 * única fonte de verdade dos 12 planos — nunca duplicar a lista aqui.
 */
export function derivarPerfilDoPacote(pacote: string): string {
  for (const categoria of PACOTES) {
    if (categoria.planos.some((plano) => plano.nome === pacote)) {
      return categoria.titulo;
    }
  }

  return "—";
}
