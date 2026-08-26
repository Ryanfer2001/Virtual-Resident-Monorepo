export interface Residente {
  id: string;
  nome: string;
  username: string;

  email?: string;
  telefone?: string;
  dataNascimento?: string;
  nacionalidade?: string;
  documento?: string;
  morada?: string;
  municipio?: string;
  pais?: string;
  codigoPostal?: string;

  pacote?: string;
  saldo?: number;
  swipes?: number;
  eventos?: boolean;
  parking?: boolean;

  uid?: string;
  qrToken?: string;
  qrAtivo?: boolean;

  cartaoGerado?: boolean;
  pedidoCartao?: boolean;
  estadoPedidoCartao?: string;

  fotoPerfil?: string;
fotoPerfilBase64?: string;
fotoPerfilTipo?: string;
fotosAprovadas?: boolean;

fotoCartaoBase64?: string;
fotoCartaoTipo?: string;

emailConfirmado?: boolean;
}

export interface LoginResponse {
  sucesso: boolean;
  mensagem?: string;
  token?: string;
  residente?: Residente;
}

export interface RegistoData {
  nome: string;
  dataNascimento: string;
  nacionalidade: string;
  documento: string;
  telefone: string;
  email: string;
  morada: string;
  municipio: string;
  username: string;
  password: string;
  pacote: string;
  pais: string;
  codigoPostal: string;
}

export interface RegistoResponse {
  sucesso: boolean;
  mensagem?: string;
  residenteId?: string;
  residente?: Residente;
  token?: string;
}

export interface EnviarFotosPayload {
  residenteId: string;
  fotoPerfilBase64?: string;
  fotoBIBase64?: string;
  fotoCartaoBase64?: string;
}

export interface EnviarFotosResponse {
  sucesso: boolean;
  mensagem?: string;
}