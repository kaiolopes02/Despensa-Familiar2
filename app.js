// app.js
/**
 * Despensa - Lista de Compras
 */

const CONFIG = {
    STORAGE_KEY: 'despensa_current',
    DB_NAME: 'DespensaDB',
    DB_VERSION: 1,
    STORE_NAME: 'history',
    MAX_HISTORY: 20,
    MAX_URL_LENGTH: 2000,
    
    CATEGORIES: {
        food: { name: 'Alimentos', icon: '🍽️', color: '#334155' },
        produce: { name: 'Hortifruti', icon: '🥬', color: '#059669' },
        beverages: { name: 'Bebidas', icon: '🥤', color: '#0369a1' },
        cleaning: { name: 'Limpeza', icon: '🧹', color: '#475569' },
        personal: { name: 'Higiene', icon: '🧴', color: '#7c3aed' },
        pet: { name: 'Pets', icon: '🐾', color: '#ea580c' },
        other: { name: 'Outros', icon: '📦', color: '#64748b' }
    }
};

// IndexedDB
class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(CONFIG.STORE_NAME)) {
                    const store = db.createObjectStore(CONFIG.STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('date', 'date', { unique: false });
                }
            };
        });
    }

    async saveToHistory(listData) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORE_NAME);
            
            const entry = {
                date: new Date().toISOString(),
                items: JSON.parse(JSON.stringify(listData)),
                itemCount: listData.length,
                completedCount: listData.filter(i => i.completed).length,
                totalQuantity: listData.reduce((sum, i) => sum + (i.quantity || 1), 0)
            };
            
            const request = store.add(entry);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getHistory() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORE_NAME], 'readonly');
            const store = transaction.objectStore(CONFIG.STORE_NAME);
            const index = store.index('date');
            const request = index.openCursor(null, 'prev');
            
            const results = [];
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < CONFIG.MAX_HISTORY) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteHistoryItem(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getHistoryItem(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORE_NAME], 'readonly');
            const store = transaction.objectStore(CONFIG.STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Compressão URL
class URLCompressor {
    static compress(str) {
        try {
            const encoded = encodeURIComponent(str);
            return encoded.replace(/%20/g, '+').replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
        } catch (e) {
            return null;
        }
    }

    static decompress(str) {
        try {
            const decoded = str.replace(/\+/g, '%20');
            return decodeURIComponent(decoded);
        } catch (e) {
            return null;
        }
    }

    static checkUrlSize(url) {
        return url.length > CONFIG.MAX_URL_LENGTH;
    }
}

// App Principal
class DespensaApp {
    constructor() {
        this.items = [];
        this.filter = 'all';
        this.categoryFilter = 'all';
        this.searchQuery = '';
        this.editingId = null;
        this.db = new Database();
        this.draggedItem = null;
        this.currentHistoryId = null;
        
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.loadFromUrl();
        this.setupEventListeners();
        this.renderCategoryChips();
        this.render();
        this.updateStats();
    }

    setupEventListeners() {
        document.getElementById('item-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addItem();
        });

        window.addEventListener('beforeunload', () => {
            this.saveToStorage();
        });
    }

    saveToStorage() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.items));
    }

    loadFromStorage() {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (stored) {
            try {
                this.items = JSON.parse(stored);
            } catch (e) {
                this.items = [];
            }
        }
    }

    generateShareUrl() {
        const data = JSON.stringify(this.items);
        const compressed = URLCompressor.compress(data);
        if (!compressed) return null;
        return `${window.location.origin}${window.location.pathname}?list=${compressed}`;
    }

    loadFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const listData = params.get('list');
        
        if (listData) {
            try {
                const decompressed = URLCompressor.decompress(listData);
                if (!decompressed) throw new Error('Falha');
                
                const items = JSON.parse(decompressed);
                if (Array.isArray(items) && items.length > 0) {
                    const validItems = items.filter(item => 
                        item && item.id && item.name && item.category && CONFIG.CATEGORIES[item.category]
                    );
                    
                    if (validItems.length > 0) {
                        this.items = validItems;
                        this.showToast(`Lista carregada: ${validItems.length} itens`, 'success');
                        window.history.replaceState({}, document.title, window.location.pathname);
                        return true;
                    }
                }
            } catch (e) {
                console.error('Erro:', e);
            }
        }
        return false;
    }

    // Verifica se item já existe (case insensitive e trim)
    itemExists(name) {
        const normalizedName = name.toLowerCase().trim();
        return this.items.some(item => item.name.toLowerCase().trim() === normalizedName);
    }

    addItem() {
        const nameInput = document.getElementById('item-name');
        const categoryInput = document.getElementById('item-category');
        const quantityInput = document.getElementById('item-quantity');
        
        const name = nameInput.value.trim();
        if (!name) {
            this.showToast('Digite o nome do item', 'error');
            nameInput.focus();
            return;
        }

        // Verificar duplicado
        if (this.itemExists(name)) {
            this.showToast('Este item já existe na lista', 'error');
            nameInput.focus();
            return;
        }

        const item = {
            id: Date.now(),
            name: name,
            category: categoryInput.value,
            quantity: parseInt(quantityInput.value) || 1,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.items.push(item);
        this.saveToStorage();
        
        nameInput.value = '';
        quantityInput.value = '1';
        categoryInput.selectedIndex = 0;
        nameInput.focus();
        
        this.render();
        this.updateStats();
        this.showToast('Item adicionado', 'success');
    }

    toggleComplete(id) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.completed = !item.completed;
            this.saveToStorage();
            this.render();
            this.updateStats();
        }
    }

    // Exclusão sem confirmação (apenas remoção direta)
    deleteItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.saveToStorage();
        this.render();
        this.updateStats();
        this.showToast('Item removido', 'info');
    }

    startEdit(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        
        this.editingId = id;
        document.getElementById('edit-name').value = item.name;
        document.getElementById('edit-category').value = item.category;
        document.getElementById('edit-quantity').value = item.quantity;
        
        this.openModal('edit-modal');
    }

    saveEdit() {
        if (!this.editingId) return;
        
        const item = this.items.find(i => i.id === this.editingId);
        if (item) {
            item.name = document.getElementById('edit-name').value.trim();
            item.category = document.getElementById('edit-category').value;
            item.quantity = parseInt(document.getElementById('edit-quantity').value) || 1;
            
            this.saveToStorage();
            this.render();
            this.updateStats();
            this.closeModal('edit-modal');
            this.showToast('Item atualizado', 'success');
        }
        
        this.editingId = null;
    }

    adjustQty(delta) {
        const input = document.getElementById('item-quantity');
        let value = parseInt(input.value) || 1;
        value += delta;
        if (value < 1) value = 1;
        if (value > 99) value = 99;
        input.value = value;
    }

    adjustEditQty(delta) {
        const input = document.getElementById('edit-quantity');
        let value = parseInt(input.value) || 1;
        value += delta;
        if (value < 1) value = 1;
        if (value > 99) value = 99;
        input.value = value;
    }

    // Novo método: Salvar no histórico e limpar lista
    async saveAndClear() {
        if (this.items.length === 0) {
            this.showToast('Lista vazia', 'error');
            return;
        }

        try {
            await this.db.saveToHistory([...this.items]);
            this.items = [];
            this.saveToStorage();
            this.render();
            this.updateStats();
            this.showToast('Lista salva no histórico e limpa', 'success');
        } catch (error) {
            this.showToast('Erro ao salvar', 'error');
            console.error(error);
        }
    }

    setFilter(filter) {
        this.filter = filter;
        
        document.querySelectorAll('#filter-tags .tag').forEach(tag => {
            tag.classList.remove('active');
        });
        event.target.closest('.tag').classList.add('active');
        
        this.render();
    }

    filterByStatus(status) {
        this.filter = status;
        this.render();
    }

    setCategoryFilter(catId) {
        this.categoryFilter = catId;
        
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.classList.remove('active');
            if (chip.dataset.category === catId) {
                chip.classList.add('active');
            }
        });
        
        this.render();
    }

    search(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.render();
    }

    getFilteredItems() {
        let filtered = this.items;
        
        if (this.filter === 'pending') {
            filtered = filtered.filter(i => !i.completed);
        } else if (this.filter === 'completed') {
            filtered = filtered.filter(i => i.completed);
        }
        
        if (this.categoryFilter !== 'all') {
            filtered = filtered.filter(i => i.category === this.categoryFilter);
        }
        
        if (this.searchQuery) {
            filtered = filtered.filter(i => 
                i.name.toLowerCase().includes(this.searchQuery) ||
                CONFIG.CATEGORIES[i.category].name.toLowerCase().includes(this.searchQuery)
            );
        }
        
        return filtered;
    }

    renderCategoryChips() {
        const container = document.getElementById('category-chips');
        
        let html = `<button class="category-chip ${this.categoryFilter === 'all' ? 'active' : ''}" 
                          data-category="all" 
                          onclick="app.setCategoryFilter('all')">
                        <i class="fas fa-th-large"></i>
                        <span>Todas</span>
                    </button>`;
        
        Object.entries(CONFIG.CATEGORIES).forEach(([id, cat]) => {
            const count = this.items.filter(i => i.category === id).length;
            html += `<button class="category-chip ${this.categoryFilter === id ? 'active' : ''}" 
                          data-category="${id}" 
                          onclick="app.setCategoryFilter('${id}')"
                          ${count === 0 ? 'style="opacity: 0.4;"' : ''}>
                        <span>${cat.icon}</span>
                        <span>${cat.name}</span>
                        ${count > 0 ? `<small>(${count})</small>` : ''}
                    </button>`;
        });
        
        container.innerHTML = html;
    }

    render() {
        const container = document.getElementById('categories-container');
        const filtered = this.getFilteredItems();
        
        this.renderCategoryChips();
        
        if (filtered.length === 0) {
            container.innerHTML = '';
            document.getElementById('empty-state').style.display = 'block';
            return;
        }
        
        document.getElementById('empty-state').style.display = 'none';
        
        const grouped = {};
        filtered.forEach(item => {
            if (!grouped[item.category]) {
                grouped[item.category] = [];
            }
            grouped[item.category].push(item);
        });
        
        const categoryOrder = Object.keys(CONFIG.CATEGORIES);
        
        let html = '';
        categoryOrder.forEach(catId => {
            if (grouped[catId]) {
                const items = grouped[catId];
                const cat = CONFIG.CATEGORIES[catId];
                const completedCount = items.filter(i => i.completed).length;
                const progress = (completedCount / items.length) * 100;
                
                html += `
                    <div class="category-section" data-category="${catId}">
                        <div class="category-header" onclick="app.toggleCategory('${catId}')">
                            <div>
                                <div class="category-title">
                                    <span class="category-icon">${cat.icon}</span>
                                    <span>${cat.name}</span>
                                    <span class="category-count">${items.length}</span>
                                </div>
                                <div class="category-progress">
                                    <div class="category-progress-bar" style="width: ${progress}%"></div>
                                </div>
                            </div>
                            <i class="fas fa-chevron-down collapse-icon"></i>
                        </div>
                        <div class="category-items">
                            ${items.map(item => this.renderItem(item)).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        container.innerHTML = html;
    }

    renderItem(item) {
        const cat = CONFIG.CATEGORIES[item.category];
        return `
            <div class="item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
                <div class="item-checkbox" onclick="app.toggleComplete(${item.id})">
                    ${item.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                
                <div class="item-content">
                    <div class="item-name">${this.escapeHtml(item.name)}</div>
                    <div class="item-meta">
                        <span>${cat.name}</span>
                        <span class="item-quantity">x${item.quantity}</span>
                    </div>
                </div>
                
                <div class="item-actions">
                    <button class="btn btn-icon-small" onclick="app.startEdit(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon-small btn-danger" onclick="app.deleteItem(${item.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toggleCategory(catId) {
        const section = document.querySelector(`[data-category="${catId}"]`);
        section.classList.toggle('collapsed');
    }

    updateStats() {
        const total = this.items.length;
        const completed = this.items.filter(i => i.completed).length;
        const pending = total - completed;
        
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-completed').textContent = completed;
    }

    async openHistory() {
        const history = await this.db.getHistory();
        const listEl = document.getElementById('history-list');
        
        if (history.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 32px;">Nenhuma lista salva</p>';
        } else {
            listEl.innerHTML = history.map(h => {
                const date = new Date(h.date);
                const dateStr = date.toLocaleString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                return `
                    <div class="history-item" onclick="app.viewHistoryDetail(${h.id})">
                        <div class="history-info">
                            <div class="history-date">${dateStr}</div>
                            <div class="history-stats">${h.itemCount} itens • ${h.completedCount} comprados</div>
                        </div>
                        <div class="history-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-icon-small" onclick="app.loadFromHistory(${h.id})" title="Restaurar">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="btn btn-icon-small btn-danger" onclick="app.deleteHistory(${h.id})" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        this.openModal('history-modal');
    }

    async viewHistoryDetail(id) {
        const entry = await this.db.getHistoryItem(id);
        if (!entry) return;
        
        this.currentHistoryId = id;
        const contentEl = document.getElementById('history-detail-content');
        
        if (!entry.items || entry.items.length === 0) {
            contentEl.innerHTML = '<div class="history-detail-empty">Lista vazia</div>';
        } else {
            const grouped = {};
            entry.items.forEach(item => {
                if (!grouped[item.category]) {
                    grouped[item.category] = [];
                }
                grouped[item.category].push(item);
            });
            
            let html = '';
            const categoryOrder = Object.keys(CONFIG.CATEGORIES);
            
            categoryOrder.forEach(catId => {
                if (grouped[catId]) {
                    const cat = CONFIG.CATEGORIES[catId];
                    const items = grouped[catId];
                    
                    html += `
                        <div class="history-detail-category">
                            <div class="history-detail-category-title">
                                <span>${cat.icon}</span>
                                <span>${cat.name}</span>
                                <span style="margin-left: auto; font-size: 0.85rem; color: var(--text-muted);">
                                    ${items.length} item(s)
                                </span>
                            </div>
                            ${items.map(item => `
                                <div class="history-detail-item ${item.completed ? 'completed' : ''}">
                                    <span>
                                        <i class="fas ${item.completed ? 'fa-check' : 'fa-circle'}" style="font-size: 0.7rem; margin-right: 6px;"></i>
                                        ${this.escapeHtml(item.name)}
                                    </span>
                                    <span style="font-weight: 600;">x${item.quantity}</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            });
            
            contentEl.innerHTML = html;
        }
        
        document.getElementById('restore-history-btn').onclick = () => {
            this.loadFromHistory(id);
            this.closeModal('history-detail-modal');
        };
        
        this.closeModal('history-modal');
        this.openModal('history-detail-modal');
    }

    async loadFromHistory(id) {
        const entry = await this.db.getHistoryItem(id);
        
        if (entry && entry.items) {
            this.items = JSON.parse(JSON.stringify(entry.items));
            this.saveToStorage();
            this.render();
            this.updateStats();
            this.closeModal('history-modal');
            this.closeModal('history-detail-modal');
            this.showToast('Lista restaurada', 'success');
        }
    }

    async deleteHistory(id) {
        if (confirm('Excluir do histórico?')) {
            await this.db.deleteHistoryItem(id);
            this.openHistory();
        }
    }

    openShare() {
        const shareText = this.generateShareText();
        document.getElementById('share-text-content').textContent = shareText;
        
        const url = this.generateShareUrl();
        const urlSection = document.getElementById('url-share-section');
        
        if (url && !URLCompressor.checkUrlSize(url)) {
            document.getElementById('share-url').value = url;
            urlSection.style.display = 'block';
        } else {
            urlSection.style.display = 'none';
        }
        
        this.openModal('share-modal');
    }

    generateShareText() {
        if (this.items.length === 0) {
            return 'Lista de Compras\n\nNenhum item.';
        }
        
        const date = new Date().toLocaleString('pt-BR');
        let text = `Lista de Compras - ${date}\n\n`;
        
        const grouped = {};
        this.items.forEach(item => {
            if (!grouped[item.category]) {
                grouped[item.category] = [];
            }
            grouped[item.category].push(item);
        });
        
        const categoryOrder = Object.keys(CONFIG.CATEGORIES);
        
        categoryOrder.forEach(catId => {
            if (grouped[catId]) {
                const cat = CONFIG.CATEGORIES[catId];
                const items = grouped[catId];
                
                text += `${cat.icon} ${cat.name}\n`;
                items.forEach(item => {
                    const status = item.completed ? '[x]' : '[ ]';
                    text += `${status} ${item.name} x${item.quantity}\n`;
                });
                text += '\n';
            }
        });
        
        return text;
    }

    async shareTo(platform) {
        const shareText = this.generateShareText();
        const url = this.generateShareUrl();
        
        switch(platform) {
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                break;
                
            case 'telegram':
                window.open(`https://t.me/share/url?url=${encodeURIComponent(url || '')}&text=${encodeURIComponent(shareText)}`, '_blank');
                break;
                
            case 'email':
                const subject = encodeURIComponent('Lista de Compras');
                const body = encodeURIComponent(shareText + (url ? `\n\nLink: ${url}` : ''));
                window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                break;
                
            case 'copy':
                try {
                    await navigator.clipboard.writeText(shareText);
                    this.showToast('Copiado!', 'success');
                } catch (err) {
                    const textarea = document.createElement('textarea');
                    textarea.value = shareText;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    this.showToast('Copiado!', 'success');
                }
                break;
        }
    }

    copyShareUrl() {
        const input = document.getElementById('share-url');
        input.select();
        
        navigator.clipboard.writeText(input.value).then(() => {
            this.showToast('Link copiado!', 'success');
        });
    }

    // Apenas este método mantém confirmação (para limpar lista toda)
    clearAll() {
        if (this.items.length === 0) {
            this.showToast('Lista já está vazia', 'info');
            return;
        }
        
        if (confirm('Tem certeza que deseja limpar toda a lista?')) {
            this.items = [];
            this.saveToStorage();
            this.render();
            this.updateStats();
            this.showToast('Lista limpa', 'info');
        }
    }

    toggleTheme() {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        
        const icon = document.getElementById('theme-icon');
        icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    openModal(id) {
        document.getElementById(id).classList.add('active');
    }

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check',
            error: 'fa-exclamation',
            info: 'fa-info'
        };
        
        toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 200);
        }, 2500);
    }
}

const app = new DespensaApp();

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('theme-icon').className = 'fas fa-sun';
}

document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});