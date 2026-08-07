export function comprimirImagemArquivo(
  ficheiro: File,
  maxLargura = 1000,
  qualidade = 0.75,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onerror = () => {
      reject(new Error("Não foi possível ler o ficheiro."));
    };

    leitor.onload = () => {
      const imagem = new Image();

      imagem.onerror = () => {
        reject(new Error("Ficheiro de imagem inválido."));
      };

      imagem.onload = () => {
        let largura = imagem.width;
        let altura = imagem.height;

        if (largura > maxLargura) {
          altura = Math.round((altura * maxLargura) / largura);
          largura = maxLargura;
        }

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;

        const contexto = canvas.getContext("2d");

        if (!contexto) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }

        contexto.drawImage(imagem, 0, 0, largura, altura);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };

      imagem.src = String(leitor.result);
    };

    leitor.readAsDataURL(ficheiro);
  });
}

export function criarDataUrlImagem(
  base64?: string,
  tipo?: string,
): string {
  const valor = String(base64 || "").trim();

  if (!valor) {
    return "";
  }

  if (valor.startsWith("data:image/")) {
    return valor;
  }

  return `data:${tipo || "image/jpeg"};base64,${valor}`;
}