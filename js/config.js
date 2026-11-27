// Percentuais da BASE (o que sobra depois do dízimo). A soma deve dar 100.
export const DIVISAO_DA_BASE = {
  despesas: 55,
  reserva: 20,
  indep: 10,
  lazer: 10,
  curso: 5,
};

// Valores em centavos.
export const DIZIMO_PERCENTUAL_PADRAO = 10;
export const META_RESERVA_PADRAO = 0;
export const META_RENDA_PASSIVA_PADRAO = 0;

// Faixa saudável das despesas: até 1/3 da base. Limite do orçamento: 55%.
export const LIMITE_ORCAMENTO_DESPESAS = DIVISAO_DA_BASE.despesas;
// As seis esferas do app (ids usados nos registros e nos cálculos).
export const ESFERAS = ["dizimo", "lazer", "despesas", "indep", "reserva", "curso"];
// Saldo de partida de cada esfera (centavos). Os valores reais ficam só no app.
export const SALDOS_INICIAIS_PADRAO = Object.fromEntries(ESFERAS.map((e) => [e, 0]));
export const TIPOS_DIVIDA = {
  "cheque-especial": "Cheque especial",
  cartao: "Cartão de crédito",
  emprestimo: "Empréstimo",
  financiamento: "Financiamento",
  outro: "Outro",
};

export const ESTRATEGIAS = {
  avalanche: "Avalanche (maior juros primeiro)",
  "bola-de-neve": "Bola de neve (menor saldo primeiro)",
};

export const PLANEJAMENTO_PADRAO = { estrategia: "avalanche", orcamentoMensal: 0, aporteUnico: 0 };