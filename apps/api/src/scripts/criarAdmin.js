/*
 * Bootstrap manual da conta administrativa. Corre-se uma única vez com
 * `npm run admin:seed` (ou `node src/scripts/criarAdmin.js`). Nunca é
 * chamado por app.js/server.js e nunca imprime a password no terminal.
 * Se a conta já existir, não substitui a password — termina sem alterar
 * nada.
 */

require("dotenv").config();

const bcrypt = require("bcrypt");

const pool = require("../config/database");
const adminModel = require("../models/adminModel");

const CUSTO_BCRYPT = 12;

async function main() {
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!username || !username.trim()) {
    console.error(
      "ADMIN_BOOTSTRAP_USERNAME não está definida no .env."
    );
    process.exit(1);
  }

  if (!password) {
    console.error(
      "ADMIN_BOOTSTRAP_PASSWORD não está definida no .env."
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error(
      "ADMIN_BOOTSTRAP_PASSWORD deve ter pelo menos 8 caracteres."
    );
    process.exit(1);
  }

  const usernameLimpo = username.trim();

  const existente = await adminModel.procurarPorUsername(usernameLimpo);

  if (existente) {
    console.log(
      `A conta "${usernameLimpo}" já existe (id ${existente.id}). ` +
        "Nenhuma alteração foi feita."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, CUSTO_BCRYPT);

  const criado = await adminModel.criarAdmin({
    username: usernameLimpo,
    passwordHash,
    role: "admin"
  });

  console.log(
    `Conta administrativa "${usernameLimpo}" criada com sucesso (id ${criado.insertId}).`
  );
}

main()
  .catch((erro) => {
    console.error("Erro ao criar a conta administrativa:", erro.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
