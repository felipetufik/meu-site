let funcionarios = [];
let indiceAtual = -1;
let editando = false;

function incluir() {
  const novo = lerFormulario();
  if (!novo) return;
  funcionarios.push(novo);
  indiceAtual = funcionarios.length - 1;
  exibirCadastro();
  limparFormulario();
}

function editar() {
  if (indiceAtual < 0) return alert("Nenhum funcionário selecionado.");
  preencherFormulario(funcionarios[indiceAtual]);
  editando = true;
}

function salvar() {
  if (!editando) return;
  const atualizado = lerFormulario();
  if (!atualizado) return;
  funcionarios[indiceAtual] = atualizado;
  editando = false;
  limparFormulario();
  exibirCadastro();
}

function excluir() {
  if (indiceAtual < 0) return alert("Nenhum funcionário selecionado.");
  funcionarios.splice(indiceAtual, 1);
  if (funcionarios.length === 0) {
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
  if (funcionarios.length === 0) return;
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
  if (indiceAtual < funcionarios.length - 1) {
    indiceAtual++;
    exibirCadastro();
  }
}

function ultimo() {
  if (funcionarios.length === 0) return;
  indiceAtual = funcionarios.length - 1;
  exibirCadastro();
}

function lerFormulario() {
  const nome = document.getElementById("nome").value.trim();
  const cargo = document.getElementById("cargo").value.trim();
  const departamento = document.getElementById("departamento").value.trim();
  const salario = parseFloat(document.getElementById("salario").value);

  if (!nome || !cargo || !departamento || isNaN(salario)) {
    alert("Preencha todos os campos corretamente.");
    return null;
  }

  return { nome, cargo, departamento, salario };
}

function preencherFormulario(obj) {
  document.getElementById("nome").value = obj.nome;
  document.getElementById("cargo").value = obj.cargo;
  document.getElementById("departamento").value = obj.departamento;
  document.getElementById("salario").value = obj.salario;
}

function limparFormulario() {
  document.getElementById("nome").value = "";
  document.getElementById("cargo").value = "";
  document.getElementById("departamento").value = "";
  document.getElementById("salario").value = "";
}

function exibirCadastro() {
  if (indiceAtual >= 0 && indiceAtual < funcionarios.length) {
    preencherFormulario(funcionarios[indiceAtual]);
  }
}
