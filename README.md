# Minhas caixinhas

Aplicativo web pessoal de finanças. Cada entrada de dinheiro é dividida automaticamente entre "esferas" (caixinhas), e o app acompanha saldos, metas, dívidas e um plano de quitação.

Funciona direto no navegador, pode ser instalado no celular como aplicativo (PWA) e também abre sem internet.

## Privacidade

Todos os dados (entradas, usos, saldos, metas e dívidas) ficam **somente no navegador do aparelho**, no `localStorage`. Não há servidor, conta nem envio de dados. Este repositório contém apenas o código, e nunca valores pessoais.

Consequências:
- Cada aparelho e cada endereço guardam os seus próprios dados.
- Limpar os dados do navegador apaga tudo, então use **Ajustes e backup → Baixar backup** com frequência.
- Arquivos de backup nunca devem ser colocados neste repositório (o `.gitignore` já os ignora).

## O que o app faz

**Distribuição da renda.** Em cada entrada registrada:

1. Separa-se o dízimo (percentual configurável, padrão 10%).
2. O restante é a *base*, dividida assim:

| Esfera | % da base |
|---|---|
| Despesas | 55% |
| Reserva de emergência | 20% |
| Independência financeira | 10% |
| Lazer | 10% |
| Curso/Livro | 5% |

**Faixa saudável de despesas.** O orçamento de despesas é 55% da base. A meta não obrigatória é gastar até 1/3 da base no mês. Quando um mês já fechado termina nessa faixa, a sobra do orçamento de despesas vai para o saldo da reserva de emergência.

**Saldos e metas.** Cada esfera mostra o recebido no mês, o usado no mês e o saldo acumulado. A reserva e a renda passiva têm metas editáveis, com barra de progresso. Os saldos iniciais (ponto de partida) são informados em Ajustes e não contam como entrada.

**Dívidas.** Cadastro de dívidas com saldo, juros ao mês e parcela mínima, registro de pagamentos (com a esfera de onde saiu o dinheiro) e acompanhamento do progresso.

**Planejamento de quitação.** Simula, mês a mês e com juros, quando as dívidas acabam. Compara as estratégias *avalanche* (maior juros primeiro) e *bola de neve* (menor saldo primeiro), com valor mensal e aporte único configuráveis.

## Estrutura do projeto

```
index.html              Página única, com três abas (Resumo, Dívidas, Planejamento)
css/style.css           Aparência, modo claro e escuro
js/config.js            Percentuais, esferas, tipos de dívida e valores padrão
js/calculos.js          Dízimo, divisão pelas esferas, saldos e bônus mensal
js/dividas.js           Resumo das dívidas e simulação de quitação
js/formato.js           Formatação de moeda, datas e meses (pt-BR)
js/armazenamento.js     Salvar, carregar, exportar e importar dados
js/dom.js               Funções auxiliares da interface
js/app.js               Resumo, formulários, ajustes e backup
js/ui-dividas.js        Telas de Dívidas e Planejamento
tests/                  Testes automáticos da lógica
manifest.webmanifest    Dados para instalar o app
sw.js                   Service worker (uso sem internet)
icons/                  Ícones do app
```

A lógica de cálculo (`calculos.js` e `dividas.js`) não depende da interface e fica coberta por testes.

## Decisões de projeto

- **Valores em centavos, inteiros.** Evita erros de arredondamento com decimais. Só viram reais na hora de exibir.
- **Funções puras para as contas.** Recebem dados e devolvem resultados, sem tocar na tela, o que facilita os testes.
- **Textos digitados entram como texto, nunca como HTML**, o que evita a injeção de código por descrições ou backups importados.
- **Sem dependências externas.** HTML, CSS e JavaScript puros.

## Como rodar localmente

Requer o Node.js (para os testes) e o Python (para o servidor de teste).

```bash
# Testes
npm test

# Servidor local
python3 -m http.server 8000
```

Abra `http://localhost:8000`. Os módulos JavaScript não funcionam abrindo o arquivo `index.html` diretamente: é preciso um servidor.

## Publicação

O app é publicado com o GitHub Pages, a partir da branch `main`, na raiz do repositório:

https://yasmimlande.github.io/app-financeiro/

Para instalar no celular, abra o endereço no Chrome e escolha **Instalar app** no menu.

## Ao alterar o código

1. Edite e salve os arquivos.
2. Rode `npm test`.
3. Aumente a versão no topo do `sw.js` (por exemplo, `v3` para `v4`) e, se criou arquivos novos, acrescente-os à lista `ARQUIVOS`.
4. `git add .`, `git commit -m "descrição"` e `git push`.
5. Aguarde o GitHub Pages publicar e abra o app com internet para atualizá-lo.

## Aviso

Projeto pessoal e educativo. Não é aconselhamento financeiro.