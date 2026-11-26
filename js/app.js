import { ESFERAS, DIVISAO_DA_BASE } from "./config.js";
import { calcularResumo, dizimoPorEntrada } from "./calculos.js";
import { carregar, salvar, exportarJson, importarJson } from "./armazenamento.js";
import {
  formatarMoeda,
  formatarPercentual,
  formatarData,
  reaisParaCentavos,
  mesDe,
  hojeIso,
} from "./formato.js";

const NOMES = {
  dizimo: "Dízimo",
  lazer: "Lazer",
  despesas: "Despesas",
  indep: "Independência financeira",
  reserva: "Reserva de emergência",
  curso: "Curso/Livro",
};
const CONTAS = { lazer: "Nubank, caixinha", indep: "Inter", reserva: "Nubank" };
const TEXTOS_FAIXA = {
  "sem-entrada": "Sem entradas neste mês",
  "faixa-saudavel": "Dentro da faixa saudável (até 1/3 da base)",
  "dentro-do-orcamento": "Dentro do orçamento de 55%",
  "acima-do-orcamento": "Acima do orçamento de 55%",
};

const estado = carregar();
const mesAtual = hojeIso().slice(0, 7);
let mesSelecionado = mesAtual;

const $ = (id) => document.getElementById(id);

// Cria um elemento HTML. Textos entram como texto, nunca como HTML.
function el(tag, atributos = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [chave, valor] of Object.entries(atributos)) {
    no.setAttribute(chave, valor);
  }
  no.append(...filhos);
  return no;
}

function mostrarAviso(texto) {
  $("aviso").textContent = texto;
  $("aviso").hidden = !texto;
}

// Salva os dados e redesenha a tela. Chamada depois de toda mudança.
function persistir() {
  const salvou = salvar(estado);
  mostrarAviso(salvou ? "" : "Não foi possível salvar neste navegador. Baixe um backup.");
  render();
}

function render() {
  const resumo = calcularResumo(estado, mesSelecionado, mesAtual);
  renderIndicador(resumo);
  renderEsferas(resumo);
  renderHistorico();
}

function marca(lado, posicao, rotulo) {
  return el("div", { class: `marca ${lado}`, style: `left:${posicao}%` }, el("span", {}, rotulo));
}

function renderIndicador({ mes }) {
  const percentual = mes.base > 0 ? (mes.despesasUsadas / mes.base) * 100 : 0;

  let bonus = "";
  if (mes.faixa === "faixa-saudavel") {
    const valor = formatarMoeda(mes.bonusProjetado);
    bonus =
      mesSelecionado < mesAtual
        ? `Mês fechado: ${valor} foram para a reserva.`
        : `Se o mês fechar assim, ${valor} vão para a reserva.`;
  }

  const barra = el(
    "div",
    { class: "barra" },
    el("div", { class: `preenchimento ${mes.faixa}`, style: `width:${Math.min(percentual, 100)}%` }),
    marca("a", 100 / 3, "faixa 1/3"),
    marca("b", 55, "limite 55%"),
  );

  $("indicador").className = mes.faixa === "faixa-saudavel" ? "recompensa" : "";
  $("indicador").replaceChildren(
    el("h2", {}, "Despesas na faixa saudável"),
    el("div", { class: "numero-grande" }, formatarPercentual(percentual)),
    el(
      "p",
      { class: "suave" },
      `${formatarMoeda(mes.despesasUsadas)} de ${formatarMoeda(mes.base)} (base do mês, após o dízimo)`,
    ),
    barra,
    el("p", { class: `status ${mes.faixa}` }, TEXTOS_FAIXA[mes.faixa]),
    el("p", {}, bonus),
  );
}

function numero(rotulo, centavos, negativo = false) {
  return el("div", {}, rotulo, el("b", { class: negativo ? "negativo" : "" }, formatarMoeda(centavos)));
}

function renderEsferas({ esferas }) {
  const metas = {
    reserva: estado.config.metaReserva,
    indep: estado.config.metaRendaPassiva,
  };

  const cartoes = ESFERAS.map((esfera) => {
    const dados = esferas[esfera];
    const etiqueta = [
      CONTAS[esfera],
      esfera === "dizimo"
        ? `${estado.config.dizimoPercentual}% de cada entrada`
        : `${DIVISAO_DA_BASE[esfera]}% da base`,
    ]
      .filter(Boolean)
      .join(" · ");

    const cartao = el(
      "div",
      { class: "esfera" },
      el("h3", {}, el("span", {}, NOMES[esfera]), el("span", { class: "etiqueta" }, etiqueta)),
      el(
        "div",
        { class: "numeros" },
        numero("Recebido no mês", dados.recebidoNoMes),
        numero("Usado no mês", dados.usadoNoMes),
        numero("Saldo acumulado", dados.saldo, dados.saldo < 0),
      ),
    );

    const meta = metas[esfera];
    if (meta > 0) {
      const progresso = Math.max(0, Math.min(100, (dados.saldo / meta) * 100));
      cartao.append(
        el("div", { class: "progresso" }, el("i", { style: `width:${progresso}%` })),
        el(
          "p",
          { class: "suave" },
          `${formatarPercentual(progresso)} da meta de ${formatarMoeda(meta)}. ` +
            `Faltam ${formatarMoeda(Math.max(0, meta - dados.saldo))}.`,
        ),
      );
    }
    return cartao;
  });

  $("esferas").replaceChildren(...cartoes);
}

