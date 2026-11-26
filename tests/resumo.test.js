import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularResumo, dizimoPorEntrada } from "../js/calculos.js";

const config = { dizimoPercentual: 10 };

test("mês fechado na faixa saudável: a sobra vai para a reserva", () => {
  const estado = {
    config,
    entradas: [{ id: 1, data: "2026-10-05", valor: 100_000 }],
    usos: [
      { id: 2, data: "2026-10-20", valor: 27_000, esfera: "despesas" },
      { id: 3, data: "2026-10-21", valor: 3_000, esfera: "lazer" },
      { id: 4, data: "2026-10-22", valor: 10_000, esfera: "dizimo" },
    ],
  };
  const r = calcularResumo(estado, "2026-10", "2026-11");
  assert.equal(r.bonusAcumulado, 22_500);
  assert.equal(r.esferas.despesas.saldo, 0);
  assert.equal(r.esferas.reserva.saldo, 18_000 + 22_500);
  assert.equal(r.esferas.lazer.saldo, 6_000);
  assert.equal(r.esferas.dizimo.saldo, 0);
  assert.equal(r.dizimoAcumulado, 10_000);
  assert.equal(r.mes.faixa, "faixa-saudavel");
});

test("mês em andamento: bônus aparece só como projeção", () => {
  const estado = {
    config,
    entradas: [{ id: 1, data: "2026-10-05", valor: 100_000 }],
    usos: [{ id: 2, data: "2026-10-20", valor: 27_000, esfera: "despesas" }],
  };
  const r = calcularResumo(estado, "2026-10", "2026-10");
  assert.equal(r.bonusAcumulado, 0);
  assert.equal(r.mes.bonusProjetado, 22_500);
  assert.equal(r.esferas.despesas.saldo, 22_500);
  assert.equal(r.esferas.reserva.saldo, 18_000);
});

test("saldos acumulam de um mês para o outro", () => {
  const estado = {
    config,
    entradas: [
      { id: 1, data: "2026-10-05", valor: 100_000 },
      { id: 2, data: "2026-11-05", valor: 100_000 },
    ],
    usos: [{ id: 3, data: "2026-10-20", valor: 50_000, esfera: "despesas" }],
  };
  const r = calcularResumo(estado, "2026-11", "2026-11");
  assert.equal(r.esferas.despesas.recebidoNoMes, 49_500);
  assert.equal(r.esferas.despesas.saldo, 49_500 * 2 - 50_000);
  assert.equal(r.dizimoAcumulado, 20_000);
});

test("registros de meses futuros são ignorados", () => {
  const estado = {
    config,
    entradas: [{ id: 1, data: "2026-11-05", valor: 100_000 }],
    usos: [],
  };
  const r = calcularResumo(estado, "2026-10", "2026-11");
  assert.equal(r.dizimoAcumulado, 0);
  assert.equal(r.mes.faixa, "sem-entrada");
});

test("dízimo acumulado por entrada, em ordem de data", () => {
  const entradas = [
    { id: 2, data: "2026-10-10", valor: 50_000 },
    { id: 1, data: "2026-10-05", valor: 100_000 },
  ];
  assert.deepEqual(dizimoPorEntrada(entradas, 10), {
    1: { dizimo: 10_000, acumulado: 10_000 },
    2: { dizimo: 5_000, acumulado: 15_000 },
  });
});