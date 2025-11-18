// Script JavaScript COMPLETO para preencher TODOS os campos do formulário de criação de contrato
// Use no console do navegador (F12 → Console)
// Versão melhorada com correção para o campo Submercado

(function() {
    console.log('🚀 [Preencher Contrato] Iniciando preenchimento automático do formulário...');
    
    // ============================================
    // CONFIGURAÇÕES - ALTERE OS VALORES AQUI
    // ============================================
    const DADOS = {
        cliente: 'Empresa Teste Automatizada Ltda',
        razaoSocial: 'Empresa Teste Automatizada Ltda - Razão Social',
        cnpj: '12.345.678/0001-90',
        segmento: 'Indústria',
        contato: 'João Silva',
        volume: '1000', // Volume contratado
        volumeUnit: 'MWh', // 'MWh' ou 'MW médio'
        fonteEnergia: 'Incentivada 0%', // 'Incentivada 0%', 'Incentivada 50%', 'Incentivada 100%'
        modalidade: 'Preço Fixo',
        submercado: 'Sudeste/Centro-Oeste', // 'Norte', 'Nordeste', 'Sudeste/Centro-Oeste', 'Sul'
        fornecedor: 'Boven', // Escolha um fornecedor: 'Boven', 'Serena', 'Bolt', 'Matrix', 'Voltta', 'Newave', 'Auren' - OU deixe vazio '' para selecionar o primeiro disponível
        medidor: 'Medidor Teste 001',
        emailBalanco: 'balanco@exemplo.com',
        emailFaturamento: 'faturamento@exemplo.com',
        dataInicio: '2024-01-01', // Formato: YYYY-MM-DD
        dataFim: '2024-12-31', // Formato: YYYY-MM-DD
        limiteSuperior: '200',
        limiteInferior: '0',
        flexibilidade: '100',
        flexSazonalSuperior: '150', // Flexibilidade Sazonalidade - Superior (%)
        flexSazonalInferior: '50', // Flexibilidade Sazonalidade - Inferior (%)
        precoFlat: '350.50', // Preço flat (R$/MWh)
        flatYears: 1, // Número de anos (1 ano, 2 anos, etc.)
        status: 'Contrato Vigente' // 'Contrato Vigente' ou 'Contrato Encerrado'
    };
    
    // ============================================
    // FUNÇÕES AUXILIARES
    // ============================================
    
    function preencherCampo(selector, valor, tipo = 'input') {
        const campo = document.querySelector(selector);
        if (!campo) {
            console.warn(`⚠️ [Preencher Contrato] Campo não encontrado: ${selector}`);
            return false;
        }
        
        campo.value = valor;
        campo.dispatchEvent(new Event(tipo, { bubbles: true }));
        campo.dispatchEvent(new Event('change', { bubbles: true }));
        
        if (tipo === 'input') {
            campo.dispatchEvent(new Event('blur', { bubbles: true }));
        }
        
        console.log(`✅ [Preencher Contrato] Preenchido: ${selector} = ${valor}`);
        return true;
    }
    
    function preencherCampoPorPlaceholder(placeholder, valor) {
        const campo = document.querySelector(`input[placeholder*="${placeholder}"], textarea[placeholder*="${placeholder}"]`);
        if (campo) {
            campo.value = valor;
            campo.dispatchEvent(new Event('input', { bubbles: true }));
            campo.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`✅ [Preencher Contrato] Preenchido (placeholder "${placeholder}"): ${valor}`);
            return true;
        }
        console.warn(`⚠️ [Preencher Contrato] Campo com placeholder "${placeholder}" não encontrado`);
        return false;
    }
    
    function selecionarSelectPorTexto(texto, valorDesejado) {
        const selects = document.querySelectorAll('select');
        
        for (let select of selects) {
            const options = Array.from(select.options);
            const temOpcao = options.some(opt => {
                const text = opt.text.toLowerCase().trim();
                return text.includes(texto.toLowerCase()) || 
                       text === texto.toLowerCase() ||
                       text === valorDesejado.toLowerCase();
            });
            
            if (temOpcao) {
                const opcaoDesejada = options.find(opt => {
                    const text = opt.text.trim();
                    const value = opt.value.trim();
                    return text === valorDesejado || 
                           value === valorDesejado ||
                           text.toLowerCase() === valorDesejado.toLowerCase();
                });
                
                if (opcaoDesejada) {
                    select.value = opcaoDesejada.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    select.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log(`✅ [Preencher Contrato] Select selecionado: ${opcaoDesejada.text}`);
                    return true;
                }
            }
        }
        
        console.warn(`⚠️ [Preencher Contrato] Select com opção "${valorDesejado}" não encontrado`);
        return false;
    }
    
    function encontrarSelectSubmercado() {
        const selects = document.querySelectorAll('select');
        
        for (let select of selects) {
            const options = Array.from(select.options);
            const hasSubmarketOptions = options.some(opt => {
                const text = opt.text.toLowerCase().trim();
                return text === 'norte' || 
                       text === 'nordeste' || 
                       text === 'sudeste/centro-oeste' || 
                       text === 'sul' ||
                       text.includes('submercado');
            });
            
            if (hasSubmarketOptions) {
                return select;
            }
        }
        
        return null;
    }
    
    function encontrarSelectFornecedor() {
        const selects = document.querySelectorAll('select');
        
        for (let select of selects) {
            const options = Array.from(select.options);
            // Fornecedor geralmente tem muitas opções e não tem "Selecione" como primeira
            const hasSupplierOptions = options.length > 1 && 
                options.some(opt => {
                    const text = opt.text.toLowerCase();
                    return text.includes('boven') || 
                           text.includes('fornecedor') ||
                           (text !== '' && text !== 'selecione');
                });
            
            if (hasSupplierOptions) {
                return select;
            }
        }
        
        return null;
    }
    
    function encontrarSelectFonteEnergia() {
        const selects = document.querySelectorAll('select');
        
        for (let select of selects) {
            const options = Array.from(select.options);
            const hasEnergySourceOptions = options.some(opt => {
                const text = opt.text.toLowerCase();
                return text.includes('incentivada') || text.includes('convencional');
            });
            
            if (hasEnergySourceOptions) {
                return select;
            }
        }
        
        return null;
    }
    
    function encontrarSelectVolumeUnit() {
        const selects = document.querySelectorAll('select');
        
        for (let select of selects) {
            const options = Array.from(select.options);
            const hasVolumeUnitOptions = options.some(opt => {
                const text = opt.text.toLowerCase();
                return text.includes('mwh') || text.includes('mw médio');
            });
            
            if (hasVolumeUnitOptions) {
                return select;
            }
        }
        
        return null;
    }
    
    function encontrarSelectStatus() {
        const selects = document.querySelectorAll('select');
        
        for (let select of selects) {
            const options = Array.from(select.options);
            const hasStatusOptions = options.some(opt => {
                const text = opt.text.toLowerCase();
                return text === 'ativo' || text === 'inativo' || text.includes('vigente');
            });
            
            if (hasStatusOptions) {
                return select;
            }
        }
        
        return null;
    }
    
    function encontrarInputsPorTipo(tipo) {
        return Array.from(document.querySelectorAll(`input[type="${tipo}"]`));
    }
    
    function encontrarInputsNumber() {
        return Array.from(document.querySelectorAll('input[type="number"]'));
    }
    
    // ============================================
    // FUNÇÃO PRINCIPAL DE PREENCHIMENTO
    // ============================================
    
    function preencherTodosCampos() {
        let sucesso = true;
        
        // 1. Cliente
        preencherCampoPorPlaceholder('Nome do cliente', DADOS.cliente);
        
        // 2. Razão Social
        preencherCampoPorPlaceholder('Razão social', DADOS.razaoSocial);
        
        // 3. CNPJ
        preencherCampoPorPlaceholder('00.000.000/0000-00', DADOS.cnpj);
        
        // 4. Segmento
        preencherCampoPorPlaceholder('Ex: Indústria', DADOS.segmento);
        
        // 5. Contato responsável
        preencherCampoPorPlaceholder('Nome completo', DADOS.contato);
        
        // 6. Volume contratado
        const numberInputs = encontrarInputsNumber();
        if (numberInputs.length > 0) {
            preencherCampo(numberInputs[0], DADOS.volume, 'input');
        }
        
        // 7. Volume - Unidade (MWh/MW médio)
        const volumeUnitSelect = encontrarSelectVolumeUnit();
        if (volumeUnitSelect) {
            const opcao = Array.from(volumeUnitSelect.options).find(opt => 
                opt.text.includes(DADOS.volumeUnit)
            );
            if (opcao) {
                volumeUnitSelect.value = opcao.value;
                volumeUnitSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✅ [Preencher Contrato] Unidade de volume selecionada: ${opcao.text}`);
            }
        }
        
        // 8. Fonte de energia
        const fonteSelect = encontrarSelectFonteEnergia();
        if (fonteSelect) {
            const opcao = Array.from(fonteSelect.options).find(opt => 
                opt.text.trim() === DADOS.fonteEnergia
            );
            if (opcao) {
                fonteSelect.value = opcao.value;
                fonteSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✅ [Preencher Contrato] Fonte de energia selecionada: ${opcao.text}`);
            }
        }
        
        // 9. Modalidade contratada
        preencherCampoPorPlaceholder('Ex: Preço Fixo', DADOS.modalidade);
        
        // 10. Submercado (CORRIGIDO)
        const submarketSelect = encontrarSelectSubmercado();
        if (submarketSelect) {
            const opcao = Array.from(submarketSelect.options).find(opt => 
                opt.text.trim() === DADOS.submercado || 
                opt.value === DADOS.submercado
            );
            if (opcao) {
                submarketSelect.value = opcao.value;
                submarketSelect.dispatchEvent(new Event('change', { bubbles: true }));
                submarketSelect.dispatchEvent(new Event('input', { bubbles: true }));
                console.log(`✅ [Preencher Contrato] Submercado selecionado: ${opcao.text}`);
            } else {
                console.error(`❌ [Preencher Contrato] Opção de submercado "${DADOS.submercado}" não encontrada`);
                sucesso = false;
            }
        } else {
            console.error('❌ [Preencher Contrato] Select de submercado não encontrado');
            sucesso = false;
        }
        
        // 11. Fornecedor
        const supplierSelect = encontrarSelectFornecedor();
        if (supplierSelect) {
            if (DADOS.fornecedor && DADOS.fornecedor.trim() !== '') {
                // Busca o fornecedor pelo nome (case-insensitive e parcial)
                const opcao = Array.from(supplierSelect.options).find(opt => {
                    const optText = opt.text.trim().toLowerCase();
                    const fornecedorText = DADOS.fornecedor.trim().toLowerCase();
                    return optText === fornecedorText || 
                           optText.includes(fornecedorText) ||
                           fornecedorText.includes(optText);
                });
                if (opcao) {
                    supplierSelect.value = opcao.value;
                    supplierSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    supplierSelect.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log(`✅ [Preencher Contrato] Fornecedor selecionado: ${opcao.text}`);
                } else {
                    console.warn(`⚠️ [Preencher Contrato] Fornecedor "${DADOS.fornecedor}" não encontrado na lista. Opções disponíveis:`, 
                        Array.from(supplierSelect.options).map(o => o.text).join(', '));
                    // Fallback: seleciona o primeiro disponível
                    if (supplierSelect.options.length > 1) {
                        supplierSelect.selectedIndex = 1;
                        supplierSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log(`⚠️ [Preencher Contrato] Selecionado primeiro fornecedor disponível: ${supplierSelect.options[1].text}`);
                    }
                }
            } else {
                // Seleciona o primeiro fornecedor disponível (pula a opção vazia)
                if (supplierSelect.options.length > 1) {
                    supplierSelect.selectedIndex = 1;
                    supplierSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log(`✅ [Preencher Contrato] Fornecedor selecionado (primeiro disponível): ${supplierSelect.options[1].text}`);
                }
            }
        }
        
        // 12. Medidor
        preencherCampoPorPlaceholder('Nome do medidor', DADOS.medidor);
        
        // 13. E-mail do Balanço
        const emailInputs = encontrarInputsPorTipo('email');
        if (emailInputs.length > 0) {
            preencherCampo(emailInputs[0], DADOS.emailBalanco, 'input');
        }
        
        // 14. E-mail de Faturamento
        if (emailInputs.length > 1) {
            preencherCampo(emailInputs[1], DADOS.emailFaturamento, 'input');
        }
        
        // 15. Data início
        const dateInputs = encontrarInputsPorTipo('date');
        if (dateInputs.length > 0) {
            preencherCampo(dateInputs[0], DADOS.dataInicio, 'input');
        }
        
        // 16. Data fim
        if (dateInputs.length > 1) {
            preencherCampo(dateInputs[1], DADOS.dataFim, 'input');
        }
        
        // 17. Limite superior - busca por label
        const limiteSuperiorLabel = Array.from(document.querySelectorAll('label')).find(label => 
            label.textContent.toLowerCase().includes('limite superior')
        );
        if (limiteSuperiorLabel) {
            const input = limiteSuperiorLabel.querySelector('input[type="number"]');
            if (input) {
                preencherCampo(input, DADOS.limiteSuperior, 'input');
            }
        }
        
        // 18. Limite inferior - busca por label
        const limiteInferiorLabel = Array.from(document.querySelectorAll('label')).find(label => 
            label.textContent.toLowerCase().includes('limite inferior')
        );
        if (limiteInferiorLabel) {
            const input = limiteInferiorLabel.querySelector('input[type="number"]');
            if (input) {
                preencherCampo(input, DADOS.limiteInferior, 'input');
            }
        }
        
        // 19. Flexibilidade (%) - busca por label
        const flexibilidadeLabel = Array.from(document.querySelectorAll('label')).find(label => 
            label.textContent.toLowerCase().includes('flexibilidade') && 
            !label.textContent.toLowerCase().includes('sazonal')
        );
        if (flexibilidadeLabel) {
            const input = flexibilidadeLabel.querySelector('input[type="number"]');
            if (input) {
                preencherCampo(input, DADOS.flexibilidade, 'input');
            }
        }
        
        // 20. Flexibilidade Sazonalidade - Superior (%) - busca por label
        const flexSazonalSuperiorLabel = Array.from(document.querySelectorAll('label')).find(label => 
            label.textContent.toLowerCase().includes('sazonal') && 
            label.textContent.toLowerCase().includes('superior')
        );
        if (flexSazonalSuperiorLabel) {
            const input = flexSazonalSuperiorLabel.querySelector('input[type="number"]');
            if (input) {
                preencherCampo(input, DADOS.flexSazonalSuperior, 'input');
            }
        }
        
        // 21. Flexibilidade Sazonalidade - Inferior (%) - busca por label
        const flexSazonalInferiorLabel = Array.from(document.querySelectorAll('label')).find(label => 
            label.textContent.toLowerCase().includes('sazonal') && 
            label.textContent.toLowerCase().includes('inferior')
        );
        if (flexSazonalInferiorLabel) {
            const input = flexSazonalInferiorLabel.querySelector('input[type="number"]');
            if (input) {
                preencherCampo(input, DADOS.flexSazonalInferior, 'input');
            }
        }
        
        // 22. Preço flat (R$/MWh) - busca por label
        const precoFlatLabel = Array.from(document.querySelectorAll('label')).find(label => 
            label.textContent.toLowerCase().includes('preço flat')
        );
        if (precoFlatLabel) {
            const input = precoFlatLabel.querySelector('input');
            if (input) {
                preencherCampo(input, DADOS.precoFlat, 'input');
                input.dispatchEvent(new Event('blur', { bubbles: true }));
                console.log(`✅ [Preencher Contrato] Preço flat preenchido: R$ ${DADOS.precoFlat}`);
            }
        }
        
        // 23. Status - busca por label "Status do Contrato" ou "Status"
        const statusLabel = Array.from(document.querySelectorAll('label')).find(label => 
            label.textContent.toLowerCase().includes('status do contrato') ||
            (label.textContent.toLowerCase().includes('status') && 
             label.querySelector('select'))
        );
        if (statusLabel) {
            const select = statusLabel.querySelector('select');
            if (select) {
                const opcao = Array.from(select.options).find(opt => 
                    opt.text.trim() === DADOS.status ||
                    opt.text.trim().toLowerCase().includes(DADOS.status.toLowerCase())
                );
                if (opcao) {
                    select.value = opcao.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log(`✅ [Preencher Contrato] Status selecionado: ${opcao.text}`);
                }
            }
        } else {
            // Fallback: tenta encontrar qualquer select de status
            const statusSelect = encontrarSelectStatus();
            if (statusSelect) {
                const opcao = Array.from(statusSelect.options).find(opt => 
                    opt.text.trim() === DADOS.status ||
                    opt.text.trim().toLowerCase().includes(DADOS.status.toLowerCase())
                );
                if (opcao) {
                    statusSelect.value = opcao.value;
                    statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log(`✅ [Preencher Contrato] Status selecionado: ${opcao.text}`);
                }
            }
        }
        
        return sucesso;
    }
    
    // ============================================
    // EXECUÇÃO
    // ============================================
    
    // Aguarda um pouco para garantir que o formulário está carregado
    setTimeout(() => {
        const resultado = preencherTodosCampos();
        
        if (resultado) {
            console.log('✅✅✅ [Preencher Contrato] TODOS OS CAMPOS PREENCHIDOS COM SUCESSO! ✅✅✅');
            alert('✅ Formulário preenchido com sucesso!\n\nTodos os campos foram preenchidos.\n\nRevise os dados e clique em "Salvar contrato" quando estiver pronto.');
        } else {
            console.warn('⚠️ [Preencher Contrato] Alguns campos podem não ter sido preenchidos. Verifique os logs acima.');
            alert('⚠️ Formulário preenchido com avisos!\n\nAlguns campos podem não ter sido preenchidos corretamente.\n\nVerifique o console (F12) para mais detalhes.');
        }
    }, 500);
})();

