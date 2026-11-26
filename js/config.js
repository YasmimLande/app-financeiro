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