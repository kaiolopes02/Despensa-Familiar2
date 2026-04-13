// ==========================================
// FUNÇÕES DE RENDERIZAÇÃO DA INTERFACE
// ==========================================

function renderizarLista() {
    const container = domCache.listaContainer;
    
    let itensFiltrados = filtrarItens();
    
    if (modoSair) {
        itensFiltrados = itensFiltrados.filter(item => !item.comprado);
    }
    
    const categorias = ['Alimentos', 'Limpeza', 'Higiene', 'Outros'];
    const coresCategorias = {
        'Alimentos': 'cat-alimentos',
        'Limpeza': 'cat-limpeza',
        'Higiene': 'cat-higiene',
        'Outros': 'cat-outros'
    };
    
    const iconesCategorias = {
        'Alimentos': 'fa-apple-alt',
        'Limpeza': 'fa-spray-can',
        'Higiene': 'fa-pump-soap',
        'Outros': 'fa-box'
    };
    
    const fragment = document.createDocumentFragment();
    let temConteudo = false;
    
    categorias.forEach(categoria => {
        const itensCategoria = itensFiltrados.filter(item => item.categoria === categoria);
        
        if (itensCategoria.length === 0) return;
        temConteudo = true;
        
        const section = document.createElement('section');
        section.className = 'categoria-section';
        
        const header = document.createElement('div');
        header.className = 'categoria-header';
        header.innerHTML = `
            <div class="categoria-icon ${coresCategorias[categoria]}">
                <i class="fas ${iconesCategorias[categoria]}"></i>
            </div>
            <h2 class="categoria-title">${escapeHtml(categoria)}</h2>
            <span class="categoria-count">${itensCategoria.length} itens</span>
        `;
        
        const lista = document.createElement('div');
        lista.className = 'itens-lista';
        
        itensCategoria.forEach(item => {
            lista.appendChild(criarElementoItem(item));
        });
        
        section.appendChild(header);
        section.appendChild(lista);
        fragment.appendChild(section);
    });
    
    if (!temConteudo) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-basket"></i>
                <h3>Nenhum item encontrado</h3>
                <p>Adicione novos itens ou altere os filtros para ver mais resultados.</p>
            </div>
        `;
    } else {
        container.innerHTML = '';
        container.appendChild(fragment);
    }
}

function criarElementoItem(item) {
    const article = document.createElement('article');
    article.className = `item ${item.comprado ? 'comprado' : ''}`;
    article.dataset.id = item.id;
    
    const statusBadge = item.comprado ? 
        '<span class="item-status status-comprado">Comprado</span>' : 
        '<span class="item-status status-pendente">Pendente</span>';
    
    article.innerHTML = `
        <div class="checkbox-wrapper">
            <input type="checkbox" 
                   class="item-checkbox" 
                   ${item.comprado ? 'checked' : ''} 
                   title="Marcar como ${item.comprado ? 'pendente' : 'comprado'}">
        </div>
        
        <div class="item-info">
            <div class="item-nome">${escapeHtml(item.nome)}</div>
            <div class="item-meta">
                <span class="item-quantidade">
                    <i class="fas fa-cube" style="font-size: 0.875rem; opacity: 0.5;"></i>
                    ${escapeHtml(item.quantidade)}
                </span>
                ${statusBadge}
            </div>
        </div>
        
        <div class="item-actions">
            <button class="btn-action btn-star ${item.recorrente ? 'active' : ''}" 
                    title="${item.recorrente ? 'Remover dos favoritos' : 'Marcar como favorito'}">
                <i class="fas fa-star"></i>
            </button>
            <button class="btn-action btn-edit" title="Editar">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button class="btn-action btn-delete" title="Remover">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
    
    const checkbox = article.querySelector('.item-checkbox');
    checkbox.addEventListener('change', () => marcarComprado(item.id));
    
    const btnStar = article.querySelector('.btn-star');
    btnStar.addEventListener('click', () => toggleRecorrente(item.id));
    
    const btnEdit = article.querySelector('.btn-edit');
    btnEdit.addEventListener('click', () => editarItem(item.id));
    
    const btnDelete = article.querySelector('.btn-delete');
    btnDelete.addEventListener('click', () => removerItem(item.id));
    
    return article;
}

function renderizarRecorrentes() {
    const container = domCache.recorrentesList;
    
    const nomesNaLista = new Set(itens.map(i => i.nome.toLowerCase()));
    const disponiveis = favoritos.filter(fav => !nomesNaLista.has(fav.nome.toLowerCase()));
    
    if (favoritos.length === 0) {
        container.innerHTML = `
            <span style="color: #92400e; font-size: 0.9375rem; font-style: italic; line-height: 1.5;">
                <i class="fas fa-info-circle"></i>
                Marque itens com a estrela para adicioná-los aos favoritos
            </span>
        `;
        domCache.recorrentesSection.style.display = 'block';
        return;
    }
    
    if (disponiveis.length === 0) {
        domCache.recorrentesSection.style.display = 'none';
        return;
    }
    
    domCache.recorrentesSection.style.display = 'block';
    
    container.innerHTML = '';
    disponiveis.forEach(fav => {
        const btn = document.createElement('button');
        btn.className = 'tag-recorrente';
        btn.innerHTML = `<i class="fas fa-plus" style="font-size: 0.875rem;"></i> ${escapeHtml(fav.nome)}`;
        btn.addEventListener('click', () => adicionarFavorito(fav.nome, fav.quantidade, fav.categoria));
        container.appendChild(btn);
    });
}