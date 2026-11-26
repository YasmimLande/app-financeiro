import { test } from "node:test";
import assert from "node:assert/strict";
import { DIVISAO_DA_BASE } from "../js/config.js";
import {
  dividirEntrada,
  calcularBonusDoMes,
  classificarDespesas,
} from "../js/calculos.js";

test("os percentuais da base somam 100", () => {
  const soma = Object.values(DIVISAO_DA_BASE).reduce((a, b) => a + b, 0);
  assert.equal(soma, 100);
});

test("entrada de R$ 1.000,00 com dízimo de 10%", () => {
  assert.deepEqual(dividirEntrada(100_000, 10), {
    dizimo: 10_000,
    base: 90_000,
    reserva: 18_000,
    indep: 9_000,
    lazer: 9_000,
    curso: 4_500,
    despesas: 49_500,
  });
});

test("com centavos quebrados, a soma das partes continua exata", () => {
  const r = dividirEntrada(33_333, 10);
  const soma = r.dizimo + r.reserva + r.indep + r.lazer + r.curso + r.despesas;
  assert.equal(soma, 33_333);
});

test("bônus quando as despesas ficam em até 1/3 da base", () => {
  const bonus = calcularBonusDoMes({
    base: 90_000,
    despesasAlocadas: 49_500,
    despesasUsadas: 27_000,
  });
  assert.equal(bonus, 22_500);
});

test("sem bônus quando passa de 1/3 da base", () => {
  const bonus = calcularBonusDoMes({
    base: 90_000,
    despesasAlocadas: 49_500,
    despesasUsadas: 31_000,
  });
  assert.equal(bonus, 0);
});

test("faixas de despesas", () => {
  assert.equal(classificarDespesas(0, 0), "sem-entrada");
  assert.equal(classificarDespesas(90_000, 30_000), "faixa-saudavel");
  assert.equal(classificarDespesas(90_000, 30_001), "dentro-do-orcamento");
  assert.equal(classificarDespesas(90_000, 49_500), "dentro-do-orcamento");
  assert.equal(classificarDespesas(90_000, 49_501), "acima-do-orcamento");
});