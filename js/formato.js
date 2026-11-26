// Tudo que é mostrado na tela passa por aqui. Internamente o app só usa centavos.

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// 105000 -> "R$ 1.050,00"
export function formatarMoeda(centavos) {
  return formatadorMoeda.format(centavos / 100);
}

// 33.333 -> "33,3%"
export function formatarPercentual(valor) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

// Campo de valor da tela (em reais, ex.: 10.5) -> centavos inteiros (1050).
export function reaisParaCentavos(reais) {
  return Math.round(Number(reais) * 100);
}

// "2026-11-10" -> "10/11/2026"
export function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// "2026-11-10" -> "2026-11" (a chave do mês)
export function mesDe(dataIso) {
  return dataIso.slice(0, 7);
}

// Data de hoje no formato "2026-11-10", no fuso do seu aparelho.
export function hojeIso() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}