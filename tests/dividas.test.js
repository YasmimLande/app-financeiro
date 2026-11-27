import { test } from "node:test";
import assert from "node:assert/strict";
import { planejarQuitacao, resumirDividas, pagamentosComoUsos } from "../js/dividas.js";
import { calcularResumo } from "../js/calculos.js";
import { somarMeses } from "../js/formato.js";

const divida = (id, saldo, jurosMensal, parcelaMinima = 0) => ({
  id, nome: id, saldo, jurosMensal, parcelaMinima,
});

test("uma dívida: juros somam, pagamento abate, quita no mês 2", () => {
  const p = planejarQuitacao({
    dividas: [divida("A", 100_000, 10)],
    estrategia: "avalanche",
    orcamentoMensal: 60_000,
  });
  assert.equal(p.quita, true);
  assert.equal(p.mesesParaQuitar, 2);
  assert.equal(p.totalJuros, 15_000);
  assert.equal(p.totalPago, 115_000);
});

test("avalanche gasta menos juros que bola de neve neste caso", () => {
  const dividas = [divida("A", 100_000, 10), divida("B", 20_000, 2)];
  const base = { dividas, orcamentoMensal: 50_000 };
  const avalanche = planejarQuitacao({ ...base, estrategia: "avalanche" });
  const bola = planejarQuitacao({ ...base, estrategia: "bola-de-neve" });
  assert.equal(avalanche.totalJuros, 18_824);
  assert.equal(bola.totalJuros, 22_284);
  assert.deepEqual(bola.ordemDeQuitacao.map((d) => [d.id, d.mes]), [["B", 1], ["A", 3]]);
});

test("orçamento menor que as parcelas mínimas é inviável", () => {
  const p = planejarQuitacao({
    dividas: [divida("A", 100_000, 5, 30_000), divida("B", 50_000, 5, 25_000)],
    estrategia: "avalanche",
    orcamentoMensal: 50_000,
  });
  assert.equal(p.viavel, false);
  assert.equal(p.minimoNecessario, 55_000);
});

test("aporte único que cobre tudo quita no mês 0, sem juros", () => {
  const p = planejarQuitacao({
    dividas: [divida("A", 100_000, 8)],
    estrategia: "avalanche",
    orcamentoMensal: 0,
    aporteUnico: 100_000,
  });
  assert.equal(p.quita, true);
  assert.equal(p.mesesParaQuitar, 0);
  assert.equal(p.totalJuros, 0);
  assert.equal(p.totalPago, 100_000);
});

test("pagamento menor que os juros: a dívida só cresce e não quita", () => {
  const p = planejarQuitacao({
    dividas: [divida("A", 100_000, 8)],
    estrategia: "avalanche",
    orcamentoMensal: 1_000,
  });
  assert.equal(p.quita, false);
  assert.equal(p.crescendo, true);
});

test("sem orçamento e sem aporte, o plano pede um valor mensal", () => {
  const p = planejarQuitacao({
    dividas: [divida("A", 100_000, 8)],
    estrategia: "avalanche",
    orcamentoMensal: 0,
  });
  assert.equal(p.semOrcamento, true);
});

test("resumo das dívidas: total, pago no mês e pago no total", () => {
  const estado = {
    dividas: [divida("A", 10_000, 0), divida("B", 5_000, 0)],
    pagamentos: [
      { id: 1, dividaId: "A", data: "2026-11-10", valor: 3_000 },
      { id: 2, dividaId: "A", data: "2026-10-10", valor: 2_000 },
    ],
  };
  assert.deepEqual(resumirDividas(estado, "2026-11"), {
    saldoTotal: 15_000,
    pagoNoMes: 3_000,
    pagoTotal: 5_000,
  });
});

test("só pagamentos com origem viram uso de uma esfera", () => {
  const usos = pagamentosComoUsos([
    { id: 1, data: "2026-11-10", valor: 5_000, origem: "reserva" },
    { id: 2, data: "2026-11-11", valor: 2_000, origem: "" },
  ]);
  assert.equal(usos.length, 1);
  assert.equal(usos[0].esfera, "reserva");
});

test("pagamento com origem reduz o saldo da esfera no resumo", () => {
  const estado = {
    config: { dizimoPercentual: 10 },
    entradas: [{ id: 1, data: "2026-11-05", valor: 100_000 }],
    usos: [],
    dividas: [divida("A", 20_000, 0)],
    pagamentos: [
      { id: 9, dividaId: "A", data: "2026-11-10", valor: 5_000, origem: "reserva" },
      { id: 10, dividaId: "A", data: "2026-11-11", valor: 2_000, origem: "" },
    ],
  };
  const r = calcularResumo(estado, "2026-11", "2026-11");
  assert.equal(r.esferas.reserva.saldo, 18_000 - 5_000);
  assert.equal(r.dividas.pagoNoMes, 7_000);
});

test("somarMeses atravessa a virada do ano", () => {
  assert.equal(somarMeses("2026-11", 1), "2026-12");
  assert.equal(somarMeses("2026-11", 2), "2027-01");
  assert.equal(somarMeses("2026-11", 14), "2028-01");
});