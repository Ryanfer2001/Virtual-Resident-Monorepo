const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const pool = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const pagamentoRoutes = require("./routes/pagamentoRoutes");
const residenteRoutes = require("./routes/residenteRoutes");
const adminRoutes = require("./routes/adminRoutes");
const residenteController = require("./controllers/residenteController");
const app = express();

/*
|--------------------------------------------------------------------------
| Verificação das rotas
|--------------------------------------------------------------------------
| Ajuda a identificar imediatamente se algum ficheiro de rotas não foi
| exportado corretamente.
*/

if (typeof authRoutes !== "function") {
  throw new TypeError(
    "authRoutes não é uma função Router. Verifica o module.exports em src/routes/authRoutes.js."
  );
}

if (typeof residenteRoutes !== "function") {
  throw new TypeError(
    "residenteRoutes não é uma função Router. Verifica o module.exports em src/routes/residenteRoutes.js."
  );
}

/*
|--------------------------------------------------------------------------
| Segurança
|--------------------------------------------------------------------------
*/

app.use(helmet());

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/*
|--------------------------------------------------------------------------
| Leitura dos dados enviados pelo frontend
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

/*
|--------------------------------------------------------------------------
| Página inicial da API
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  return res.status(200).json({
    sucesso: true,
    mensagem: "API Nos Zona Smart"
  });
});

/*
|--------------------------------------------------------------------------
| Teste geral do backend
|--------------------------------------------------------------------------
*/

app.get("/api/teste", (req, res) => {
  return res.status(200).json({
    sucesso: true,
    mensagem: "Backend Node.js do Nos Zona Smart está a funcionar.",
    data: new Date().toISOString()
  });
});

/*
|--------------------------------------------------------------------------
| Teste da ligação ao MySQL
|--------------------------------------------------------------------------
*/

app.get("/api/database/teste", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT NOW() AS dataServidor"
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: "Ligação ao MySQL estabelecida com sucesso.",
      dataServidor: rows[0].dataServidor
    });
  } catch (erro) {
    console.error("Erro na ligação MySQL:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Não foi possível ligar ao MySQL.",
      erro: erro.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| Rotas de autenticação
|--------------------------------------------------------------------------
|
| Exemplos:
| POST /api/auth/login
| POST /api/auth/registo
| GET  /api/auth/perfil
|
*/

app.use("/api/auth", authRoutes);

/*
|--------------------------------------------------------------------------
| Rotas compatíveis com o antigo backend Node-RED
|--------------------------------------------------------------------------
|
| Exemplos:
| POST /api/residentes/login
| POST /api/residentes/registar
| GET  /api/residentes/perfil
|
*/

app.use("/api/residentes", residenteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pagamento", pagamentoRoutes);

/*
|--------------------------------------------------------------------------
| Endpoints legados do Node-RED (compatibilidade com leitores RFID)
|--------------------------------------------------------------------------
|
| Estes endpoints não seguem o prefixo /api/residentes ou /api/admin porque
| replicam exatamente os endereços originais do Node-RED, usados por
| leitores RFID e outros dispositivos já em produção.
|
*/

app.post(
  "/validar-cartao-residente",
  residenteController.validarCartaoResidenteLegado
);

app.post(
  "/api/validar-qr-residente",
  residenteController.validarQRResidenteLegado
);

/*
|--------------------------------------------------------------------------
| Endpoint não encontrado
|--------------------------------------------------------------------------
| Esta parte deve permanecer depois de todas as rotas.
*/

app.use((req, res) => {
  return res.status(404).json({
    sucesso: false,
    mensagem: "Endpoint não encontrado.",
    metodo: req.method,
    endpoint: req.originalUrl
  });
});

/*
|--------------------------------------------------------------------------
| Tratamento geral de erros
|--------------------------------------------------------------------------
*/

app.use((erro, req, res, next) => {
  console.error("Erro não tratado:", erro);

  if (res.headersSent) {
    return next(erro);
  }

  return res.status(500).json({
    sucesso: false,
    mensagem: "Erro interno no servidor."
  });
});

module.exports = app;