# Noszona Monorepo

Monorepo do projeto **Nos Zona Smart**, criado a partir de dois projetos existentes e independentes, sem alterar ou mover os originais.

## Objetivo

Reunir o frontend Next.js e o backend Node.js/Express num único repositório gerido por **pnpm workspaces** e **Turborepo**, mantendo o frontend e o backend como aplicações totalmente independentes (deploy separado), preparando o terreno para pacotes partilhados (`types`, `validation`, `api-client`, `ui`) no futuro.

## Localização dos projetos originais (não alterados)

- Backend Node.js + Express: `D:\Virtual_Resident\noszona-backend`
- Frontend Next.js: `D:\Virtual_Resident\Virtual Resident-Frontend`

Estes projetos permanecem exatamente nos seus locais atuais, intactos e funcionais. Todo o conteúdo do monorepo foi criado por **cópia** de ficheiros de texto (código-fonte); nenhum ficheiro `.env` real, `node_modules` ou binário foi copiado.

## Estrutura

```
Noszona-Monorepo/
├── apps/
│   ├── web/     → @noszona/web  (Next.js 16, App Router, TypeScript)
│   └── api/     → @noszona/api  (Node.js + Express 5)
├── packages/
│   ├── types/       → @noszona/types       (reservado, vazio)
│   ├── validation/  → @noszona/validation  (reservado, vazio)
│   ├── api-client/  → @noszona/api-client  (reservado, vazio)
│   └── ui/          → @noszona/ui          (reservado, vazio)
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
└── README.md
```

## Requisitos

- Node.js 20+ (recomendado, alinhado com `@types/node ^20` do frontend)
- pnpm 10+ (`packageManager: "pnpm@10"` definido na raiz)
- Turborepo (instalado como devDependency da raiz)

## Instalação

```bash
pnpm install
```

## Desenvolvimento

```bash
pnpm dev          # corre dev de todos os workspaces em paralelo (turbo)
pnpm dev:web      # apenas o frontend Next.js (apps/web)
pnpm dev:api      # apenas o backend Express (apps/api)
```

## Build

```bash
pnpm build        # build de todos os workspaces (turbo)
pnpm build:web    # build apenas do frontend Next.js
```

## Variáveis de ambiente

Nunca foram copiados ficheiros `.env` reais. Foram criados `.env.example` com os nomes das variáveis usadas no código (valores vazios):

- `apps/web/.env.example` — `NODE_RED_URL`, `JWT_SECRET`, `NEXT_PUBLIC_REGISTO_ENDPOINT`, `NEXT_PUCLIC_LOGIN_ENDPOINT` (nome mantido tal como está no `.env.local` original, incluindo o erro de escrita `PUCLIC`).
- `apps/api/.env.example` — variáveis de servidor (`PORT`, `FRONTEND_URL`, `FRONTEND_DASHBOARD_URL`), base de dados MySQL (`DB_*`), autenticação (`JWT_SECRET`), pagamento SISP/Vinti4 (`SISP_*`) e SMTP (`SMTP_*`).

Antes de correr `pnpm dev:api` localmente, copia `apps/api/.env.example` para `apps/api/.env` e preenche com os valores reais (nunca committar este ficheiro).

## Deploy do frontend (Vercel)

- Root Directory: `apps/web`
- Build Command: `pnpm build` (ou `turbo run build --filter=@noszona/web`)
- Install Command: `pnpm install`
- Output: gerido automaticamente pelo preset Next.js da Vercel

## Deploy do backend (Hostinger Web App)

- Root Directory: `apps/api`
- Start Command: `pnpm start` (equivalente a `node src/server.js`)
- Variáveis de ambiente configuradas diretamente no painel da Hostinger (nunca a partir de um `.env` commitado)

O frontend e o backend continuam a ser publicados **separadamente**, mesmo estando no mesmo monorepo.

## Workspaces e Turborepo

O `pnpm-workspace.yaml` cobre `apps/*` e `packages/*`. Cada pasta usada como workspace tem o seu próprio `package.json` com um `name` no formato `@noszona/<nome>`:

| Caminho              | Nome do pacote        | Papel                                    |
|----------------------|------------------------|-------------------------------------------|
| `apps/web`           | `@noszona/web`         | Frontend Next.js (App Router)             |
| `apps/api`           | `@noszona/api`         | Backend Express                           |
| `packages/types`     | `@noszona/types`       | Reservado para tipos partilhados          |
| `packages/validation`| `@noszona/validation`  | Reservado para validação partilhada       |
| `packages/api-client`| `@noszona/api-client`  | Reservado para cliente de API partilhado  |
| `packages/ui`        | `@noszona/ui`          | Reservado para componentes de UI partilhados |

O `turbo.json` define `dev`/`start` como tarefas persistentes e sem cache (`cache: false`, `persistent: true`), e `build`/`lint`/`test` como tarefas cacheáveis. Para correr um script apenas num workspace específico: `pnpm --filter @noszona/api <script>`.

## Futura integração com Node-RED

O backend já inclui endpoints pensados para compatibilidade com o antigo backend Node-RED e leitores RFID, todos definidos em `apps/api/src/app.js` e `apps/api/src/routes/residenteRoutes.js`:

- `POST /validar-cartao-residente`
- `POST /api/validar-qr-residente`
- `POST /api/residentes/login`, `/google-login`, `/registar`, `/solicitar-cartao`
- `POST /api/admin/gerar-cartao`

Estes endpoints **não passam pelo `authMiddleware.autenticarToken`**, por serem pensados para dispositivos e integrações automáticas, não para utilizadores autenticados via browser. Não existem, neste momento, WebSockets nem MQTT no projeto — qualquer integração futura com Node-RED por esses canais teria de ser construída de raiz.

Nota adicional: `apps/web/app/api/residentes/login/route.ts` (rota interna do Next.js) já faz proxy diretamente para o Node-RED/Hostinger legado (`NODE_RED_URL`), em paralelo ao `@noszona/api` deste monorepo — os dois caminhos de autenticação (novo backend Express vs. Node-RED legado) coexistem atualmente e precisam de ser unificados numa fase futura.

## Próximos passos

- Copiar manualmente `public/img/*.jpg` (8 imagens) e `app/favicon.ico` do projeto original para `apps/web/public/img/` e `apps/web/app/favicon.ico` — ver relatório final para detalhes.
- Correr `pnpm install`, `pnpm dev:web`, `pnpm dev:api` e `pnpm build:web` localmente para validar o ambiente (não foi possível nesta sessão).
- Decidir se as rotas `/app/api/residentes/*` do frontend passam a apontar para `@noszona/api` em vez do Node-RED legado.
- Ligar os pacotes `packages/*` às aplicações quando houver código realmente partilhado.
