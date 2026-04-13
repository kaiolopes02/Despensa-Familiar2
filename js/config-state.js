// ==========================================
// CONFIGURAÇÕES E CONSTANTES DE SEGURANÇA
// ==========================================

const CONFIG = {
    MAX_ITEM_LENGTH: 100,
    MAX_QTD_LENGTH: 50,
    MAX_ITEMS: 200, // Suporte até 200 itens
    MAX_URL_LENGTH: 8000, // Limite conservador para compatibilidade
    STORAGE_KEY: 'listaCompras_v1',
    FAVORITOS_KEY: 'favoritosCompras_v1',
    CATEGORIAS_VALIDAS: ['Alimentos', 'Limpeza', 'Higiene', 'Outros']
};

// ==========================================
// DADOS E ESTADO
// ==========================================

let itens = [];
let favoritos = [];
let filtroAtual = 'todos';
let modoSair = false;
let domCache = {};