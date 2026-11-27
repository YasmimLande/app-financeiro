import { mesDe } from "./formato.js";

const LIMITE_DE_MESES = 360;

// Pagamentos que saíram do dinheiro de uma esfera contam como "uso" dessa esfera.
export function pagamentosComoUsos(pagamentos = []) {
  return pagamentos
    .filter((p) => p.origem)
    .map((p) => ({
      id: p.id,
      data: p.data,
      valor: p.valor,
      esfera: p.origem,
      descricao: "Pagamento de dívida",
    }));
}

export function resumirDividas({ dividas = [], pagamentos = [] }, mesSelecionado) {
  const ate = pagamentos.filter((p) => mesDe(p.data) <= mesSelecionado);
  const soma = (lista) => lista.reduce((total, p) => total + p.valor, 0);
  return {
    saldoTotal: dividas.reduce((total, d) => total + d.saldo, 0),
    pagoNoMes: soma(ate.filter((p) => mesDe(p.data) === mesSelecionado)),
    pagoTotal: soma(ate),
  };
}

// Quem recebe o dinheiro extra primeiro.
function porPrioridade(dividas, estrategia) {
  const porSaldo = (a, b) => a.restante - b.restante;
  const porJuros = (a, b) => b.jurosMensal - a.jurosMensal;
  const criterio =
    estrategia === "bola-de-neve"
      ? (a, b) => porSaldo(a, b) || porJuros(a, b)
      : (a, b) => porJuros(a, b) || porSaldo(a, b);
  return dividas.filter((d) => d.restante > 0).sort(criterio);
}

// Gasta "valor" nas dívidas, na ordem de prioridade. Devolve quanto foi usado.
function distribuir(dividas, estrategia, valor, pagos) {
  let sobra = valor;
  for (const divida of porPrioridade(dividas, estrategia)) {
    if (sobra <= 0) break;
    const pago = Math.min(sobra, divida.restante);
    divida.restante -= pago;
    pagos[divida.id] = (pagos[divida.id] ?? 0) + pago;
    sobra -= pago;
  }
  return valor - sobra;
}

const somaRestante = (dividas) => dividas.reduce((total, d) => total + d.restante, 0);

// Simula a quitação mês a mês. Valores em centavos, juros em % ao mês.
// Cada mês: entram os juros, pagam-se as parcelas mínimas e o resto do
// orçamento vai para a dívida prioritária. O aporte único é aplicado no mês 0.
export function planejarQuitacao({ dividas, estrategia, orcamentoMensal, aporteUnico = 0 }) {
  const ativas = dividas
    .filter((d) => d.saldo > 0)
    .map((d) => ({ ...d, restante: d.saldo }));
  const saldoInicial = somaRestante(ativas);
  const plano = {
    viavel: true,
    quita: false,
    semOrcamento: false,
    crescendo: false,
    minimoNecessario: 0,
    saldoInicial,
    meses: [],
    mesesParaQuitar: 0,
    totalJuros: 0,
    totalPago: 0,
    ordemDeQuitacao: [],
  };
  if (ativas.length === 0) return { ...plano, quita: true };

  const abertas = () => ativas.filter((d) => d.restante > 0);
  const registrarQuitadas = (mes) => {
    for (const d of ativas) {
      if (d.restante === 0 && d.quitadaEm === undefined) {
        d.quitadaEm = mes;
        plano.ordemDeQuitacao.push({ id: d.id, nome: d.nome, mes });
      }
    }
  };

  if (aporteUnico > 0) {
    const pagos = {};
    const usado = distribuir(ativas, estrategia, aporteUnico, pagos);
    plano.totalPago += usado;
    plano.meses.push({ mes: 0, juros: 0, pago: usado, pagos, saldo: somaRestante(ativas) });
    registrarQuitadas(0);
  }

  const somaMinimos = abertas().reduce((total, d) => total + d.parcelaMinima, 0);
  if (somaMinimos > orcamentoMensal) {
    return { ...plano, viavel: false, minimoNecessario: somaMinimos };
  }
  if (abertas().length > 0 && orcamentoMensal <= 0) {
    return { ...plano, semOrcamento: true };
  }

  for (let mes = 1; mes <= LIMITE_DE_MESES && abertas().length > 0; mes++) {
    let juros = 0;
    for (const d of abertas()) {
      const j = Math.round((d.restante * d.jurosMensal) / 100);
      d.restante += j;
      juros += j;
    }

    const pagos = {};
    let usado = 0;
    for (const d of abertas()) {
      const minimo = Math.min(d.parcelaMinima, d.restante);
      if (minimo > 0) {
        d.restante -= minimo;
        pagos[d.id] = minimo;
        usado += minimo;
      }
    }
    usado += distribuir(ativas, estrategia, orcamentoMensal - usado, pagos);

    plano.meses.push({ mes, juros, pago: usado, pagos, saldo: somaRestante(ativas) });
    plano.totalJuros += juros;
    plano.totalPago += usado;
    registrarQuitadas(mes);

    // Se a dívida só cresce, não adianta continuar simulando.
    if (somaRestante(ativas) > saldoInicial * 10) {
      plano.crescendo = true;
      break;
    }
  }

  plano.quita = abertas().length === 0;
  plano.mesesParaQuitar = plano.meses.length > 0 ? plano.meses[plano.meses.length - 1].mes : 0;
  return plano;
}
