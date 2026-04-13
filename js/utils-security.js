// ==========================================
// FUNÇÕES DE SANITIZAÇÃO, VALIDAÇÃO E UTILS
// ==========================================

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

function sanitizarItem(item) {
    if (!item || typeof item !== 'object') return null;
    
    const nome = String(item.nome || '').trim().substring(0, CONFIG.MAX_ITEM_LENGTH);
    const quantidade = String(item.quantidade || '').trim().substring(0, CONFIG.MAX_QTD_LENGTH);
    const categoria = String(item.categoria || 'Outros');
    
    if (!nome || !quantidade) return null;
    
    if (!CONFIG.CATEGORIAS_VALIDAS.includes(categoria)) {
        return null;
    }
    
    return {
        id: typeof item.id === 'number' && !isNaN(item.id) ? item.id : Date.now() + Math.random(),
        nome: nome,
        quantidade: quantidade,
        categoria: categoria,
        comprado: Boolean(item.comprado),
        recorrente: Boolean(item.recorrente),
        dataCriacao: typeof item.dataCriacao === 'string' ? item.dataCriacao : new Date().toISOString()
    };
}

function validarArrayItens(dados) {
    if (!Array.isArray(dados)) return [];
    if (dados.length > CONFIG.MAX_ITEMS) {
        console.warn(`Limite de ${CONFIG.MAX_ITEMS} itens excedido: ${dados.length}. Truncando.`);
        dados = dados.slice(0, CONFIG.MAX_ITEMS);
    }
    return dados.map(sanitizarItem).filter(item => item !== null);
}

function salvarLocalStorage() {
    try {
        const dados = JSON.stringify(itens);
        const dadosFavoritos = JSON.stringify(favoritos);
        
        if (dados.length > 4 * 1024 * 1024) {
            console.warn('Dados muito grandes para localStorage');
            mostrarToast('Lista muito grande. Remova alguns itens.');
            return;
        }
        
        localStorage.setItem(CONFIG.STORAGE_KEY, dados);
        localStorage.setItem(CONFIG.FAVORITOS_KEY, dadosFavoritos);
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            mostrarToast('Armazenamento cheio. Limpe itens antigos.');
        } else {
            console.error('Erro ao salvar:', e);
            mostrarToast('Erro ao salvar dados.');
        }
    }
}

function carregarLocalStorage() {
    try {
        const dados = localStorage.getItem(CONFIG.STORAGE_KEY);
        const dadosFavoritos = localStorage.getItem(CONFIG.FAVORITOS_KEY);
        
        if (dados) {
            const parsed = JSON.parse(dados);
            itens = validarArrayItens(parsed);
        }
        
        if (dadosFavoritos) {
            const parsed = JSON.parse(dadosFavoritos);
            if (Array.isArray(parsed)) {
                favoritos = parsed
                    .filter(f => f && typeof f === 'object')
                    .map(f => ({
                        nome: String(f.nome || '').trim().substring(0, CONFIG.MAX_ITEM_LENGTH),
                        quantidade: String(f.quantidade || '').trim().substring(0, CONFIG.MAX_QTD_LENGTH),
                        categoria: CONFIG.CATEGORIAS_VALIDAS.includes(f.categoria) ? f.categoria : 'Outros'
                    }))
                    .filter(f => f.nome.length > 0);
            }
        }
    } catch (e) {
        console.error('Erro ao carregar localStorage:', e);
        itens = [];
        favoritos = [];
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            localStorage.removeItem(CONFIG.FAVORITOS_KEY);
        } catch (e2) {}
    }
}

function atualizarStats() {
    const total = itens.length;
    const pendentes = itens.filter(i => !i.comprado).length;
    const comprados = itens.filter(i => i.comprado).length;
    
    domCache.statTotal.textContent = total;
    domCache.statPendentes.textContent = pendentes;
    domCache.statComprados.textContent = comprados;
}

function mostrarToast(mensagem) {
    if (!mensagem || typeof mensagem !== 'string') return;
    
    const toast = domCache.toast;
    domCache.toastMessage.textContent = mensagem.substring(0, 200);
    toast.classList.add('show');
    
    if (toast.hideTimeout) {
        clearTimeout(toast.hideTimeout);
    }
    
    toast.hideTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}