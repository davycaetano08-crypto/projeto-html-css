const CHAVES = {
    clubes: 'ligas-em-campo-clubes',
    jogadores: 'ligas-em-campo-jogadores',
    partidas: 'ligas-em-campo-partidas'
};

const CHAVE_SESSAO = 'ligas-em-campo-admin';
const CREDENCIAIS_DEMO = { usuario: 'admin', senha: 'ligas2026' };
const painelLogin = document.querySelector('#form-login');
const painelAdmin = document.querySelector('#painel-admin');
const mensagemLogin = document.querySelector('#mensagem-login');
const mensagemAdmin = document.querySelector('#mensagem-admin');

function lerRegistros(tipo) {
    const conteudo = localStorage.getItem(CHAVES[tipo]);

    if (conteudo === null) {
        return [];
    }

    const registros = JSON.parse(conteudo);

    if (!Array.isArray(registros)) {
        throw new Error('Os dados salvos estão em um formato inválido.');
    }

    return registros;
}

function salvarRegistros(tipo, registros) {
    localStorage.setItem(CHAVES[tipo], JSON.stringify(registros));
}

function nomeClube(id) {
    const clube = lerRegistros('clubes').find((registro) => registro.id === id);
    return clube ? clube.nome : 'Clube não encontrado';
}

function atualizarOpcoesDeClubes() {
    document.querySelectorAll('select[name="clubeId"]').forEach((select) => {
        const valorAtual = select.value;
        select.replaceChildren(new Option('Selecione um clube', ''));

        lerRegistros('clubes').forEach((clube) => {
            select.add(new Option(clube.nome, clube.id));
        });

        select.value = valorAtual;
    });

    ['mandanteId', 'visitanteId'].forEach((campo) => {
        const select = document.querySelector(`[name="${campo}"]`);
        if (!select) return;

        const valorAtual = select.value;
        select.replaceChildren(new Option('Selecione um clube', ''));

        lerRegistros('clubes').forEach((clube) => {
            select.add(new Option(clube.nome, clube.id));
        });

        select.value = valorAtual;
    });
}

function criarCelula(linha, conteudo) {
    const celula = document.createElement('td');
    celula.textContent = conteudo;
    linha.append(celula);
}

function exibirMensagem(elemento, texto, tipo = 'erro') {
    elemento.textContent = texto;
    elemento.dataset.tipo = tipo;
}

function renderizarTabela(tipo) {
    const corpo = document.querySelector(`[data-colecao="${tipo}"]`);
    const registros = lerRegistros(tipo);
    corpo.replaceChildren();

    if (registros.length === 0) {
        const linha = document.createElement('tr');
        const celula = document.createElement('td');
        celula.colSpan = tipo === 'partidas' ? 5 : 4;
        celula.textContent = 'Ainda não há registros.';
        linha.append(celula);
        corpo.append(linha);
        return;
    }

    registros.forEach((registro) => {
        const linha = document.createElement('tr');
        let valores;

        if (tipo === 'clubes') {
            valores = [registro.nome, registro.pais, registro.liga];
        } else if (tipo === 'jogadores') {
            valores = [registro.nome, nomeClube(registro.clubeId), registro.posicao];
        } else {
            valores = [
                registro.data,
                nomeClube(registro.mandanteId),
                `${registro.golsMandante} x ${registro.golsVisitante}`,
                nomeClube(registro.visitanteId)
            ];
        }

        valores.forEach((valor) => criarCelula(linha, valor));

        const celulaAcoes = document.createElement('td');
        const botaoEditar = document.createElement('button');
        botaoEditar.type = 'button';
        botaoEditar.className = 'botao-acao';
        botaoEditar.dataset.acao = 'editar';
        botaoEditar.dataset.tipo = tipo;
        botaoEditar.dataset.id = registro.id;
        botaoEditar.textContent = 'Editar';

        const botaoExcluir = document.createElement('button');
        botaoExcluir.type = 'button';
        botaoExcluir.className = 'botao-acao botao-excluir';
        botaoExcluir.dataset.acao = 'excluir';
        botaoExcluir.dataset.tipo = tipo;
        botaoExcluir.dataset.id = registro.id;
        botaoExcluir.textContent = 'Excluir';

        celulaAcoes.append(botaoEditar, botaoExcluir);
        linha.append(celulaAcoes);
        corpo.append(linha);
    });
}

