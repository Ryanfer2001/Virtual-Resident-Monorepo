/*
 * Aplica as migrações SQL versionadas em sql/migrations/, por ordem, dentro
 * de uma transação por ficheiro. Nunca é chamado por app.js/server.js —
 * corre-se manualmente com `node src/scripts/migrar.js`.
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const PASTA_MIGRACOES = path.join(
  __dirname,
  "..",
  "..",
  "sql",
  "migrations"
);

async function obterFicheirosMigracoes() {
  const ficheiros = await fs.promises.readdir(PASTA_MIGRACOES);

  return ficheiros
    .filter((nome) => nome.endsWith(".sql"))
    .sort();
}

async function garantirTabelaControlo(conexao) {
  const conteudo = await fs.promises.readFile(
    path.join(PASTA_MIGRACOES, "000_create_schema_migrations.sql"),
    "utf8"
  );

  await conexao.query(conteudo);
}

async function obterMigracoesAplicadas(conexao) {
  const [linhas] = await conexao.query(
    "SELECT nome_ficheiro FROM schema_migrations"
  );

  return new Set(linhas.map((linha) => linha.nome_ficheiro));
}

async function aplicarMigracao(conexao, nomeFicheiro) {
  const caminho = path.join(PASTA_MIGRACOES, nomeFicheiro);
  const sql = await fs.promises.readFile(caminho, "utf8");

  await conexao.beginTransaction();

  try {
    await conexao.query(sql);

    await conexao.execute(
      "INSERT INTO schema_migrations (nome_ficheiro) VALUES (?)",
      [nomeFicheiro]
    );

    await conexao.commit();

    console.log(`Aplicada: ${nomeFicheiro}`);
  } catch (erro) {
    await conexao.rollback();
    throw new Error(`Falhou a migração ${nomeFicheiro}: ${erro.message}`);
  }
}

async function main() {
  const camposObrigatorios = [
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME"
  ];

  const emFalta = camposObrigatorios.filter(
    (campo) => !process.env[campo]
  );

  if (emFalta.length > 0) {
    console.error(
      `Variáveis de ligação à BD em falta no .env: ${emFalta.join(", ")}`
    );
    process.exit(1);
  }

  const conexao = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    await garantirTabelaControlo(conexao);

    const ficheiros = await obterFicheirosMigracoes();
    const aplicadas = await obterMigracoesAplicadas(conexao);

    const pendentes = ficheiros.filter(
      (nome) =>
        nome !== "000_create_schema_migrations.sql" &&
        !aplicadas.has(nome)
    );

    if (pendentes.length === 0) {
      console.log("Nenhuma migração pendente.");
      return;
    }

    for (const nomeFicheiro of pendentes) {
      await aplicarMigracao(conexao, nomeFicheiro);
    }

    console.log(`${pendentes.length} migração(ões) aplicada(s) com sucesso.`);
  } finally {
    await conexao.end();
  }
}

main().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
