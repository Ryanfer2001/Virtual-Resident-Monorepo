const { PACOTES } = require("../config/catalogoPacotes");

/*
|--------------------------------------------------------------------------
| Listar pacotes (público, só leitura)
|--------------------------------------------------------------------------
|
| Devolve só o subconjunto necessário para o frontend exibir/escolher um
| pacote. Nunca inclui os campos internos de benefício (saldo/swipes/
| eventos/parking) usados para ativação — esses ficam só em apps/api.
|--------------------------------------------------------------------------
*/

function listarPacotes(req, res) {
  const pacotesPublicos = PACOTES.map((pacote) => ({
    id: pacote.id,
    nome: pacote.nome,
    categoria: pacote.categoria,
    precoCVE: pacote.precoCVE,
    descricao: pacote.descricao
  }));

  return res.status(200).json(pacotesPublicos);
}

module.exports = {
  listarPacotes
};