function renderizarPainel() {
    atualizarOpcoesDeClubes();
    Object.keys(CHAVES).forEach(renderizarTabela);
}

function iniciarSessao() {
    painelLogin.hidden = true;
    painelAdmin.hidden = false;
    try {
        renderizarPainel();
    } catch (erro) {
        exibirMensagem(mensagemAdmin, `Não foi possível carregar os dados: ${erro.message}`);
    }
}

function encerrarSessao() {
    sessionStorage.removeItem(CHAVE_SESSAO);
    painelAdmin.hidden = true;
    painelLogin.hidden = false;
    mensagemLogin.textContent = 'Sessão encerrada.';
    mensagemLogin.dataset.tipo = 'sucesso';
}

function obterDadosDoFormulario(formulario) {
    const tipo = formulario.dataset.formulario;
    const dados = Object.fromEntries(new FormData(formulario).entries());
    const id = dados.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    if (tipo === 'clubes') {
        return { id, nome: dados.nome.trim(), pais: dados.pais.trim(), liga: dados.liga.trim() };
    }

    if (tipo === 'jogadores') {
        return { id, nome: dados.nome.trim(), clubeId: dados.clubeId, posicao: dados.posicao.trim() };
    }

    return {
        id,
        data: dados.data,
        mandanteId: dados.mandanteId,
        golsMandante: Number(dados.golsMandante),
        visitanteId: dados.visitanteId,
        golsVisitante: Number(dados.golsVisitante)
    };
}

function prepararEdicao(tipo, id) {
    const formulario = document.querySelector(`[data-formulario="${tipo}"]`);
    const registro = lerRegistros(tipo).find((item) => item.id === id);

    if (!registro) {
        throw new Error('O registro selecionado não foi encontrado.');
    }

    Object.entries(registro).forEach(([campo, valor]) => {
        const entrada = formulario.elements.namedItem(campo);
        if (entrada) entrada.value = valor;
    });

    formulario.querySelector('[data-cancelar-edicao]').hidden = false;
    formulario.querySelector('button[type="submit"]').textContent = 'Salvar alterações';
    formulario.querySelector('input:not([type="hidden"]), select').focus();
}

function excluirRegistro(tipo, id) {
    if (tipo === 'clubes') {
        const temJogadores = lerRegistros('jogadores').some((item) => item.clubeId === id);
        const temPartidas = lerRegistros('partidas').some(
            (item) => item.mandanteId === id || item.visitanteId === id
        );

        if (temJogadores || temPartidas) {
            exibirMensagem(mensagemAdmin, 'Remova ou atualize os jogadores e partidas ligados a este clube antes de excluí-lo.');
            return;
        }
    }

    const registros = lerRegistros(tipo).filter((item) => item.id !== id);
    salvarRegistros(tipo, registros);
    renderizarPainel();
    exibirMensagem(mensagemAdmin, 'Registro excluído.', 'sucesso');
}