function renderHistorico() {
  const dizimos = dizimoPorEntrada(estado.entradas, estado.config.dizimoPercentual);
  const itens = [
    ...estado.entradas.filter((r) => mesDe(r.data) === mesSelecionado).map((registro) => ({ tipo: "entrada", registro })),
    ...estado.usos.filter((r) => mesDe(r.data) === mesSelecionado).map((registro) => ({ tipo: "uso", registro })),
  ].sort((a, b) => b.registro.data.localeCompare(a.registro.data) || b.registro.id - a.registro.id);

  if (itens.length === 0) {
    $("historico").replaceChildren(
      el("p", { class: "suave" }, "Nenhum registro neste mês. Comece registrando uma entrada."),
    );
    return;
  }

  $("historico").replaceChildren(
    ...itens.map(({ tipo, registro }) => {
      const eEntrada = tipo === "entrada";
      const titulo = `${eEntrada ? "+" : "−"} ${formatarMoeda(registro.valor)}`;
      const detalhe = eEntrada
        ? `${formatarData(registro.data)} · dízimo ${formatarMoeda(dizimos[registro.id].dizimo)} · ` +
          `dízimo acumulado ${formatarMoeda(dizimos[registro.id].acumulado)}`
        : `${formatarData(registro.data)} · ${NOMES[registro.esfera]}`;

      const botao = el("button", { type: "button", class: "apagar", "aria-label": "Apagar registro" }, "Apagar");
      botao.addEventListener("click", () => apagar(tipo, registro.id));

      return el(
        "div",
        { class: "linha" },
        el(
          "span",
          {},
          el("b", { class: eEntrada ? "positivo" : "" }, titulo),
          ` ${registro.descricao || (eEntrada ? "Entrada" : "Uso")}`,
          el("br"),
          el("span", { class: "suave" }, detalhe),
        ),
        botao,
      );
    }),
  );
}

function apagar(tipo, id) {
  const lista = tipo === "entrada" ? "entradas" : "usos";
  estado[lista] = estado[lista].filter((registro) => registro.id !== id);
  persistir();
}

// ---------- Formulários ----------

function lerCampos(prefixo) {
  return {
    valor: reaisParaCentavos($(`${prefixo}-valor`).value),
    data: $(`${prefixo}-data`).value,
    descricao: $(`${prefixo}-descricao`).value.trim(),
  };
}

$("form-entrada").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const { valor, data, descricao } = lerCampos("entrada");
  if (!(valor > 0) || !data) return;
  estado.entradas.push({ id: Date.now(), data, valor, descricao });
  $("entrada-valor").value = "";
  $("entrada-descricao").value = "";
  persistir();
});

$("form-uso").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const { valor, data, descricao } = lerCampos("uso");
  if (!(valor > 0) || !data) return;
  estado.usos.push({ id: Date.now(), data, valor, esfera: $("uso-esfera").value, descricao });
  $("uso-valor").value = "";
  $("uso-descricao").value = "";
  persistir();
});

$("mes").addEventListener("change", () => {
  if (!$("mes").value) return;
  mesSelecionado = $("mes").value;
  render();
});

// ---------- Ajustes e backup ----------

function ligarAjuste(id, aplicar) {
  $(id).addEventListener("change", () => {
    const valor = Number($(id).value);
    if (!Number.isFinite(valor) || valor < 0) return;
    aplicar(valor);
    persistir();
  });
}

ligarAjuste("ajuste-dizimo", (v) => { estado.config.dizimoPercentual = Math.min(v, 100); });
ligarAjuste("ajuste-meta-reserva", (v) => { estado.config.metaReserva = reaisParaCentavos(v); });
ligarAjuste("ajuste-meta-renda", (v) => { estado.config.metaRendaPassiva = reaisParaCentavos(v); });

$("botao-exportar").addEventListener("click", () => {
  const arquivo = new Blob([exportarJson(estado)], { type: "application/json" });
  const link = el("a", { href: URL.createObjectURL(arquivo), download: `backup-financeiro-${hojeIso()}.json` });
  link.click();
  URL.revokeObjectURL(link.href);
});

$("arquivo-backup").addEventListener("change", async (evento) => {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;
  try {
    const novo = importarJson(await arquivo.text());
    if (!confirm("Isso substitui todos os dados atuais pelos do backup. Continuar?")) return;
    Object.assign(estado, novo);
    persistir();
    iniciarAjustes();
  } catch (erro) {
    mostrarAviso(erro.message);
  } finally {
    evento.target.value = "";
  }
});

// ---------- Início ----------

function iniciarAjustes() {
  $("ajuste-dizimo").value = estado.config.dizimoPercentual;
  $("ajuste-meta-reserva").value = estado.config.metaReserva / 100;
  $("ajuste-meta-renda").value = estado.config.metaRendaPassiva / 100;
}

$("mes").value = mesAtual;
$("entrada-data").value = hojeIso();
$("uso-data").value = hojeIso();
$("uso-esfera").replaceChildren(...ESFERAS.map((esfera) => el("option", { value: esfera }, NOMES[esfera])));
iniciarAjustes();
render();