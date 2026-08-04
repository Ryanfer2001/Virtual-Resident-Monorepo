require("dotenv").config();

const app = require("./app");

const PORT = Number(process.env.PORT) || 3002;

const servidor = app.listen(PORT, () => {
  console.log("========================================");
  console.log("Backend Nos Zona Smart iniciado");
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Teste: http://localhost:${PORT}/api/teste`);
  console.log("========================================");
});

servidor.on("error", (erro) => {
  console.error("Erro ao iniciar o servidor:", erro.message);
  process.exit(1);
});