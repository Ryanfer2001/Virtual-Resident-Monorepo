export interface Administrador {
  id: number;
  username: string;
  role: "admin";
}

export interface LoginAdminResponse {
  sucesso: boolean;
  mensagem?: string;
  token?: string;
  admin?: Administrador;
}

export interface MeAdminResponse {
  sucesso: boolean;
  mensagem?: string;
  admin?: Administrador;
}

export type EstadoFoto = "ausente" | "pendente" | "aprovada" | "rejeitada";

export type EstadoResidente = "pendente" | "ativo" | "suspenso";

export interface ResumoDashboard {
  totalResidentes: number;
  contasAtivas: number;
  contasPendentes: number;
  contasSuspensas: number;
  somaSaldo: number;
  somaSwipes: number;
  fotosPendentes: number;
  pedidosCartaoPendentes: number;
  registosRecentes: Array<{
    id: string;
    nome: string;
    username: string;
    pacote: string;
    estado: EstadoResidente;
    criadoEm: string;
  }>;
}

export interface ResidenteListagem {
  id: string;
  nome: string;
  username: string;
  email: string;
  telefone: string;
  pais: string;
  municipio: string;
  pacote: string;
  saldo: number;
  swipes: number;
  estado: EstadoResidente;
  pedidoCartao: boolean;
  estadoPedidoCartao: string;
  cartaoGerado: boolean;
  estadoFotoPerfil: EstadoFoto;
  estadoFotoBI: EstadoFoto;
  estadoFotoCartao: EstadoFoto;
  criadoEm: string;
}

export interface EntradaAuditoria {
  id: number;
  adminId: number;
  adminUsername: string;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  valoresAnteriores: Record<string, unknown> | null;
  valoresNovos: Record<string, unknown> | null;
  motivo: string | null;
  ip: string | null;
  criadoEm: string;
}

export interface ResidenteDetalhe {
  id: string;
  nome: string;
  username: string;
  email: string;
  telefone: string;
  dataNascimento: string;
  nacionalidade: string;
  documento: string;
  morada: string;
  municipio: string;
  pais: string;
  codigoPostal: string;
  pacote: string;
  saldo: number;
  swipes: number;
  parking: boolean;
  eventos: boolean;
  uid: string;
  qrAtivo: boolean;
  pedidoCartao: boolean;
  estadoPedidoCartao: string;
  cartaoGerado: boolean;
  estado: EstadoResidente;
  criadoEm: string;
  estadoFotoPerfil: EstadoFoto;
  estadoFotoBI: EstadoFoto;
  estadoFotoCartao: EstadoFoto;
  motivoRejeicaoFotoPerfil: string | null;
  motivoRejeicaoFotoBI: string | null;
  motivoRejeicaoFotoCartao: string | null;
  fotoPerfilTipo: string | null;
  fotoBITipo: string | null;
  fotoCartaoTipo: string | null;
}

export interface ResidenteDetalheResponse {
  sucesso: boolean;
  mensagem?: string;
  residente?: ResidenteDetalhe;
  historico?: EntradaAuditoria[];
}

export interface ListaResidentesResponse {
  sucesso: boolean;
  mensagem?: string;
  residentes: ResidenteListagem[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface FiltrosResidentes {
  pesquisa?: string;
  estado?: EstadoResidente;
  pacote?: string;
  pais?: string;
  fotosPendentes?: boolean;
  pedidoCartao?: boolean;
  cartaoGerado?: boolean;
  pagina?: number;
  porPagina?: number;
}

export interface AjustarValorPayload {
  operacao: "adicionar" | "retirar" | "definir";
  valor: number;
  motivo: string;
}

export interface AtualizarEstadoPayload {
  estado: EstadoResidente;
  motivo?: string;
}

export interface AtualizarPermissoesPayload {
  parking?: boolean;
  eventos?: boolean;
}

export type TipoFotoRevisao = "perfil" | "bi" | "cartao";

export interface ResidenteFotoPendente {
  id: string;
  nome: string;
  username: string;
  pacote: string;
  estadoFotoPerfil: EstadoFoto;
  estadoFotoBI: EstadoFoto;
  estadoFotoCartao: EstadoFoto;
  dataFotos: string | null;
}

export interface PedidoCartao {
  id: string;
  nome: string;
  username: string;
  email: string;
  telefone: string;
  pacote: string;
  uid: string;
  pedidoCartao: boolean;
  estadoPedidoCartao: string;
  cartaoGerado: boolean;
  criadoEm: string;
  fotoPerfilTipo: string;
  temFotoPerfil: boolean;
}

export interface RespostaSimples {
  sucesso: boolean;
  mensagem?: string;
}

export interface RespostaAuditoria {
  sucesso: boolean;
  mensagem?: string;
  auditoria: EntradaAuditoria[];
  total: number;
  pagina: number;
  porPagina: number;
}
