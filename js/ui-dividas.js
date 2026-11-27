import { $, el } from "./dom.js";
import { TIPOS_DIVIDA, ESTRATEGIAS } from "./config.js";
import { planejarQuitacao } from "./dividas.js";
import {
  formatarMoeda,
  formatarPercentual,
  formatarData,
  formatarMes,
  somarMeses,
  reaisParaCentavos,
  mesDe,
  hojeIso,
} from "./formato.js";

export function criarTelaDividas({ estado, mesAtual, persistir, mostrarAviso, nomesEsferas }) {
  const opcoes = (objeto) =>
    Object.entries(objeto).map(([valor, nome]) => el("option", { value: valor }, nome));
  const linha = (esquerda, direita) =>
    el("div", { class: "linha" }, el("span", {}, esquerda), el("b", {}, direita));
  const rotuloDoMes = (n) => (n === 0 ? "Agora" : formatarMes(somarMeses(mesAtual, n)));

  // ---------- Aba Dívidas ----------

  function cartaoDivida(d) {
    const progresso =
      d.valorInicial > 0 ? Math.max(0, Math.min(100, (1 - d.saldo / d.valorInicial) * 100)) : 0;

    const campo = el("input", {
      id: `saldo-${d.id}`,
      type: "number",
      inputmode: "decimal",
      step: "0.01",
      min: "0",
      value: String(d.saldo / 100),
    });
    campo.addEventListener("change", () => {
      const valor = Number(campo.value);
      if (!Number.isFinite(valor) || valor < 0) return;
      d.saldo = reaisParaCentavos(valor);
      persistir();
    });

    const remover = el("button", { type: "button", class: "apagar" }, "Remover");
    remover.addEventListener("click", () => {
      if (!confirm(`Remover "${d.nome}"? Os pagamentos já registrados continuam no histórico.`)) return;
      estado.dividas = estado.dividas.filter((x) => x.id !== d.id);
      persistir();
    });

    const detalhes = [
      TIPOS_DIVIDA[d.tipo] ?? "Dívida",
      `${d.jurosMensal.toLocaleString("pt-BR")}% ao mês`,
    ];
    if (d.parcelaMinima > 0) detalhes.push(`parcela mínima ${formatarMoeda(d.parcelaMinima)}`);

    return el(
      "div",
      { class: "esfera" },
      el(
        "h3",
        {},
        el("span", {}, d.nome + (d.saldo === 0 ? " ✓" : "")),
        el("span", { class: "etiqueta" }, detalhes.join(" · ")),
      ),
      el("label", { for: campo.id }, "Saldo atual (R$), atualize conforme o banco"),
      campo,
      el("div", { class: "progresso" }, el("i", { style: `width:${progresso}%` })),
      el("p", { class: "suave" }, `${formatarPercentual(progresso)} quitado`),
      remover,
    );
  }

  function renderDividas() {
    const total = estado.dividas.reduce((soma, d) => soma + d.saldo, 0);
    const pagoNoMes = estado.pagamentos
      .filter((p) => mesDe(p.data) === mesAtual)
      .reduce((soma, p) => soma + p.valor, 0);

    $("dividas-resumo").replaceChildren(
      linha("Saldo devedor total", formatarMoeda(total)),
      linha("Pago neste mês", formatarMoeda(pagoNoMes)),
    );
    $("dividas-lista").replaceChildren(
      ...(estado.dividas.length > 0
        ? estado.dividas.map(cartaoDivida)
        : [el("p", { class: "suave" }, "Nenhuma dívida cadastrada.")]),
    );
  }

  function renderSelecaoDivida() {
    const atual = $("pag-divida").value;
    const abertas = estado.dividas.filter((d) => d.saldo > 0);
    $("pag-divida").replaceChildren(
      ...abertas.map((d) => el("option", { value: String(d.id) }, d.nome)),
    );
    if (abertas.some((d) => String(d.id) === atual)) $("pag-divida").value = atual;
  }

  function renderPagamentos() {
    const lista = [...estado.pagamentos].sort(
      (a, b) => b.data.localeCompare(a.data) || b.id - a.id,
    );
    if (lista.length === 0) {
      $("pagamentos-lista").replaceChildren(el("p", { class: "suave" }, "Nenhum pagamento registrado."));
      return;
    }
    $("pagamentos-lista").replaceChildren(
      ...lista.map((p) => {
        const divida = estado.dividas.find((d) => d.id === p.dividaId);
        const origem = p.origem ? `saiu de ${nomesEsferas[p.origem]}` : "fora das esferas";
        const apagar = el("button", { type: "button", class: "apagar", "aria-label": "Apagar pagamento" }, "Apagar");
        apagar.addEventListener("click", () => {
          if (divida) divida.saldo += p.valor; // devolve o valor ao saldo da dívida
          estado.pagamentos = estado.pagamentos.filter((x) => x.id !== p.id);
          persistir();
        });
        return el(
          "div",
          { class: "linha" },
          el(
            "span",
            {},
            el("b", {}, formatarMoeda(p.valor)),
            ` ${divida ? divida.nome : "Dívida removida"}`,
            el("br"),
            el("span", { class: "suave" }, `${formatarData(p.data)} · ${origem}`),
          ),
          apagar,
        );
      }),
    );
  }

  // ---------- Aba Planejamento ----------

  function renderPlano() {
    const { estrategia, orcamentoMensal, aporteUnico } = estado.config.planejamento;
    const saida = $("plano-resultado");

    if (!estado.dividas.some((d) => d.saldo > 0)) {
      saida.replaceChildren(
        el("p", { class: "suave" }, "Nenhuma dívida em aberto. Cadastre uma na aba Dívidas para ver o plano."),
      );
      return;
    }

    const base = { dividas: estado.dividas, orcamentoMensal, aporteUnico };
    const plano = planejarQuitacao({ ...base, estrategia });
    const avisar = (texto) =>
      saida.replaceChildren(el("p", { class: "status acima-do-orcamento" }, texto));

    if (!plano.viavel) {
      return avisar(`O valor mensal é menor que a soma das parcelas mínimas (${formatarMoeda(plano.minimoNecessario)}).`);
    }
    if (plano.semOrcamento) {
      return avisar("Informe quanto você pode destinar por mês às dívidas.");
    }
    if (!plano.quita) {
      return avisar("Com esse valor, os juros crescem mais do que os pagamentos. Aumente o valor mensal ou o aporte único.");
    }

    const outraChave = estrategia === "avalanche" ? "bola-de-neve" : "avalanche";
    const outra = planejarQuitacao({ ...base, estrategia: outraChave });
    const meses = plano.mesesParaQuitar;
    const titulo =
      meses === 0 ? "Quitação imediata com o aporte" : `Quitação em ${meses} ${meses === 1 ? "mês" : "meses"}`;

    saida.replaceChildren(
      el("h2", {}, "Resultado"),
      el("div", { class: "numero-grande" }, titulo),
      el(
        "p",
        { class: "suave" },
        `Previsão: ${rotuloDoMes(meses)}. O aporte único é aplicado agora e os pagamentos mensais começam no mês seguinte.`,
      ),
      linha("Total pago", formatarMoeda(plano.totalPago)),
      linha("Total de juros", formatarMoeda(plano.totalJuros)),
      el("h3", {}, "Ordem de quitação"),
      ...plano.ordemDeQuitacao.map((item, i) => linha(`${i + 1}. ${item.nome}`, rotuloDoMes(item.mes))),
      el("h3", {}, "Comparação das estratégias"),
      linha(ESTRATEGIAS[estrategia], `${formatarMoeda(plano.totalJuros)} de juros`),
      linha(ESTRATEGIAS[outraChave], outra.quita ? `${formatarMoeda(outra.totalJuros)} de juros` : "não quita"),
      el("h3", {}, "Primeiros meses"),
      ...plano.meses
        .slice(0, 12)
        .map((m) =>
          linha(
            `${rotuloDoMes(m.mes)} · pago ${formatarMoeda(m.pago)} · juros ${formatarMoeda(m.juros)}`,
            `resta ${formatarMoeda(m.saldo)}`,
          ),
        ),
    );
  }

  // ---------- Formulários ----------

  $("form-divida").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const nome = $("divida-nome").value.trim();
    const saldo = reaisParaCentavos($("divida-saldo").value);
    const juros = Number($("divida-juros").value);
    const parcela = reaisParaCentavos($("divida-parcela").value || 0);
    if (!nome || !(saldo > 0) || !Number.isFinite(juros) || juros < 0) return;
    estado.dividas.push({
      id: Date.now(),
      nome,
      tipo: $("divida-tipo").value,
      saldo,
      valorInicial: saldo,
      jurosMensal: juros,
      parcelaMinima: Math.max(0, parcela),
    });
    $("form-divida").reset();
    persistir();
  });

  $("form-pagamento").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const divida = estado.dividas.find((d) => String(d.id) === $("pag-divida").value);
    const valor = reaisParaCentavos($("pag-valor").value);
    const data = $("pag-data").value;
    if (!divida) return mostrarAviso("Cadastre uma dívida em aberto antes de registrar pagamentos.");
    if (!(valor > 0) || !data) return;

    const efetivo = Math.min(valor, divida.saldo); // não dá para pagar mais do que se deve
    divida.saldo -= efetivo;
    estado.pagamentos.push({
      id: Date.now(),
      dividaId: divida.id,
      data,
      valor: efetivo,
      origem: $("pag-origem").value,
    });
    $("pag-valor").value = "";
    persistir();
    if (efetivo < valor) {
      mostrarAviso(`O valor foi limitado ao saldo da dívida (${formatarMoeda(efetivo)}).`);
    }
  });

  function ligarPlanejamento(id, aplicar) {
    $(id).addEventListener("change", () => {
      aplicar($(id).value);
      persistir();
    });
  }
  const emCentavos = (texto) => reaisParaCentavos(Math.max(0, Number(texto) || 0));
  ligarPlanejamento("plan-estrategia", (v) => { estado.config.planejamento.estrategia = v; });
  ligarPlanejamento("plan-orcamento", (v) => { estado.config.planejamento.orcamentoMensal = emCentavos(v); });
  ligarPlanejamento("plan-aporte", (v) => { estado.config.planejamento.aporteUnico = emCentavos(v); });

  // ---------- Início ----------

  $("divida-tipo").replaceChildren(...opcoes(TIPOS_DIVIDA));
  $("plan-estrategia").replaceChildren(...opcoes(ESTRATEGIAS));
  $("pag-origem").replaceChildren(
    el("option", { value: "" }, "Fora das minhas esferas (não desconta de nenhuma)"),
    ...opcoes(nomesEsferas),
  );
  $("pag-data").value = hojeIso();

  return {
    render() {
      renderSelecaoDivida();
      renderDividas();
      renderPagamentos();
      renderPlano();
    },
    // Preenche os campos do planejamento (também usada depois de restaurar um backup).
    carregarCampos() {
      const { estrategia, orcamentoMensal, aporteUnico } = estado.config.planejamento;
      $("plan-estrategia").value = estrategia;
      $("plan-orcamento").value = orcamentoMensal / 100;
      $("plan-aporte").value = aporteUnico / 100;
    },
  };
}