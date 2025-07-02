let cadastros = [];
let indiceAtual = -1;
let editando = false;

function incluir() {
  const novo = lerFormulario();
  if (!novo) return;
  cadastros.push(novo);
  indiceAtual = cadastros.length - 1;
  exibirCadastro();
  limparFormulario();
}

function editar() {
  if (indiceAtual < 0) return alert("Nenhum item selecionado.");
  preencherFormulario(cadastros[indiceAtual]);
  editando = true;
}

function salvar() {
  if (!editando) return;
  const atualizado = lerFormulario();
  if (!atualizado) return;
  cadastros[indiceAtual] = atualizado;
  editando = false;
  limparFormulario();
  exibirCadastro();
}

function excluir() {
  if (indiceAtual < 0) return alert("Nenhum item selecionado.");
  cadastros.splice(indiceAtual, 1);
  if (cadastros.length === 0) {
    indiceAtual = -1;
    limparFormulario();
  } else {
    indiceAtual = Math.max(0, indiceAtual - 1);
    exibirCadastro();
  }
}

function cancelar() {
  limparFormulario();
  editando = false;
}

function primeiro() {
  if (cadastros.length === 0) return;
  indiceAtual = 0;
  exibirCadastro();
}

function anterior() {
  if (indiceAtual > 0) {
    indiceAtual--;
    exibirCadastro();
  }
}

function proximo() {
  if (indiceAtual < cadastros.length - 1) {
    indiceAtual++;
    exibirCadastro();
  }
}

function ultimo() {
  if (cadastros.length === 0) return;
  indiceAtual = cadastros.length - 1;
  exibirCadastro();
}

function lerFormulario() {
  const nome = document.getElementById("nome").value.trim();
  const tipo = document.getElementById("tipo").value.trim();
  const descricao = document.getElementById("descricao").value.trim();
  const preco = parseFloat(document.getElementById("preco").value);

  if (!nome || !tipo || !descricao || isNaN(preco)) {
    alert("Preencha todos os campos corretamente.");
    return null;
  }

  return { nome, tipo, descricao, preco };
}

function preencherFormulario(obj) {
  document.getElementById("nome").value = obj.nome;
  document.getElementById("tipo").value = obj.tipo;
  document.getElementById("descricao").value = obj.descricao;
  document.getElementById("preco").value = obj.preco;
}

function limparFormulario() {
  document.getElementById("nome").value = "";
  document.getElementById("tipo").value = "";
  document.getElementById("descricao").value = "";
  document.getElementById("preco").value = "";
}

function exibirCadastro() {
  if (indiceAtual >= 0 && indiceAtual < cadastros.length) {
    preencherFormulario(cadastros[indiceAtual]);
  }
}
