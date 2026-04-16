// ==========================================
// COMPARTILHAMENTO COM COMPRESSÃO
// ==========================================

function abrirModalCompartilhar() {
    if (itens.length === 0) {
        mostrarToast('Adicione itens à lista antes de compartilhar!');
        return;
    }
    domCache.modalCompartilhar.classList.add('active');
}

function fecharModalCompartilhar() {
    domCache.modalCompartilhar.classList.remove('active');
}

function gerarDadosCompartilhamento() {
    const dadosParaCompartilhar = itens.map(item => ({
        nome: item.nome,
        quantidade: item.quantidade,
        categoria: item.categoria,
        comprado: item.comprado,
        recorrente: item.recorrente
    }));
    
    const jsonString = JSON.stringify(dadosParaCompartilhar);
    const comprimido = LZString.compressToEncodedURIComponent(jsonString);
    const urlCompleta = `${window.location.origin}${window.location.pathname}?d=${comprimido}`;
    
    if (urlCompleta.length > CONFIG.MAX_URL_LENGTH) {
        mostrarToast(`Lista muito grande (${itens.length} itens). Limite: ${CONFIG.MAX_ITEMS} itens.`);
        return null;
    }
    
    return urlCompleta;
}

function gerarTextoLista() {
    const itensPendentes = itens.filter(i => !i.comprado);
    const itensComprados = itens.filter(i => i.comprado);
    
    let texto = `*LISTA DE COMPRAS*\n`;
    texto += `==================\n\n`;
    
    if (itensPendentes.length > 0) {
        texto += `*PENDENTES (${itensPendentes.length} itens):*\n\n`;
        const categorias = ['Alimentos', 'Limpeza', 'Higiene', 'Outros'];
        
        categorias.forEach(cat => {
            const itensCat = itensPendentes.filter(i => i.categoria === cat);
            if (itensCat.length > 0) {
                texto += `*[ ${cat.toUpperCase()} ]*\n`;
                itensCat.forEach(item => {
                    texto += `  • ${item.nome} - ${item.quantidade}\n`;
                });
                texto += `\n`;
            }
        });
    }
    
    if (itensComprados.length > 0) {
        texto += `*COMPRADOS (${itensComprados.length} itens):*\n`;
        itensComprados.forEach(item => {
            texto += `  • ~${item.nome}~\n`;
        });
        texto += `\n`;
    }
    
    return texto;
}

function compartilharWhatsApp() {
    const texto = gerarTextoLista();
    const link = gerarDadosCompartilhamento();
    
    let textoCompleto = texto;
    
    if (link) {
        textoCompleto += `*LINK DA LISTA:*\n${link}`;
    } else {
        textoCompleto += `Lista muito grande para gerar link (${itens.length}/${CONFIG.MAX_ITEMS} itens)`;
    }
    
    const url = `https://wa.me/?text=${encodeURIComponent(textoCompleto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    
    fecharModalCompartilhar();
    mostrarToast('Abrindo WhatsApp...');
}

function compartilharEmail() {
    const texto = gerarTextoLista();
    const link = gerarDadosCompartilhamento();
    const assunto = `Lista de Compras`;
    
    let corpo = texto;
    
    if (link) {
        corpo += `\n*LINK DA LISTA:*\n${link}`;
    } else {
        corpo += `\nLista muito grande para compartilhar via link (${itens.length} itens)`;
    }
    
    corpo += '\n\n---\nEnviado via Lista de Compras';
    
    window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    
    fecharModalCompartilhar();
    mostrarToast('Abrindo aplicativo de e-mail...');
}

async function compartilharOutros() {
    const link = gerarDadosCompartilhamento();
    const texto = gerarTextoLista();
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Lista de Compras',
                text: texto.replace(/\*/g, ''),
                url: link || undefined
            });
            fecharModalCompartilhar();
            mostrarToast('Lista compartilhada!');
            return;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Erro no share:', err);
            }
        }
    }
    
    try {
        const textoCompartilhar = link 
            ? `${texto}\n\nLink: ${link}`
            : texto;
        await navigator.clipboard.writeText(textoCompartilhar);
        fecharModalCompartilhar();
        mostrarToast(link ? 'Link copiado!' : 'Texto copiado (lista muito grande para link)!');
    } catch (err) {
        mostrarToast('Não foi possível compartilhar');
        fecharModalCompartilhar();
    }
}

async function copiarLink() {
    const link = gerarDadosCompartilhamento();
    
    if (!link) {
        mostrarToast('Lista muito grande. Não é possível gerar link.');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(link);
        fecharModalCompartilhar();
        mostrarToast('Link copiado para a área de transferência!');
    } catch (err) {
        mostrarToast('Não foi possível copiar automaticamente');
    }
}