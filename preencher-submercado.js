// Script JavaScript para preencher o campo Submercado no formulário de criação de contrato
// Use este código no console do navegador (F12 → Console)

(function() {
    console.log('🔍 [Preencher Submercado] Iniciando...');
    
    // CONFIGURAÇÃO: Altere este valor para o submercado desejado
    const SUBMERCADO_DESEJADO = 'Sudeste/Centro-Oeste'; // Opções: 'Norte', 'Nordeste', 'Sudeste/Centro-Oeste', 'Sul'
    
    // Encontra todos os selects na página
    const selects = document.querySelectorAll('select');
    let submarketSelect = null;
    
    console.log(`📋 [Preencher Submercado] Encontrados ${selects.length} selects na página`);
    
    // Procura o select de submercado
    for (let select of selects) {
        const options = Array.from(select.options);
        
        // Verifica se este select tem opções de submercado
        const hasSubmarketOptions = options.some(opt => {
            const text = opt.text.toLowerCase().trim();
            return text === 'norte' || 
                   text === 'nordeste' || 
                   text === 'sudeste/centro-oeste' || 
                   text === 'sul' ||
                   text.includes('submercado');
        });
        
        if (hasSubmarketOptions) {
            submarketSelect = select;
            console.log('✅ [Preencher Submercado] Select de submercado encontrado!');
            console.log('📋 [Preencher Submercado] Opções disponíveis:', options.map(o => o.text).join(', '));
            break;
        }
    }
    
    if (!submarketSelect) {
        console.error('❌ [Preencher Submercado] Select de submercado não encontrado!');
        console.log('💡 [Preencher Submercado] Verifique se o formulário está aberto e carregado.');
        alert('Erro: Campo Submercado não encontrado no formulário.\n\nVerifique se o modal de criação de contrato está aberto.');
        return false;
    }
    
    // Procura a opção desejada
    const opcoes = Array.from(submarketSelect.options);
    const opcaoDesejada = opcoes.find(opt => {
        const text = opt.text.trim();
        const value = opt.value.trim();
        return text === SUBMERCADO_DESEJADO || 
               value === SUBMERCADO_DESEJADO ||
               text.toLowerCase() === SUBMERCADO_DESEJADO.toLowerCase();
    });
    
    if (!opcaoDesejada) {
        console.error(`❌ [Preencher Submercado] Opção "${SUBMERCADO_DESEJADO}" não encontrada!`);
        console.log('📋 [Preencher Submercado] Opções disponíveis:', opcoes.map(o => `"${o.text}"`).join(', '));
        alert(`Erro: Opção "${SUBMERCADO_DESEJADO}" não encontrada no select.\n\nOpções disponíveis:\n${opcoes.map(o => `- ${o.text}`).join('\n')}`);
        return false;
    }
    
    // Seleciona a opção
    submarketSelect.value = opcaoDesejada.value;
    
    // Dispara eventos para garantir que o React detecte a mudança
    submarketSelect.dispatchEvent(new Event('change', { bubbles: true }));
    submarketSelect.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Força o foco no select para garantir que está ativo
    submarketSelect.focus();
    
    // Verifica se foi selecionado corretamente
    const valorSelecionado = submarketSelect.options[submarketSelect.selectedIndex];
    if (valorSelecionado && valorSelecionado.text === SUBMERCADO_DESEJADO) {
        console.log(`✅ [Preencher Submercado] Submercado selecionado com sucesso: "${valorSelecionado.text}"`);
        return true;
    } else {
        console.error(`❌ [Preencher Submercado] Falha ao selecionar submercado. Valor atual: "${valorSelecionado ? valorSelecionado.text : 'nenhum'}"`);
        return false;
    }
})();

