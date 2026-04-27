const CHAVE_FATURAS      = 'teksystem_faturas';
const CHAVE_PROXIMO_ID   = 'teksystem_proximoId';
const CHAVE_CONVENIOS    = 'teksystem_convenios';
const CHAVE_VERSAO       = 'teksystem_versao';
const VERSAO_APP         = '3';

const CONVENIOS_PADRAO = [
  { id: 1, nome: 'Particular',    cobertura: 0,  descricao: 'Pagamento direto' },
  { id: 2, nome: 'Unimed',        cobertura: 80, descricao: 'Tabela TUSS' },
  { id: 3, nome: 'Amil',          cobertura: 70, descricao: 'Tabela AMB' },
  { id: 4, nome: 'Bradesco Saúde',cobertura: 75, descricao: 'Tabela CBHPM' },
  { id: 5, nome: 'SulAmérica',    cobertura: 70, descricao: 'Tabela TUSS' },
];

function carregar(chave, padrao) {
  try {
    const s = localStorage.getItem(chave);
    return s ? JSON.parse(s) : padrao;
  } catch { return padrao; }
}

function salvarLS(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

let faturas      = carregar(CHAVE_FATURAS,   []);
let convenios    = carregar(CHAVE_CONVENIOS, CONVENIOS_PADRAO);
let proximoId    = parseInt(localStorage.getItem(CHAVE_PROXIMO_ID) || '1', 10);

let editandoId          = null;
let editandoConvenioId  = null;
let chaveOrdem          = 'data';
let ordemAsc            = false;
let abaAtiva            = 'faturamento';

const fmtValor = v =>
  'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const fmtData = s => {
  if (!s) return '—';
  const [a, m, d] = s.split('-');
  return `${d}/${m}/${a}`;
};

