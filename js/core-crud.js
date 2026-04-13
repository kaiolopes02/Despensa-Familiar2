// ==========================================
// AÇÕES CORE E CRUD (SEM CONFIRMAÇÃO)
// ==========================================

function verificarDuplicado(nome, excluirId = null) {
    const nomeNormalizado = nome.toLowerCase().trim();
    if (nomeNormalizado.length === 0) return false;
    
    return itens.some(item => {
        if (excluirId && item.id === excluirId) return false;
        return item.nome.toLowerCase().trim() === nomeNormalizado;
    });
}

function mostrarErroDuplicado(inputId, errorId, mostrar) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    
    if (!input || !error) return;
    
    if (mostrar) {
        input.classList.add('input-error');
        error.classList.add('show');
    } else {
        input.classList.remove('input-error');
        error.classList.remove('show');
    }
}

function adicionarItem(event) {
    event.preventDefault();
    
    const nome = domCache.nomeItem.value.trim();
    const quantidade = domCache.quantidadeItem.value.trim();
    const categoria = domCache.categoriaItem.value;
    
    if (!nome || !quantidade || !categoria) {
        mostrarToast('Preencha todos os campos obrigatórios.');
        return;
    }
    
    if (nome.length > CONFIG.MAX_ITEM_LENGTH || quantidade.length > CONFIG.MAX_QTD_LENGTH) {
        mostrarToast('Texto muito longo. Máximo 100 caracteres para nome e 50 para quantidade.');
        return;
    }
    
    if (verificarDuplicado(nome)) {
        mostrarErroDuplicado('nomeItem', 'errorNome', true);
        mostrarToast(`"${escapeHtml(nome)}" já existe na lista!`);
        return;
    }
    
    mostrarErroDuplicado('nomeItem', 'errorNome', false);
    
    const novoItem = {
        id: Date.now(),
        nome: nome,
        quantidade: quantidade,
        categoria: categoria,
        comprado: false,
        recorrente: false,
        dataCriacao: new Date().toISOString()
    };
    
    if (itens.length >= CONFIG.MAX_ITEMS) {
        mostrarToast(`Limite máximo de ${CONFIG.MAX_ITEMS} itens atingido.`);
        return;
    }
    
    itens.unshift(novoItem);
    salvarLocalStorage();
    renderizarLista();
    renderizarRecorrentes();
    atualizarStats();
    
    domCache.nomeItem.value = '';
    domCache.quantidadeItem.value = '';
    domCache.nomeItem.focus();
    
    mostrarToast(`"${escapeHtml(nome)}" adicionado à lista!`);
}

function marcarComprado(id) {
    const item = itens.find(i => i.id === id);
    if (item) {
        item.comprado = !item.comprado;
        salvarLocalStorage();
        renderizarLista();
        atualizarStats();
        
        if (item.comprado) {
            mostrarToast(`"${escapeHtml(item.nome)}" marcado como comprado!`);
        }
    }
}

function editarItem(id) {
    const item = itens.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('editId').value = item.id;
    document.getElementById('editNome').value = item.nome;
    document.getElementById('editQuantidade').value = item.quantidade;
    document.getElementById('editCategoria').value = item.categoria;
    
    mostrarErroDuplicado('editNome', 'errorEditNome', false);
    
    domCache.modalEditar.classList.add('active');
}

function salvarEdicao(event) {
    event.preventDefault();
    
    const id = parseInt(document.getElementById('editId').value, 10);
    const nome = document.getElementById('editNome').value.trim();
    const quantidade = document.getElementById('editQuantidade').value.trim();
    const categoria = document.getElementById('editCategoria').value;
    
    if (!nome || !quantidade) return;
    
    if (verificarDuplicado(nome, id)) {
        mostrarErroDuplicado('editNome', 'errorEditNome', true);
        mostrarToast(`"${escapeHtml(nome)}" já existe na lista!`);
        return;
    }
    
    mostrarErroDuplicado('editNome', 'errorEditNome', false);
    
    const item = itens.find(i => i.id === id);
    if (item) {
        const nomeAntigo = item.nome;
        item.nome = nome;
        item.quantidade = quantidade;
        item.categoria = categoria;
        
        const favorito = favoritos.find(f => f.nome.toLowerCase() === nomeAntigo.toLowerCase());
        if (favorito) {
            favorito.nome = nome;
            favorito.quantidade = quantidade;
            favorito.categoria = categoria;
        }
        
        salvarLocalStorage();
        renderizarLista();
        renderizarRecorrentes();
        fecharModal();
        mostrarToast('Item atualizado com sucesso!');
    }
}

function removerItem(id) {
    const item = itens.find(i => i.id === id);
    if (!item) return;
    
    itens = itens.filter(i => i.id !== id);
    salvarLocalStorage();
    renderizarLista();
    renderizarRecorrentes();
    atualizarStats();
    mostrarToast('Item removido!');
}

function toggleRecorrente(id) {
    const item = itens.find(i => i.id === id);
    if (!item) return;
    
    item.recorrente = !item.recorrente;
    
    if (item.recorrente) {
        const jaExiste = favoritos.some(f => f.nome.toLowerCase() === item.nome.toLowerCase());
        if (!jaExiste) {
            favoritos.push({
                nome: item.nome,
                quantidade: item.quantidade,
                categoria: item.categoria
            });
        }
        mostrarToast(`"${escapeHtml(item.nome)}" adicionado aos favoritos!`);
    } else {
        favoritos = favoritos.filter(f => f.nome.toLowerCase() !== item.nome.toLowerCase());
        mostrarToast(`"${escapeHtml(item.nome)}" removido dos favoritos.`);
    }
    
    salvarLocalStorage();
    renderizarLista();
    renderizarRecorrentes();
}

function adicionarFavorito(nome, quantidade, categoria) {
    if (!nome || typeof nome !== 'string') return;
    
    const nomeTrim = nome.trim();
    if (nomeTrim.length === 0 || nomeTrim.length > CONFIG.MAX_ITEM_LENGTH) return;
    
    const existe = itens.some(i => i.nome.toLowerCase() === nomeTrim.toLowerCase());
    
    if (existe) {
        mostrarToast(`"${escapeHtml(nomeTrim)}" já está na lista!`);
        return;
    }
    
    const novoItem = {
        id: Date.now(),
        nome: nomeTrim,
        quantidade: String(quantidade || '').trim().substring(0, CONFIG.MAX_QTD_LENGTH),
        categoria: CONFIG.CATEGORIAS_VALIDAS.includes(categoria) ? categoria : 'Outros',
        comprado: false,
        recorrente: true,
        dataCriacao: new Date().toISOString()
    };
    
    if (itens.length >= CONFIG.MAX_ITEMS) {
        mostrarToast(`Limite máximo de ${CONFIG.MAX_ITEMS} itens atingido.`);
        return;
    }
    
    itens.unshift(novoItem);
    salvarLocalStorage();
    renderizarLista();
    renderizarRecorrentes();
    atualizarStats();
    mostrarToast(`"${escapeHtml(nomeTrim)}" adicionado da lista de favoritos!`);
}