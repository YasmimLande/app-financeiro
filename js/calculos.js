import { DIVISAO_DA_BASE, ESFERAS, LIMITE_ORCAMENTO_DESPESAS } from "./config.js";
import { mesDe } from "./formato.js";
import { pagamentosComoUsos, resumirDividas } from "./dividas.js";

// Divide uma entrada: separa o dízimo e distribui a base pelas esferas.
// A esfera "despesas" recebe o que sobra, para a soma fechar sempre exata.
export function dividirEntrada(valor, dizimoPercentual) {
  const dizimo = Math.round((valor * dizimoPercentual) / 100);
  const base = valor - dizimo;

  const partes = {};
  let distribuido = 0;
  for (const [esfera, percentual] of Object.entries(DIVISAO_DA_BASE)) {
    if (esfera === "despesas") continue;
    partes[esfera] = Math.round((base * percentual) / 100);
    distribuido += partes[esfera];
  }
  partes.despesas = base - distribuido;

  return { dizimo, base, ...partes };
}

// Bônus do mês: se as despesas ficaram em até 1/3 da base, a sobra do
// orçamento de despesas vai para a reserva. Caso contrário, não há bônus.
export function calcularBonusDoMes({ base, despesasAlocadas, despesasUsadas }) {
  if (base <= 0) return 0;
  if (despesasUsadas * 3 > base) return 0;
  return Math.max(0, despesasAlocadas - despesasUsadas);
}

// Em qual faixa estão as despesas do mês.
export function classificarDespesas(base, despesasUsadas) {
  if (base <= 0) return "sem-entrada";
  if (despesasUsadas * 3 <= base) return "faixa-saudavel";
  if (despesasUsadas * 100 <= base * LIMITE_ORCAMENTO_DESPESAS) {
    return "dentro-do-orcamento";
  }
  return "acima-do-orcamento";
}function zerarEsferas() {
  return Object.fromEntries(ESFERAS.map((esfera) => [esfera, 0]));
}

// Dízimo de cada entrada e o dízimo acumulado até ela (em ordem de data).
export function dizimoPorEntrada(entradas, dizimoPercentual) {
  const ordenadas = [...entradas].sort(
    (a, b) => a.data.localeCompare(b.data) || a.id - b.id,
  );
  let acumulado = 0;
  const resultado = {};
  for (const entrada of ordenadas) {
    const dizimo = dividirEntrada(entrada.valor, dizimoPercentual).dizimo;
    acumulado += dizimo;
    resultado[entrada.id] = { dizimo, acumulado };
  }
  return resultado;
}

// Tudo que a tela precisa para o mês selecionado.
// mesSelecionado e mesAtual no formato "2026-11".
export function calcularResumo(estado, mesSelecionado, mesAtual) {
  const { entradas, config } = estado;
  const usos = [...estado.usos, ...pagamentosComoUsos(estado.pagamentos)];
  const meses = {}; // por mês: base, despesasAlocadas, despesasUsadas
  const doMes = (mes) =>
    (meses[mes] ??= { base: 0, despesasAlocadas: 0, despesasUsadas: 0 });

  const recebidoNoMes = zerarEsferas();
  const usadoNoMes = zerarEsferas();
  const recebidoTotal = zerarEsferas();
  const usadoTotal = zerarEsferas();

  for (const entrada of entradas) {
    const mes = mesDe(entrada.data);
    if (mes > mesSelecionado) continue;
    const partes = dividirEntrada(entrada.valor, config.dizimoPercentual);
    doMes(mes).base += partes.base;
    doMes(mes).despesasAlocadas += partes.despesas;
    for (const esfera of ESFERAS) {
      recebidoTotal[esfera] += partes[esfera];
      if (mes === mesSelecionado) recebidoNoMes[esfera] += partes[esfera];
    }
  }

  for (const uso of usos) {
    const mes = mesDe(uso.data);
    if (mes > mesSelecionado) continue;
    usadoTotal[uso.esfera] += uso.valor;
    if (mes === mesSelecionado) usadoNoMes[uso.esfera] += uso.valor;
    if (uso.esfera === "despesas") doMes(mes).despesasUsadas += uso.valor;
  }

  // Bônus só dos meses já fechados.
  let bonusAcumulado = 0;
  for (const [mes, dados] of Object.entries(meses)) {
    if (mes < mesAtual) bonusAcumulado += calcularBonusDoMes(dados);
  }

  const esferas = {};
  for (const esfera of ESFERAS) {
    esferas[esfera] = {
      recebidoNoMes: recebidoNoMes[esfera],
      usadoNoMes: usadoNoMes[esfera],
      saldo:
        (config.saldosIniciais?.[esfera] ?? 0) + recebidoTotal[esfera] - usadoTotal[esfera],
    };
  }
  esferas.despesas.saldo -= bonusAcumulado;
  esferas.reserva.saldo += bonusAcumulado;

  const doMesSelecionado = meses[mesSelecionado] ?? {
    base: 0,
    despesasAlocadas: 0,
    despesasUsadas: 0,
  };

  return {
    esferas,
    dizimoAcumulado: recebidoTotal.dizimo,
    bonusAcumulado,
    dividas: resumirDividas(estado, mesSelecionado),
    mes: {
      base: doMesSelecionado.base,
      despesasUsadas: doMesSelecionado.despesasUsadas,
      faixa: classificarDespesas(
        doMesSelecionado.base,
        doMesSelecionado.despesasUsadas,
      ),
      bonusProjetado: calcularBonusDoMes(doMesSelecionado),
    },
  };
}