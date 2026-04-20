// ==========================================
// FILTROS, MODOS, AÇÕES EM MASSA E INIT
// ==========================================

function limparComprados() {
    const comprados = itens.filter(i => i.comprado).length;
    if (comprados === 0) {
        mostrarToast('Não há itens comprados para limpar.');
        return;
    }
    
    if (confirm(`Deseja remover ${comprados} iten(s) comprado(s)?`)) {
        itens = itens.filter(i => !i.comprado);
        salvarLocalStorage();
        renderizarLista();
        renderizarRecorrentes();
        atualizarStats();
        mostrarToast('Itens comprados removidos!');
    }
}

function resetarLista() {
    if (itens.length === 0) {
        mostrarToast('A lista já está vazia!');
        return;
    }
    
    if (confirm('ATENÇÃO: Isso removerá TODOS os itens da lista. Deseja continuar?')) {
        itens = [];
        salvarLocalStorage();
        renderizarLista();
        renderizarRecorrentes();
        atualizarStats();
        mostrarToast('Lista resetada com sucesso!');
    }
}

function setFiltro(filtro) {
    const filtrosValidos = ['todos', 'Alimentos', 'Limpeza', 'Higiene', 'Outros', 'recorrentes'];
    if (!filtrosValidos.includes(filtro)) {
        return;
    }
    
    filtroAtual = filtro;
    
    document.querySelectorAll('.filters .btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filtro) {
            btn.classList.add('active');
        }
    });
    
    renderizarLista();
}

function filtrarItens() {
    switch (filtroAtual) {
        case 'Alimentos':
        case 'Limpeza':
        case 'Higiene':
        case 'Outros':
            return itens.filter(i => i.categoria === filtroAtual);
        case 'recorrentes':
            return itens.filter(i => i.recorrente);
        default:
            return itens;
    }
}

function toggleModoSair() {
    modoSair = !modoSair;
    const body = document.body;
    const btn = domCache.btnModoSair;
    const badge = domCache.modoBadge;
    
    if (modoSair) {
        body.classList.add('modo-sair');
        btn.innerHTML = '<i class="fas fa-times"></i><span>Sair do modo</span>';
        btn.classList.add('active');
        badge.style.display = 'flex';
        
        setFiltro('todos');
        /* REMOVIDO: domCache.filtersContainer.style.display = 'none'; */
        
        mostrarToast('Modo "No Mercado" ativado!');
    } else {
        body.classList.remove('modo-sair');
        btn.innerHTML = '<i class="fas fa-walking"></i><span>No Mercado</span>';
        btn.classList.remove('active');
        badge.style.display = 'none';
        
        /* REMOVIDO: domCache.filtersContainer.style.display = 'flex'; */
        setFiltro('todos');
        
        mostrarToast('Modo normal restaurado');
    }
    
    renderizarLista();
}

function fecharModal() {
    domCache.modalEditar.classList.remove('active');
    mostrarErroDuplicado('editNome', 'errorEditNome', false);
}

function processarDadosIniciais() {
    const urlParams = new URLSearchParams(window.location.search);
    const dadosCompartilhados = urlParams.get('d');
    
    if (dadosCompartilhados) {
        try {
            let dadosDecodificados;
            
            try {
                const descomprimido = LZString.decompressFromEncodedURIComponent(dadosCompartilhados);
                if (descomprimido) {
                    dadosDecodificados = JSON.parse(descomprimido);
                }
            } catch (e) {
                try {
                    dadosDecodificados = JSON.parse(decodeURIComponent(escape(atob(dadosCompartilhados))));
                } catch (e2) {
                    throw new Error('Formato inválido');
                }
            }
            
            if (Array.isArray(dadosDecodificados)) {
                itens = validarArrayItens(dadosDecodificados);
                if (itens.length > 0) {
                    salvarLocalStorage();
                    mostrarToast('Lista compartilhada carregada com sucesso!');
                }
            }
            
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
            console.error('Erro ao carregar dados da URL:', e);
            mostrarToast('Link inválido ou corrompido.');
            carregarLocalStorage();
        }
    } else {
        carregarLocalStorage();
    }
}

// INICIALIZAÇÃO E LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    domCache = {
        nomeItem: document.getElementById('nomeItem'),
        quantidadeItem: document.getElementById('quantidadeItem'),
        categoriaItem: document.getElementById('categoriaItem'),
        listaContainer: document.getElementById('listaContainer'),
        recorrentesList: document.getElementById('recorrentesList'),
        recorrentesSection: document.getElementById('recorrentesSection'),
        modalEditar: document.getElementById('modalEditar'),
        modalCompartilhar: document.getElementById('modalCompartilhar'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toastMessage'),
        statTotal: document.getElementById('statTotal'),
        statPendentes: document.getElementById('statPendentes'),
        statComprados: document.getElementById('statComprados'),
        filtersContainer: document.getElementById('filtersContainer'),
        modoBadge: document.getElementById('modoBadge'),
        btnModoSair: document.getElementById('btnModoSair')
    };
    
    try {
        processarDadosIniciais();
    } catch (e) {
        console.error('Erro ao inicializar:', e);
        mostrarToast('Erro ao carregar dados. Iniciando com lista vazia.');
    }
    
    renderizarRecorrentes();
    renderizarLista();
    atualizarStats();
    
    domCache.nomeItem.addEventListener('input', () => {
        mostrarErroDuplicado('nomeItem', 'errorNome', false);
    });
    
    document.getElementById('editNome').addEventListener('input', () => {
        mostrarErroDuplicado('editNome', 'errorEditNome', false);
    });
    
    domCache.modalEditar.addEventListener('click', (e) => {
        if (e.target.id === 'modalEditar') fecharModal();
    });
    
    domCache.modalCompartilhar.addEventListener('click', (e) => {
        if (e.target.id === 'modalCompartilhar') fecharModalCompartilhar();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            fecharModal();
            fecharModalCompartilhar();
            if (modoSair) toggleModoSair();
        }
    });
});