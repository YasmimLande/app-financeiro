import {
  DIZIMO_PERCENTUAL_PADRAO,
  META_RESERVA_PADRAO,
  META_RENDA_PASSIVA_PADRAO,
  SALDOS_INICIAIS_PADRAO,
  PLANEJAMENTO_PADRAO,
} from "./config.js";

const CHAVE = "app-financeiro:v1";

export function estadoInicial() {
  return {
    entradas: [], // { id, data, valor, descricao }
    usos: [], // { id, data, valor, esfera, descricao }
    dividas: [], // { id, nome, tipo, saldo, valorInicial, jurosMensal, parcelaMinima }
    pagamentos: [], // { id, dividaId, data, valor, origem }
    config: {
      dizimoPercentual: DIZIMO_PERCENTUAL_PADRAO,
      metaReserva: META_RESERVA_PADRAO,
      metaRendaPassiva: META_RENDA_PASSIVA_PADRAO,
      saldosIniciais: { ...SALDOS_INICIAIS_PADRAO },
      planejamento: { ...PLANEJAMENTO_PADRAO },
    },
  };
}

// Lê os dados salvos. Se não há nada (ou está corrompido), começa do zero.
export function carregar() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return estadoInicial();
    return mesclarComPadrao(JSON.parse(bruto));
  } catch {
    return estadoInicial();
  }
}

// Devolve true se salvou e false se o navegador recusou.
export function salvar(estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
    return true;
  } catch {
    return false;
  }
}

// Backup: transforma os dados em texto para baixar como arquivo.
export function exportarJson(estado) {
  return JSON.stringify(estado, null, 2);
}

// Restauração: lê o texto de um backup e confere se faz sentido antes de aceitar.
export function importarJson(texto) {
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error("O arquivo não é um backup válido.");
  }
  if (!Array.isArray(dados.entradas) || !Array.isArray(dados.usos)) {
    throw new Error("O arquivo não tem entradas e usos no formato esperado.");
  }
  const registrosValidos = [...dados.entradas, ...dados.usos].every(
    (r) => Number.isInteger(r.valor) && r.valor > 0 && typeof r.data === "string",
  );
  if (!registrosValidos) {
    throw new Error("O backup tem registros com valor ou data inválidos.");
  }
    const saldos = Object.values(dados.config?.saldosIniciais ?? {});
  if (!saldos.every(Number.isInteger)) {
    throw new Error("O backup tem saldos iniciais inválidos.");
  }
    const dividasValidas = (dados.dividas ?? []).every(
    (d) =>
      typeof d.nome === "string" &&
      Number.isInteger(d.saldo) && d.saldo >= 0 &&
      Number.isFinite(d.jurosMensal) && d.jurosMensal >= 0 &&
      Number.isInteger(d.parcelaMinima) && d.parcelaMinima >= 0,
  );
  const pagamentosValidos = (dados.pagamentos ?? []).every(
    (p) => Number.isInteger(p.valor) && p.valor > 0 && typeof p.data === "string",
  );
  if (!dividasValidas || !pagamentosValidos) {
    throw new Error("O backup tem dívidas ou pagamentos inválidos.");
  }
  return mesclarComPadrao(dados);
}

function mesclarComPadrao(dados) {
  const base = estadoInicial();
  return {
    entradas: dados.entradas ?? base.entradas,
    usos: dados.usos ?? base.usos,
    dividas: dados.dividas ?? base.dividas,
    pagamentos: dados.pagamentos ?? base.pagamentos,
    config: {
      ...base.config,
      ...dados.config,
      saldosIniciais: { ...base.config.saldosIniciais, ...dados.config?.saldosIniciais },
      planejamento: { ...base.config.planejamento, ...dados.config?.planejamento },
    },
  };
}