if (painelLogin && painelAdmin) {
    if (sessionStorage.getItem(CHAVE_SESSAO) === 'ativa') {
        iniciarSessao();
    }

    painelLogin.addEventListener('submit', (evento) => {
        evento.preventDefault();
        const dados = new FormData(painelLogin);
        const usuario = dados.get('usuario');
        const senha = dados.get('senha');

        if (usuario !== CREDENCIAIS_DEMO.usuario || senha !== CREDENCIAIS_DEMO.senha) {
            exibirMensagem(mensagemLogin, 'Usuário ou senha inválidos.');
            return;
        }

        sessionStorage.setItem(CHAVE_SESSAO, 'ativa');
        mensagemLogin.textContent = '';
        iniciarSessao();
    });

    document.querySelectorAll('[data-formulario]').forEach((formulario) => {
        formulario.addEventListener('submit', (evento) => {
            evento.preventDefault();
            if (!formulario.reportValidity()) return;

            try {
                const tipo = formulario.dataset.formulario;
                const registro = obterDadosDoFormulario(formulario);

                if (
                    tipo === 'partidas' &&
                    registro.mandanteId === registro.visitanteId
                ) {
                    exibirMensagem(mensagemAdmin, 'Selecione clubes diferentes para mandante e visitante.');
                    return;
                }

                const registros = lerRegistros(tipo);
                const indice = registros.findIndex((item) => item.id === registro.id);

                if (indice === -1) registros.push(registro);
                else registros[indice] = registro;

                salvarRegistros(tipo, registros);
                formulario.reset();
                formulario.elements.namedItem('id').value = '';
                formulario.querySelector('[data-cancelar-edicao]').hidden = true;
                formulario.querySelector('button[type="submit"]').textContent = 'Cadastrar';
                renderizarPainel();
                exibirMensagem(mensagemAdmin, 'Registro salvo com sucesso.', 'sucesso');
            } catch (erro) {
                exibirMensagem(mensagemAdmin, `Não foi possível salvar o registro: ${erro.message}`);
            }
        });
    });

    painelAdmin.addEventListener('click', (evento) => {
        const botao = evento.target.closest('button');
        if (!botao) return;

        if (botao.matches('[data-sair]')) {
            encerrarSessao();
            return;
        }

        if (botao.matches('[data-cancelar-edicao]')) {
            const formulario = botao.closest('form');
            formulario.reset();
            formulario.elements.namedItem('id').value = '';
            botao.hidden = true;
            formulario.querySelector('button[type="submit"]').textContent = 'Cadastrar';
            return;
        }

        if (!botao.matches('[data-acao]')) return;

        try {
            if (botao.dataset.acao === 'editar') {
                prepararEdicao(botao.dataset.tipo, botao.dataset.id);
            } else if (window.confirm('Deseja excluir este registro?')) {
                excluirRegistro(botao.dataset.tipo, botao.dataset.id);
            }
        } catch (erro) {
            exibirMensagem(mensagemAdmin, `Não foi possível concluir a ação: ${erro.message}`);
        }
    });
}

if (!painelAdmin) {
    document.querySelectorAll('[data-sair]').forEach((botao) => {
        botao.addEventListener('click', () => {
            sessionStorage.removeItem(CHAVE_SESSAO);
            window.location.href = './admin.html';
        });
    });
}

document.querySelectorAll('[data-relatorio]').forEach((corpo) => {
    if (sessionStorage.getItem(CHAVE_SESSAO) !== 'ativa') {
        window.location.replace('./admin.html?login=necessario');
    } else {
        try {
            const tipo = corpo.dataset.relatorio;
            const registros = lerRegistros(tipo);
            const estadoVazio = document.querySelector('#estado-relatorio');
            estadoVazio.hidden = registros.length > 0;

            registros.forEach((registro) => {
                const linha = document.createElement('tr');
                let valores;

                if (tipo === 'clubes') {
                    valores = [registro.nome, registro.pais, registro.liga];
                } else if (tipo === 'jogadores') {
                    valores = [registro.nome, nomeClube(registro.clubeId), registro.posicao];
                } else {
                    valores = [
                        registro.data,
                        nomeClube(registro.mandanteId),
                        `${registro.golsMandante} x ${registro.golsVisitante}`,
                        nomeClube(registro.visitanteId)
                    ];
                }

                valores.forEach((valor) => criarCelula(linha, valor));
                corpo.append(linha);
            });

            if (registros.length === 0) {
                exibirMensagem(estadoVazio, 'Nenhum registro disponível. Cadastre dados na área administrativa.', 'informacao');
            }
        } catch (erro) {
            exibirMensagem(document.querySelector('#estado-relatorio'), `Não foi possível carregar o relatório: ${erro.message}`);
        }
    }
});
