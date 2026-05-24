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
  // localStorage desativado temporariamente — dados não persistem entre sessões
  return padrao;
}

function salvarLS(chave, valor) {
  // localStorage desativado temporariamente
}

let faturas      = carregar(CHAVE_FATURAS,   []);
let convenios    = carregar(CHAVE_CONVENIOS, CONVENIOS_PADRAO);
let proximoId    = 1;

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

  const cobertura    = obterCobertura(convenio);
  const valorLiquido = calcularLiquido(valorBruto, convenio);

  // CORREÇÃO AQUI
  if (editandoId !== null) {

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
      dataCancelamento:
        status === 'Cancelado'
          ? (f.dataCancelamento || dataHoje())
          : undefined
    });

    notificar('Fatura atualizada com sucesso ✓', 'sucesso');

  } else {

    faturas.unshift({
      id: proximoId++,
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
      observacao
    });

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







function notificar(mensagem, tipo = 'sucesso') {
  const cores = {
    sucesso: { bg: '#e6f8f2', borda: '#b3ead8', texto: '#0d9e6e', icone: 'bi-check-circle-fill' },
    perigo:  { bg: '#fff0f0', borda: '#ffc9c9', texto: '#e03131', icone: 'bi-x-circle-fill' },
    aviso:   { bg: '#fffbeb', borda: '#ffe58f', texto: '#d48806', icone: 'bi-exclamation-circle-fill' },
  };
  const c = cores[tipo] || cores.sucesso;
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:99999;
    display:flex; align-items:center; gap:10px;
    background:${c.bg}; border:1.5px solid ${c.borda}; color:${c.texto};
    padding:13px 18px; border-radius:12px;
    font-size:13.5px; font-weight:600; font-family:inherit;
    box-shadow:0 4px 16px rgba(0,0,0,0.10);
    max-width:340px; transition: opacity .3s;
  `;
  toast.innerHTML = `<i class="bi ${c.icone}" style="font-size:16px;flex-shrink:0"></i><span>${mensagem}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
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

  if (nome === 'faturamento') {
    popularFiltroConvenio(); 
    renderizarTabela();
  }
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