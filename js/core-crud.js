// ==========================================
// AÇÕES CORE E CRUD (SEM CONFIRMAÇÃO)
// ==========================================

// Variável global para armazenar ID do item em edição (mobile-safe)
let itemEditandoId = null;

function normalizarNome(nome) {
    if (typeof nome !== 'string') return '';
    return nome.toLowerCase().trim();
}

function verificarDuplicado(nome, excluirId = null) {
    const nomeNormalizado = normalizarNome(nome);
    if (nomeNormalizado.length === 0) return false;
    
    // Garante comparação string para evitar problemas de tipo
    const idExcluir = excluirId != null ? String(excluirId) : null;
    
    return itens.some(item => {
        if (idExcluir && String(item.id) === idExcluir) return false;
        return normalizarNome(item.nome) === nomeNormalizado;
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
    
    if (!domCache || !domCache.nomeItem) {
        mostrarToast('Aguardando aplicativo iniciar...');
        return;
    }
    
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
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`,
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
    const item = itens.find(i => String(i.id) === String(id));
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
    const item = itens.find(i => String(i.id) === String(id));
    if (!item) return;
    
    // Guarda o ID na variável global (confiável em mobile)
    itemEditandoId = id;
    
    document.getElementById('editId').value = item.id;
    document.getElementById('editNome').value = item.nome;
    document.getElementById('editQuantidade').value = item.quantidade;
    document.getElementById('editCategoria').value = item.categoria;
    
    mostrarErroDuplicado('editNome', 'errorEditNome', false);
    
    domCache.modalEditar.classList.add('active');
}

function salvarEdicao(event) {
    event.preventDefault();
    
    // Usa a variável global primeiro (evita problemas com input hidden em mobile)
    let id = itemEditandoId;
    
    // Fallback: tenta pegar do input se a variável estiver nula
    if (id === null) {
        const inputValue = document.getElementById('editId').value;
        id = inputValue;
    }
    
    // Validação final do ID (compara como string para suportar UUID e numbers)
    if (id === '' || id === null || id === undefined) {
        mostrarToast('Erro ao identificar item. Feche e abra a edição novamente.');
        return;
    }
    const idStr = String(id);
    
    const nome = document.getElementById('editNome').value.trim();
    const quantidade = document.getElementById('editQuantidade').value.trim();
    const categoria = document.getElementById('editCategoria').value;
    
    if (!nome || !quantidade) return;
    
    // Otimização: se o nome não mudou, não verifica duplicado
    const itemAtual = itens.find(i => String(i.id) === idStr);
    const nomeMudou = !itemAtual || normalizarNome(itemAtual.nome) !== nome.toLowerCase();
    
    if (nomeMudou && verificarDuplicado(nome, id)) {
        mostrarErroDuplicado('editNome', 'errorEditNome', true);
        mostrarToast(`"${escapeHtml(nome)}" já existe na lista!`);
        return;
    }
    
    mostrarErroDuplicado('editNome', 'errorEditNome', false);
    
    const item = itens.find(i => String(i.id) === idStr);
    if (item) {
        const nomeAntigo = item.nome;
        item.nome = nome;
        item.quantidade = quantidade;
        item.categoria = categoria;
        
        const favorito = favoritos.find(f => String(f.id) === String(item.id));
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
    
    // Limpa a variável global após salvar
    itemEditandoId = null;
}

function removerItem(id) {
    const item = itens.find(i => String(i.id) === String(id));
    if (!item) return;
    
    itens = itens.filter(i => String(i.id) !== String(id));
    salvarLocalStorage();
    renderizarLista();
    renderizarRecorrentes();
    atualizarStats();
    mostrarToast('Item removido!');
}

function toggleRecorrente(id) {
    const item = itens.find(i => String(i.id) === String(id));
    if (!item) return;
    
    item.recorrente = !item.recorrente;
    
    if (item.recorrente) {
        const jaExiste = favoritos.some(f => normalizarNome(f.nome) === normalizarNome(item.nome));
        if (!jaExiste) {
            favoritos.push({
                id: item.id,
                nome: item.nome,
                quantidade: item.quantidade,
                categoria: item.categoria
            });
        }
        mostrarToast(`"${escapeHtml(item.nome)}" adicionado aos favoritos!`);
    } else {
        // Remove favorito usando o ID do item (mais confiável que nome, que pode ter mudado)
        favoritos = favoritos.filter(f => String(f.id) !== String(item.id));
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
    
    const existe = itens.some(i => normalizarNome(i.nome) === normalizarNome(nomeTrim));
    
    if (existe) {
        mostrarToast(`"${escapeHtml(nomeTrim)}" já está na lista!`);
        return;
    }
    
    const qtd = String(quantidade || '').trim();
    const qtdTruncada = qtd.length > CONFIG.MAX_QTD_LENGTH;
    const qtdFinal = qtdTruncada ? qtd.substring(0, CONFIG.MAX_QTD_LENGTH) : qtd;
    const catOrig = categoria || 'Outros';
    const catFinal = CONFIG.CATEGORIAS_VALIDAS.includes(catOrig) ? catOrig : 'Outros';

    if (qtdTruncada || catFinal !== catOrig) {
        mostrarToast('Quantidade reduzida/categoria padronizada para "Outros".');
    }
    
    const novoItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`,
        nome: nomeTrim,
        quantidade: qtdFinal,
        categoria: catFinal,
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