const mesAno = () => {
  const hoje = new Date();
  return `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
};

const dataHoje = () => new Date().toISOString().slice(0, 10);

function calcularLiquido(valorBruto, nomeConvenio) {
  const conv = convenios.find(c => c.nome === nomeConvenio);
  const cobertura = conv ? conv.cobertura : 0;
  return +(valorBruto * (1 - cobertura / 100)).toFixed(2);
}

function obterCobertura(nomeConvenio) {
  const conv = convenios.find(c => c.nome === nomeConvenio);
  return conv ? conv.cobertura : 0;
}

function atualizarCalculo() {
  const bruto    = parseFloat(document.getElementById('campoValorBruto').value) || 0;
  const convenio = document.getElementById('campoConvenio').value;
  const cobertura = obterCobertura(convenio);
  const liquido  = calcularLiquido(bruto, convenio);

  document.getElementById('campoDesconto').value    = cobertura + '%';
  document.getElementById('campoValorLiquido').value = fmtValor(liquido);
}

function toggleDataPagamento() {
  const status = document.getElementById('campoStatus').value;
  const grupo  = document.getElementById('grupDataPagamento');
  grupo.style.display = status === 'Pago' ? 'flex' : 'none';
  if (status === 'Pago' && !document.getElementById('campoDataPagamento').value) {
    document.getElementById('campoDataPagamento').value = dataHoje();
  }
}

function obterFiltradas() {
  const busca  = (document.getElementById('campoBusca')?.value || '').toLowerCase();
  const inicio = document.getElementById('dataInicio')?.value || '';
  const fim    = document.getElementById('dataFim')?.value    || '';
  const status = document.getElementById('filtroStatus')?.value || '';
  const pgto   = document.getElementById('filtroFormaPagamento')?.value || '';
  const conv   = document.getElementById('filtroConvenio')?.value || '';

  return faturas.filter(f => {
    if (busca  && !f.paciente.toLowerCase().includes(busca) && !f.procedimento.toLowerCase().includes(busca)) return false;
    if (inicio && f.data < inicio) return false;
    if (fim    && f.data > fim)    return false;
    if (status && f.status !== status) return false;
    if (pgto   && f.formaPagamento !== pgto) return false;
    if (conv   && f.convenio !== conv) return false;
    return true;
  });
}

function ordenarPor(chave) {
  if (chaveOrdem === chave) ordemAsc = !ordemAsc;
  else { chaveOrdem = chave; ordemAsc = true; }
  renderizarTabela();
}

function limparFiltros() {
  ['campoBusca', 'dataInicio', 'dataFim'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['filtroStatus', 'filtroFormaPagamento', 'filtroConvenio'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  renderizarTabela();
}

function renderizarTabela() {
  const lista = obterFiltradas().slice().sort((a, b) => {
    const va = a[chaveOrdem] ?? '';
    const vb = b[chaveOrdem] ?? '';
    if (va < vb) return ordemAsc ? -1 : 1;
    if (va > vb) return ordemAsc ?  1 : -1;
    return 0;
  });

  const todas = obterFiltradas();
  const soma  = st => todas.filter(f => f.status === st).reduce((s, f) => s + f.valorLiquido, 0);
  const cnt   = st => todas.filter(f => f.status === st).length;

  document.getElementById('indicadorPendente').textContent  = fmtValor(soma('Pendente'));
  document.getElementById('indicadorPago').textContent      = fmtValor(soma('Pago'));
  document.getElementById('indicadorCancelado').textContent = fmtValor(soma('Cancelado'));
  document.getElementById('contagemPendente').textContent   = cnt('Pendente')  + ' fatura' + (cnt('Pendente')  !== 1 ? 's' : '');
  document.getElementById('contagemPago').textContent       = cnt('Pago')      + ' fatura' + (cnt('Pago')      !== 1 ? 's' : '');
  document.getElementById('contagemCancelado').textContent  = cnt('Cancelado') + ' fatura' + (cnt('Cancelado') !== 1 ? 's' : '');

  const hoje = new Date();
  const fatMes = faturas.filter(f => {
    const d = new Date(f.data);
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear() && f.status !== 'Cancelado';
  });
  const totalMes = fatMes.reduce((s, f) => s + f.valorLiquido, 0);
  document.getElementById('indicadorMes').textContent   = fmtValor(totalMes);
  document.getElementById('contagemMes').textContent    = fatMes.length + ' em ' + mesAno();

  document.getElementById('tabelaTotal').textContent = lista.length + ' fatura' + (lista.length !== 1 ? 's' : '');

  const corpo = document.getElementById('corpoTabela');
  if (lista.length === 0) {
    corpo.innerHTML = `<tr><td colspan="8"><div class="sem-resultados">
      <i class="bi bi-inbox"></i>
      <p>Nenhuma fatura encontrada.</p>
    </div></td></tr>`;
    return;
  }

  corpo.innerHTML = lista.map(f => {
    const cls = f.status === 'Pendente' ? 'pendente' : f.status === 'Pago' ? 'pago' : 'cancelado';
    let acoes = `<button class="btn-acao" onclick="verDetalhe(${f.id})"><i class="bi bi-eye"></i></button>`;
    if (f.status === 'Pendente') {
      acoes += `<button class="btn-acao sucesso" onclick="receberFatura(${f.id})">Receber</button>`;
      acoes += `<button class="btn-acao perigo"  onclick="cancelarFatura(${f.id})">Cancelar</button>`;
    }
    if (f.status === 'Pago') {
      acoes += `<button class="btn-acao" onclick="verDetalhe(${f.id})">Recibo</button>`;
    }
    acoes += `<button class="btn-acao" onclick="editarFatura(${f.id})" title="Editar"><i class="bi bi-pencil"></i></button>`;

    return `<tr>
      <td class="nome-paciente">${f.paciente}</td>
      <td class="celula-procedimento">${f.procedimento}</td>
      <td class="celula-data">${fmtData(f.data)}</td>
      <td class="celula-convenio">${f.convenio}</td>
      <td class="celula-pgto">${f.formaPagamento}</td>
      <td class="celula-valor">${fmtValor(f.valorLiquido)}</td>
      <td><span class="emblema ${cls}">${f.status}</span></td>
      <td><div class="celula-acoes">${acoes}</div></td>
    </tr>`;
  }).join('');
}

function receberFatura(id) {
  const f = faturas.find(f => f.id === id);
  f.status       = 'Pago';
  f.dataPagamento = dataHoje();
  salvarLS(CHAVE_FATURAS, faturas);
  renderizarTabela();
  notificar('Fatura marcada como Paga ✓', 'sucesso');
}

function cancelarFatura(id) {
  if (!confirm('Cancelar esta fatura?')) return;

  const f = faturas.find(f => f.id === id);
  f.status = 'Cancelado';
  f.dataCancelamento = dataHoje();

  salvarLS(CHAVE_FATURAS, faturas);
  renderizarTabela();
  notificar('Fatura cancelada.', 'perigo');
}

function abrirModal() {
  editandoId = null;
  document.getElementById('tituloModal').textContent = 'Nova Fatura';
  limparModal();
  atualizarCalculo();
  toggleDataPagamento();
  document.getElementById('fundoModal').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('fundoModal').classList.remove('aberto');
  editandoId = null;
}

function limparModal() {
  ['campoPaciente', 'campoData', 'campoValorBruto', 'campoDataPagamento', 'campoObservacao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('campoProcedimento').selectedIndex  = 0;
  document.getElementById('campoConvenio').selectedIndex      = 0;
  document.getElementById('campoFormaPagamento').selectedIndex = 0;
  document.getElementById('campoStatus').selectedIndex        = 0;
  document.getElementById('campoDesconto').value     = '0%';
  document.getElementById('campoValorLiquido').value = 'R$ 0,00';
  document.getElementById('grupDataPagamento').style.display = 'none';
}

function editarFatura(id) {
  editandoId = id;
  const f = faturas.find(f => f.id === id);
  document.getElementById('tituloModal').textContent = 'Editar Fatura';
  document.getElementById('campoPaciente').value      = f.paciente;
  document.getElementById('campoData').value          = f.data;
  document.getElementById('campoProcedimento').value  = f.procedimento;
  document.getElementById('campoConvenio').value      = f.convenio;
  document.getElementById('campoValorBruto').value    = f.valorBruto;
  document.getElementById('campoFormaPagamento').value = f.formaPagamento;
  document.getElementById('campoStatus').value        = f.status;
  document.getElementById('campoDataPagamento').value = f.dataPagamento || '';
  document.getElementById('campoObservacao').value    = f.observacao    || '';
  atualizarCalculo();
  toggleDataPagamento();
  document.getElementById('fundoModal').classList.add('aberto');
}

function salvarFatura() {
  const paciente      = document.getElementById('campoPaciente').value.trim();
  const data          = document.getElementById('campoData').value;
  const procedimento  = document.getElementById('campoProcedimento').value;
  const convenio      = document.getElementById('campoConvenio').value;
  const valorBruto    = parseFloat(document.getElementById('campoValorBruto').value);
  const formaPagamento = document.getElementById('campoFormaPagamento').value;
  const status        = document.getElementById('campoStatus').value;
  const dataPagamento = document.getElementById('campoDataPagamento').value;
  const observacao    = document.getElementById('campoObservacao').value.trim();

  if (!paciente || !data || !procedimento || !convenio || isNaN(valorBruto) || valorBruto <= 0) {
    notificar('Preencha todos os campos obrigatórios.', 'perigo');
    return;
  }

  const cobertura   = obterCobertura(convenio);
  const valorLiquido = calcularLiquido(valorBruto, convenio);

  if (editandoId) {
    const f = faturas.find(f => f.id === editandoId);
    Object.assign(f, {
      paciente,
      data,
      procedimento,
      convenio,
      valorBruto,
      desconto: cobertura,
      valorLiquido,
      formaPagamento,
      status,
      dataPagamento,
      observacao,
      dataCancelamento: status === 'Cancelado' ? (f.dataCancelamento || dataHoje()) : undefined
    });
    notificar('Fatura atualizada com sucesso ✓', 'sucesso');
  } else {
    faturas.unshift({ id: proximoId++, paciente, data, procedimento, convenio, valorBruto, desconto: cobertura, valorLiquido, formaPagamento, status, dataPagamento, observacao });
    localStorage.setItem(CHAVE_PROXIMO_ID, proximoId);
    notificar('Nova fatura criada com sucesso ✓', 'sucesso');
  }

  salvarLS(CHAVE_FATURAS, faturas);
  fecharModal();
  renderizarTabela();
}

function verDetalhe(id) {
  const f = faturas.find(f => f.id === id);
  const cls = f.status === 'Pendente' ? 'pendente' : f.status === 'Pago' ? 'pago' : 'cancelado';

  document.getElementById('conteudoDetalhe').innerHTML = `
    <div class="detalhe-grade">
      <div class="detalhe-item col-2">
        <span class="detalhe-rotulo">Paciente</span>
        <span class="detalhe-valor">${f.paciente}</span>
      </div>
      <hr class="detalhe-divisor" />

      <div class="detalhe-item">
        <span class="detalhe-rotulo">Procedimento</span>
        <span class="detalhe-valor">${f.procedimento}</span>
      </div>
      <div class="detalhe-item">
        <span class="detalhe-rotulo">Data do Atendimento</span>
        <span class="detalhe-valor">${fmtData(f.data)}</span>
      </div>

      <div class="detalhe-item">
        <span class="detalhe-rotulo">Convênio</span>
        <span class="detalhe-valor">${f.convenio}</span>
      </div>
      ${f.status === 'Cancelado' ? '' : `
  <div class="detalhe-item">
    <span class="detalhe-rotulo">Forma de Pagamento</span>
    <span class="detalhe-valor">${f.formaPagamento}</span>
  </div>
`}


      <div class="detalhe-item">
        <span class="detalhe-rotulo">Valor Bruto</span>
        <span class="detalhe-valor mono">${fmtValor(f.valorBruto)}</span>
      </div>
      <div class="detalhe-item">
        <span class="detalhe-rotulo">Cobertura do Convênio</span>
        <span class="detalhe-valor mono">${f.desconto}% (− ${fmtValor(f.valorBruto - f.valorLiquido)})</span>
      </div>

      <div class="detalhe-item">
        <span class="detalhe-rotulo">Status</span>
        <span class="detalhe-valor"><span class="emblema ${cls}">${f.status}</span></span>
      </div>
      ${f.status === 'Pendente' ? '' : `
  <div class="detalhe-item">
    <span class="detalhe-rotulo">
      ${f.status === 'Cancelado' ? 'Data do Cancelamento' : 'Data do Pagamento'}
    </span>
    <span class="detalhe-valor">
      ${f.status === 'Cancelado'
        ? fmtData(f.dataCancelamento)
        : fmtData(f.dataPagamento)}
    </span>
  </div>
`}

      ${f.observacao ? `
      <div class="detalhe-item col-2">
        <span class="detalhe-rotulo">Observação</span>
        <span class="detalhe-valor">${f.observacao}</span>
      </div>` : ''}

      ${f.status === 'Cancelado' ? '' : `
      <div class="detalhe-total">
        <span class="detalhe-total-label">
          ${f.status === 'Pendente' ? 'Valor Líquido a Pagar:' : 'Valor Líquido Pago:'}
        </span>
        <span class="detalhe-total-valor">${fmtValor(f.valorLiquido)}</span>
      </div>
    `}
    </div>`;

  document.getElementById('fundoDetalhe').classList.add('aberto');
}

function fecharDetalhe() {
  document.getElementById('fundoDetalhe').classList.remove('aberto');
}

function imprimirDetalhe() {
  const conteudo = document.getElementById('conteudoDetalhe').innerHTML;

  const janela = window.open('', '', 'width=800,height=600');

  janela.document.write(`
    <html>
      <head>
        <title>Recibo</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          .detalhe-grade {
            width: 100%;
          }
          .detalhe-item {
            margin-bottom: 10px;
          }
          .detalhe-rotulo {
            font-weight: bold;
            display: block;
          }
          .detalhe-total {
            margin-top: 20px;
            font-size: 18px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h2>Recibo</h2>
        ${conteudo}
      </body>
    </html>
  `);

  janela.document.close();
  janela.focus();
  janela.print();
  janela.close();
}

function renderizarConvenios() {
  const grade = document.getElementById('gradeConvenios');
  grade.innerHTML = convenios.map(c => `
    <div class="cartao-convenio">
      <div class="convenio-nome">${c.nome}</div>
      <div class="convenio-descricao">${c.descricao || '—'}</div>
      <div class="convenio-cobertura-wrap">
        <span class="convenio-cobertura-label">Cobertura</span>
        <span class="convenio-cobertura-valor">${c.cobertura}%</span>
      </div>
      <div class="barra-cobertura">
        <div class="barra-cobertura-preenchimento" style="width:${c.cobertura}%"></div>
      </div>
      <div class="convenio-acoes">
        <button class="btn-acao perigo" onclick="excluirConvenio(${c.id})"><i class="bi bi-trash"></i></button>
        <button class="btn-acao primario" onclick="editarConvenio(${c.id})"><i class="bi bi-pencil"></i> Editar</button>
      </div>
    </div>
  `).join('');
}

function abrirModalConvenio() {
  editandoConvenioId = null;
  document.getElementById('tituloModalConvenio').textContent = 'Novo Convênio';
  document.getElementById('campoNomeConvenio').value        = '';
  document.getElementById('campoCoberturaConvenio').value   = '';
  document.getElementById('campoDescricaoConvenio').value   = '';
  document.getElementById('fundoConvenio').classList.add('aberto');
}

function fecharModalConvenio() {
  document.getElementById('fundoConvenio').classList.remove('aberto');
  editandoConvenioId = null;
}

function editarConvenio(id) {
  editandoConvenioId = id;
  const c = convenios.find(c => c.id === id);
  document.getElementById('tituloModalConvenio').textContent = 'Editar Convênio';
  document.getElementById('campoNomeConvenio').value        = c.nome;
  document.getElementById('campoCoberturaConvenio').value   = c.cobertura;
  document.getElementById('campoDescricaoConvenio').value   = c.descricao || '';
  document.getElementById('fundoConvenio').classList.add('aberto');
}

function salvarConvenio() {
  const nome      = document.getElementById('campoNomeConvenio').value.trim();
  const cobertura = parseFloat(document.getElementById('campoCoberturaConvenio').value);
  const descricao = document.getElementById('campoDescricaoConvenio').value.trim();

  if (!nome || isNaN(cobertura) || cobertura < 0 || cobertura > 100) {
    notificar('Informe nome e cobertura (0–100%).', 'perigo');
    return;
  }

  if (editandoConvenioId) {
    const c = convenios.find(c => c.id === editandoConvenioId);
    Object.assign(c, { nome, cobertura, descricao });
    notificar('Convênio atualizado ✓', 'sucesso');
  } else {
    const novoId = Math.max(0, ...convenios.map(c => c.id)) + 1;
    convenios.push({ id: novoId, nome, cobertura, descricao });
    notificar('Convênio cadastrado ✓', 'sucesso');
  }

  salvarLS(CHAVE_CONVENIOS, convenios);
  fecharModalConvenio();
  renderizarConvenios();
  popularFiltroConvenio();
  popularSelectConvenio();
}

function excluirConvenio(id) {
  if (!confirm('Excluir este convênio?')) return;
  convenios = convenios.filter(c => c.id !== id);
  salvarLS(CHAVE_CONVENIOS, convenios);
  renderizarConvenios();
  popularFiltroConvenio();
  popularSelectConvenio();
  notificar('Convênio removido.', 'info');
}

function popularFiltroConvenio() {
  const el = document.getElementById('filtroConvenio');
  if (!el) return;
  const val = el.value;
  el.innerHTML = `<option value="">Convênio</option>` +
    convenios.map(c => `<option value="${c.nome}" ${val === c.nome ? 'selected' : ''}>${c.nome}</option>`).join('');
}

function popularSelectConvenio() {
  const el = document.getElementById('campoConvenio');
  if (!el) return;
  const val = el.value;
  el.innerHTML = convenios.map(c =>
    `<option value="${c.nome}" ${val === c.nome ? 'selected' : ''}>${c.nome}</option>`
  ).join('');
}

function renderizarRelatorios() {
  const dados = faturas;
  const total = dados.reduce((s, f) => s + f.valorLiquido, 0);

  const porStatus = ['Pendente', 'Pago', 'Cancelado'].map(s => ({
    nome:  s,
    valor: dados.filter(f => f.status === s).reduce((t, f) => t + f.valorLiquido, 0),
    qtd:   dados.filter(f => f.status === s).length,
  }));

  const pgtoGrupos = {};
  dados.forEach(f => {
    pgtoGrupos[f.formaPagamento] = (pgtoGrupos[f.formaPagamento] || 0) + f.valorLiquido;
  });

  const convGrupos = {};
  dados.forEach(f => {
    convGrupos[f.convenio] = (convGrupos[f.convenio] || 0) + f.valorLiquido;
  });

  const maxConv = Math.max(1, ...Object.values(convGrupos));

  const hoje = new Date();
  const fatMes = dados.filter(f => {
    const d = new Date(f.data);
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });
  const totalMes    = fatMes.reduce((s, f) => s + f.valorLiquido, 0);
  const pagas       = dados.filter(f => f.status === 'Pago');
  const ticket      = pagas.length ? pagas.reduce((s, f) => s + f.valorLiquido, 0) / pagas.length : 0;
  const taxaReceb   = dados.length ? (pagas.length / dados.length * 100).toFixed(1) : 0;

  document.getElementById('conteudoRelatorio').innerHTML = `
    <div class="relatorio-grade">
      <div class="relatorio-card">
        <div class="relatorio-card-titulo"><i class="bi bi-pie-chart"></i> Por Status</div>
        ${porStatus.map(s => `
          <div class="relatorio-linha">
            <span class="relatorio-linha-nome">${s.nome} (${s.qtd})</span>
            <span class="relatorio-linha-valor">
              ${fmtValor(s.valor)}
              <span class="relatorio-linha-percent">${total > 0 ? (s.valor / total * 100).toFixed(1) : 0}%</span>
            </span>
          </div>`).join('')}
        <div class="relatorio-linha" style="border-top:2px solid var(--borda);margin-top:4px;padding-top:10px;">
          <span class="relatorio-linha-nome"><strong>Total Geral</strong></span>
          <span class="relatorio-linha-valor"><strong>${fmtValor(total)}</strong></span>
        </div>
      </div>

      <div class="relatorio-card">
        <div class="relatorio-card-titulo"><i class="bi bi-credit-card"></i> Por Forma de Pagamento</div>
        ${Object.entries(pgtoGrupos).sort((a,b) => b[1]-a[1]).map(([k, v]) => `
          <div class="relatorio-linha">
            <span class="relatorio-linha-nome">${k}</span>
            <span class="relatorio-linha-valor">
              ${fmtValor(v)}
              <span class="relatorio-linha-percent">${total > 0 ? (v / total * 100).toFixed(1) : 0}%</span>
            </span>
          </div>`).join('')}
      </div>

      <div class="relatorio-card">
        <div class="relatorio-card-titulo"><i class="bi bi-graph-up-arrow"></i> Indicadores</div>
        <div class="relatorio-linha">
          <span class="relatorio-linha-nome">Total do Mês (${mesAno()})</span>
          <span class="relatorio-linha-valor">${fmtValor(totalMes)}</span>
        </div>
        <div class="relatorio-linha">
          <span class="relatorio-linha-nome">Ticket Médio (pagos)</span>
          <span class="relatorio-linha-valor">${fmtValor(ticket)}</span>
        </div>
        <div class="relatorio-linha">
          <span class="relatorio-linha-nome">Taxa de Recebimento</span>
          <span class="relatorio-linha-valor">${taxaReceb}%</span>
        </div>
        <div class="relatorio-linha">
          <span class="relatorio-linha-nome">Total de Faturas</span>
          <span class="relatorio-linha-valor">${dados.length}</span>
        </div>
      </div>
    </div>

    <div class="grafico-secao">
      <div class="grafico-titulo"><i class="bi bi-bar-chart-line"></i> Faturamento por Convênio (valor líquido)</div>
      <div class="grafico-barra">
        ${Object.entries(convGrupos).sort((a,b) => b[1]-a[1]).map(([k, v]) => {
          const pct = Math.max(8, (v / maxConv) * 100);
          return `<div class="barra-item">
            <span class="barra-rotulo">${k}</span>
            <div class="barra-trilho">
              <div class="barra-preenchimento" style="width:${pct}%">
                <span class="barra-valor-inline">${fmtValor(v)}</span>
              </div>
            </div>
            <span class="barra-valor-externo">${total > 0 ? (v / total * 100).toFixed(1) : 0}%</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function gerarRelatorio() {
  const dados = obterFiltradas();
  const soma  = s => dados.filter(f => f.status === s).reduce((t, f) => t + f.valorLiquido, 0);
  const sep   = '─'.repeat(80);

  const linhas = [
    'RELATÓRIO DE FATURAMENTO — TEKSYSTEM',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    sep, '',
    dados.map(f =>
      `${fmtData(f.data).padEnd(12)} | ${f.paciente.padEnd(22)} | ${f.procedimento.padEnd(22)} | ${f.convenio.padEnd(16)} | ${f.formaPagamento.padEnd(15)} | ${fmtValor(f.valorLiquido).padStart(12)} | ${f.status}`
    ).join('\n'),
    '', sep,
    `Total Pendente   : ${fmtValor(soma('Pendente'))}`,
    `Total Recebido   : ${fmtValor(soma('Pago'))}`,
    `Total Cancelado  : ${fmtValor(soma('Cancelado'))}`,
    `Total Geral      : ${fmtValor(dados.reduce((t, f) => t + f.valorLiquido, 0))}`,
    `Qtd. Faturas     : ${dados.length}`,
  ].join('\n');

  const link = document.createElement('a');
  link.href     = URL.createObjectURL(new Blob([linhas], { type: 'text/plain;charset=utf-8' }));
  link.download = `relatorio-faturamento-${dataHoje()}.txt`;
  link.click();
  notificar('Relatório TXT gerado e baixado ✓', 'sucesso');
}

function gerarRelatorioHTML() {
  const dados = obterFiltradas();
  const total = dados.reduce((t, f) => t + f.valorLiquido, 0);
  const soma  = s => dados.filter(f => f.status === s).reduce((t, f) => t + f.valorLiquido, 0);

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"/>
  <title>Relatório Faturamento — Teksystem</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; color: #111; padding: 32px 40px; font-size: 13px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f5f5f3; padding: 9px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #888; border-bottom: 2px solid #e8e8e6; }
    td { padding: 9px 12px; border-bottom: 1px solid #e8e8e6; }
    .sumario { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .card { border: 1px solid #e8e8e6; border-radius: 8px; padding: 16px 20px; min-width: 160px; }
    .card-rotulo { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #999; margin-bottom: 6px; }
    .card-valor { font-size: 18px; font-weight: 700; font-family: monospace; }
    .pendente { color: #b45309; } .pago { color: #2e7d32; } .cancelado { color: #c62828; }
    @media print { body { padding: 10px 16px; } }
  </style></head><body>
  <h1>Relatório de Faturamento — Teksystem</h1>
  <div class="sub">Gerado em ${new Date().toLocaleString('pt-BR')} &nbsp;|&nbsp; ${dados.length} fatura(s)</div>
  <div class="sumario">
    <div class="card"><div class="card-rotulo">Total Geral</div><div class="card-valor">${fmtValor(total)}</div></div>
    <div class="card"><div class="card-rotulo">Recebido</div><div class="card-valor pago">${fmtValor(soma('Pago'))}</div></div>
    <div class="card"><div class="card-rotulo">Pendente</div><div class="card-valor pendente">${fmtValor(soma('Pendente'))}</div></div>
    <div class="card"><div class="card-rotulo">Cancelado</div><div class="card-valor cancelado">${fmtValor(soma('Cancelado'))}</div></div>
  </div>
  <table>
    <thead><tr><th>Data</th><th>Paciente</th><th>Procedimento</th><th>Convênio</th><th>Forma Pgto.</th><th>Valor Bruto</th><th>Cobertura</th><th>Valor Líq.</th><th>Status</th></tr></thead>
    <tbody>${dados.map(f => `<tr>
      <td>${fmtData(f.data)}</td><td><strong>${f.paciente}</strong></td><td>${f.procedimento}</td>
      <td>${f.convenio}</td><td>${f.formaPagamento}</td>
      <td style="font-family:monospace">${fmtValor(f.valorBruto)}</td>
      <td>${f.desconto}%</td>
      <td style="font-family:monospace;font-weight:700">${fmtValor(f.valorLiquido)}</td>
      <td class="${f.status.toLowerCase()}">${f.status}</td>
    </tr>`).join('')}</tbody>
  </table>
  <script>window.onload = () => window.print();<\/script>
  </body></html>`);
  win.document.close();
  notificar('Relatório HTML aberto para impressão ✓', 'sucesso');
}

function alternarSidebar() {
  const sidebar = document.getElementById('barraLateral');
  const overlay = document.getElementById('overlayLateral');
  const aberta  = sidebar.classList.toggle('aberta');
  overlay.classList.toggle('visivel', aberta);
}

function fecharSidebar() {
  document.getElementById('barraLateral').classList.remove('aberta');
  document.getElementById('overlayLateral').classList.remove('visivel');
}

function trocarAba(nome, elClicado) {
  abaAtiva = nome;
  fecharSidebar();

  document.querySelectorAll('.secao-aba').forEach(s => s.classList.add('oculto'));

  const secao = document.getElementById(`aba-${nome}`);
  if (secao) secao.classList.remove('oculto');

  document.querySelectorAll('.aba-item').forEach(b => b.classList.remove('ativa'));
  const botaoAtivo = document.querySelector(`.aba-item[onclick*="'${nome}'"]`);
  if (botaoAtivo) botaoAtivo.classList.add('ativa');

  const titulos = { faturamento: 'Faturamento', convenios: 'Convênios', relatorios: 'Relatórios' };
  document.getElementById('topoTitulo').textContent = titulos[nome] || 'Teksystem';

  if (nome === 'faturamento') {
    popularFiltroConvenio(); 
    renderizarTabela();
  }
  if (nome === 'convenios')    renderizarConvenios();
  if (nome === 'relatorios')   renderizarRelatorios();
}

function notificar(msg, tipo = 'info') {
  const el = document.createElement('div');
  el.className   = `notificacao ${tipo}`;
  el.textContent = msg;
  document.getElementById('notificacoes').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

document.addEventListener('DOMContentLoaded', () => {

  if (localStorage.getItem(CHAVE_VERSAO) !== VERSAO_APP) {
    localStorage.removeItem(CHAVE_FATURAS);
    localStorage.removeItem(CHAVE_PROXIMO_ID);
    localStorage.removeItem(CHAVE_CONVENIOS);
  
    faturas   = [];
    convenios = [...CONVENIOS_PADRAO];
    proximoId = 1;
  
    localStorage.setItem(CHAVE_VERSAO, VERSAO_APP);
  }

  if (!localStorage.getItem(CHAVE_FATURAS))
  salvarLS(CHAVE_FATURAS, faturas);
  if (!localStorage.getItem(CHAVE_CONVENIOS))
  salvarLS(CHAVE_CONVENIOS, convenios);

  popularFiltroConvenio();
  popularSelectConvenio();

  renderizarTabela();

  ['fundoModal', 'fundoDetalhe', 'fundoConvenio'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('aberto'); });
  });

  ['campoValorBruto', 'campoConvenio'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', atualizarCalculo);
  });

  const elStatus = document.getElementById('campoStatus');
  if (elStatus) elStatus.addEventListener('change', toggleDataPagamento);
});

function toggleSubmenu(btn) {
  const grupo = btn.closest('.lateral-nav-grupo');
  const submenu = grupo.querySelector('.lateral-nav-submenu');
  const aberto = btn.classList.toggle('aberto');
  submenu.classList.toggle('visivel', aberto);
}
