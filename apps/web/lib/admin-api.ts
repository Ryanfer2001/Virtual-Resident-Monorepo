import type {
  AjustarValorPayload,
  AtualizarEstadoPayload,
  AtualizarPermissoesPayload,
  FiltrosResidentes,
  ListaResidentesResponse,
  LoginAdminResponse,
  MeAdminResponse,
  PedidoCartao,
  ResidenteDetalheResponse,
  RespostaAuditoria,
  RespostaSimples,
  TipoFotoRevisao,
} from "@/types/admin";

import {
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_CSRF_HEADER_NAME,
} from "@/lib/admin-session";

/*
 * Todas as chamadas passam pelo proxy do próprio Next.js
 * (app/api/admin/...), nunca diretamente para o apps/api — o cookie
 * HttpOnly da sessão administrativa nunca é lido nem manuseado aqui.
 */

function obterCookieCsrf(): string {
  if (typeof document === "undefined") {
    return "";
  }

  const linha = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${ADMIN_CSRF_COOKIE_NAME}=`));

  return linha ? decodeURIComponent(linha.split("=")[1]) : "";
}

async function pedido<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<T> {
  const resposta = await fetch(`/api/admin${caminho}`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      [ADMIN_CSRF_HEADER_NAME]: obterCookieCsrf(),
      ...(opcoes.headers || {}),
    },
    ...opcoes,
  });

  const dados = (await resposta.json()) as T & { mensagem?: string };

  if (!resposta.ok) {
    throw new Error(
      dados?.mensagem || `Erro no pedido administrativo (${resposta.status}).`,
    );
  }

  return dados;
}

export async function loginAdmin(
  username: string,
  password: string,
): Promise<LoginAdminResponse> {
  return pedido<LoginAdminResponse>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutAdmin(): Promise<RespostaSimples> {
  return pedido<RespostaSimples>("/logout", { method: "POST" });
}

export async function obterSessaoAdmin(): Promise<MeAdminResponse> {
  return pedido<MeAdminResponse>("/me");
}

export async function obterResumo() {
  return pedido<{ sucesso: boolean; resumo: import("@/types/admin").ResumoDashboard }>(
    "/dashboard/resumo",
  );
}

function construirQuery(filtros: FiltrosResidentes): string {
  const parametros = new URLSearchParams();

  if (filtros.pesquisa) parametros.set("pesquisa", filtros.pesquisa);
  if (filtros.estado) parametros.set("estado", filtros.estado);
  if (filtros.pacote) parametros.set("pacote", filtros.pacote);
  if (filtros.pais) parametros.set("pais", filtros.pais);
  if (filtros.fotosPendentes) parametros.set("fotosPendentes", "1");
  if (filtros.pedidoCartao) parametros.set("pedidoCartao", "1");
  if (filtros.cartaoGerado !== undefined) {
    parametros.set("cartaoGerado", filtros.cartaoGerado ? "1" : "0");
  }
  if (filtros.pagina) parametros.set("pagina", String(filtros.pagina));
  if (filtros.porPagina) parametros.set("porPagina", String(filtros.porPagina));

  const query = parametros.toString();
  return query ? `?${query}` : "";
}

export async function listarResidentes(
  filtros: FiltrosResidentes = {},
): Promise<ListaResidentesResponse> {
  return pedido<ListaResidentesResponse>(
    `/residentes${construirQuery(filtros)}`,
  );
}

export async function obterResidente(
  id: string,
): Promise<ResidenteDetalheResponse> {
  return pedido<ResidenteDetalheResponse>(
    `/residentes/${encodeURIComponent(id)}`,
  );
}

export async function atualizarEstadoResidente(
  id: string,
  payload: AtualizarEstadoPayload,
): Promise<RespostaSimples> {
  return pedido<RespostaSimples>(
    `/residentes/${encodeURIComponent(id)}/estado`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function atualizarPermissoesResidente(
  id: string,
  payload: AtualizarPermissoesPayload,
): Promise<RespostaSimples> {
  return pedido<RespostaSimples>(
    `/residentes/${encodeURIComponent(id)}/permissoes`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function ajustarSaldo(
  id: string,
  payload: AjustarValorPayload,
): Promise<RespostaSimples> {
  return pedido<RespostaSimples>(
    `/residentes/${encodeURIComponent(id)}/saldo`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function ajustarSwipes(
  id: string,
  payload: AjustarValorPayload,
): Promise<RespostaSimples> {
  return pedido<RespostaSimples>(
    `/residentes/${encodeURIComponent(id)}/swipes`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function urlFotoResidente(id: string, tipo: TipoFotoRevisao): string {
  return `/api/admin/residentes/${encodeURIComponent(id)}/foto-${tipo}`;
}

export async function listarFotosPendentes() {
  return pedido<{
    sucesso: boolean;
    total: number;
    residentes: import("@/types/admin").ResidenteFotoPendente[];
  }>("/fotos");
}

export async function aprovarFoto(
  id: string,
  tipo: TipoFotoRevisao,
): Promise<RespostaSimples> {
  return pedido<RespostaSimples>(`/fotos/${encodeURIComponent(id)}/aprovar`, {
    method: "POST",
    body: JSON.stringify({ tipo }),
  });
}

export async function rejeitarFoto(
  id: string,
  tipo: TipoFotoRevisao,
  motivo: string,
): Promise<RespostaSimples> {
  return pedido<RespostaSimples>(`/fotos/${encodeURIComponent(id)}/rejeitar`, {
    method: "POST",
    body: JSON.stringify({ tipo, motivo }),
  });
}

export async function listarPedidosCartao() {
  return pedido<{ sucesso: boolean; total: number; pedidos: PedidoCartao[] }>(
    "/cartoes/pedidos",
  );
}

export async function aprovarPedidoCartao(id: string): Promise<RespostaSimples> {
  return pedido<RespostaSimples>(
    `/cartoes/${encodeURIComponent(id)}/aprovar`,
    { method: "POST" },
  );
}

export async function rejeitarPedidoCartao(
  id: string,
  motivo: string,
): Promise<RespostaSimples> {
  return pedido<RespostaSimples>(
    `/cartoes/${encodeURIComponent(id)}/rejeitar`,
    { method: "POST", body: JSON.stringify({ motivo }) },
  );
}

export async function marcarCartaoGerado(
  id: string,
  uid: string,
): Promise<RespostaSimples> {
  return pedido<RespostaSimples>(
    `/cartoes/${encodeURIComponent(id)}/gerado`,
    { method: "POST", body: JSON.stringify({ uid }) },
  );
}

export async function listarAuditoria(
  filtros: { entidadeId?: string; pagina?: number; porPagina?: number } = {},
): Promise<RespostaAuditoria> {
  const parametros = new URLSearchParams();

  if (filtros.entidadeId) parametros.set("entidadeId", filtros.entidadeId);
  if (filtros.pagina) parametros.set("pagina", String(filtros.pagina));
  if (filtros.porPagina) parametros.set("porPagina", String(filtros.porPagina));

  const query = parametros.toString();

  return pedido<RespostaAuditoria>(`/auditoria${query ? `?${query}` : ""}`);
}
