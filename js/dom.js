export const $ = (id) => document.getElementById(id);

// Cria um elemento HTML. Textos entram como texto, nunca como HTML.
export function el(tag, atributos = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [chave, valor] of Object.entries(atributos)) {
    no.setAttribute(chave, valor);
  }
  no.append(...filhos);
  return no;
}