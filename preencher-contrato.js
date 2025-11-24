// Script JavaScript para preencher TODOS os campos do formulário de criação de contrato
// Use no console do navegador (F12 → Console) ou com ferramentas de automação

function preencherTodosCamposContrato() {
    console.log('🚀 Iniciando preenchimento automático do formulário...');
    
    // Função auxiliar para preencher campo e disparar eventos
    function preencherCampo(selector, valor, evento = 'input') {
        const campo = document.querySelector(selector);
        if (campo) {
            campo.value = valor;
            campo.dispatchEvent(new Event(evento, { bubbles: true }));
            campo.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`✅ Preenchido: ${selector} = ${valor}`);
            return true;
        }
        console.warn(`⚠️ Campo não encontrado: ${selector}`);
        return false;
    }
    
    // Função para selecionar em dropdown
    function selecionarDropdown(selector, textoOuIndice) {
        const select = document.querySelector(selector);
        if (select) {
            if (typeof textoOuIndice === 'number') {
                select.selectedIndex = textoOuIndice;
            } else {
                const options = Array.from(select.options);
                const option = options.find(opt => opt.text.includes(textoOuIndice) || opt.value === textoOuIndice);
                if (option) {
                    select.value = option.value;
                }
            }
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`✅ Selecionado: ${selector} = ${select.options[select.selectedIndex]?.text}`);
            return true;
        }
        console.warn(`⚠️ Select não encontrado: ${selector}`);
        return false;
    }
    
    // Aguarda um pouco para garantir que o formulário está carregado
    setTimeout(() => {
        // ========== DADOS DO CONTRATO ==========
        
        // 1. Cliente
        preencherCampo('input[placeholder*="Nome do cliente"]', 'Empresa Teste Automatizada Ltda');
        
        setTimeout(() => {
            // 2. Razão Social
            preencherCampo('input[placeholder*="Razão social"]', 'Empresa Teste Automatizada Ltda - Razão Social');
            
            setTimeout(() => {
                // 3. CNPJ
                preencherCampo('input[placeholder*="00.000.000/0000-00"]', '12.345.678/0001-90');
                
                setTimeout(() => {
                    // 4. Segmento
                    preencherCampo('input[placeholder*="Ex: Indústria"]', 'Indústria');
                    
                    setTimeout(() => {
                        // 5. Contato responsável
                        preencherCampo('input[placeholder*="Nome completo"]', 'João Silva');
                        
                        setTimeout(() => {
                            // 6. Volume contratado
                            const volumeInputs = document.querySelectorAll('input[type="number"][min="0"]');
                            if (volumeInputs.length > 0) {
                                preencherCampo(volumeInputs[0], '1000');
                            }
                            
                            // Volume - Unidade (MWh/MW médio) - já vem MWh por padrão
                            const volumeSelect = document.querySelector('select');
                            if (volumeSelect && volumeSelect.options.length > 0) {
                                // Pode deixar como está (MWh) ou mudar para MW médio
                                // volumeSelect.selectedIndex = 1; // Para MW médio
                            }
                            
                            setTimeout(() => {
                                // 7. Fonte de energia (select)
                                const selects = document.querySelectorAll('select');
                                if (selects.length > 0) {
                                    // Já vem "Incentivada 0%" por padrão, mas podemos garantir
                                    // selecionarDropdown(selects[0], 'Incentivada 0%');
                                }
                                
                                setTimeout(() => {
                                    // 8. Modalidade contratada
                                    preencherCampo('input[placeholder*="Ex: Preço Fixo"]', 'Preço Fixo');
                                    
                                    setTimeout(() => {
                                        // 9. Submercado (select)
                                        const submarketSelect = Array.from(document.querySelectorAll('select')).find(select => {
                                            const options = Array.from(select.options);
                                            return options.some(opt => opt.text.includes('Submercado') || opt.text.includes('Norte') || opt.text.includes('Sudeste'));
                                        });
                                        if (submarketSelect) {
                                            // Seleciona "Sudeste/Centro-Oeste"
                                            const sudesteOption = Array.from(submarketSelect.options).find(opt => opt.text.includes('Sudeste'));
                                            if (sudesteOption) {
                                                submarketSelect.value = sudesteOption.value;
                                                submarketSelect.dispatchEvent(new Event('change', { bubbles: true }));
                                                console.log('✅ Submercado selecionado: Sudeste/Centro-Oeste');
                                            }
                                        }
                                        
                                        setTimeout(() => {
                                            // 10. Fornecedor (select)
                                            const supplierSelect = Array.from(document.querySelectorAll('select')).find(select => {
                                                const options = Array.from(select.options);
                                                return options.some(opt => opt.text.includes('Fornecedor') || opt.value !== '');
                                            });
                                            if (supplierSelect && supplierSelect.options.length > 1) {
                                                supplierSelect.selectedIndex = 1; // Primeiro fornecedor disponível
                                                supplierSelect.dispatchEvent(new Event('change', { bubbles: true }));
                                                console.log('✅ Fornecedor selecionado');
                                            }
                                            
                                            setTimeout(() => {
                                                // 11. Medidor
                                                preencherCampo('input[placeholder*="Nome do medidor"]', 'Medidor Teste 001');
                                                
                                                setTimeout(() => {
                                                    // 12. E-mail do Balanço
                                                    const emailInputs = document.querySelectorAll('input[type="email"]');
                                                    if (emailInputs.length > 0) {
                                                        preencherCampo(emailInputs[0], 'balanco@teste.com.br');
                                                    }
                                                    
                                                    setTimeout(() => {
                                                        // 13. E-mail de Faturamento
                                                        if (emailInputs.length > 1) {
                                                            preencherCampo(emailInputs[1], 'faturamento@teste.com.br');
                                                        }
                                                        
                                                        setTimeout(() => {
                                                            // 14. Data início
                                                            const dateInputs = document.querySelectorAll('input[type="date"]');
                                                            if (dateInputs.length > 0) {
                                                                preencherCampo(dateInputs[0], '2024-01-01');
                                                            }
                                                            
                                                            setTimeout(() => {
                                                                // 15. Data fim
                                                                if (dateInputs.length > 1) {
                                                                    preencherCampo(dateInputs[1], '2024-12-31');
                                                                }
                                                                
                                                                setTimeout(() => {
                                                                    // 16. Limite superior
                                                                    const numberInputs = document.querySelectorAll('input[type="number"]');
                                                                    let inputIndex = 0;
                                                                    // Pula volume, encontra limite superior
                                                                    if (numberInputs.length > 3) {
                                                                        numberInputs[3].value = '200';
                                                                        numberInputs[3].dispatchEvent(new Event('input', { bubbles: true }));
                                                                        numberInputs[3].dispatchEvent(new Event('change', { bubbles: true }));
                                                                        console.log('✅ Limite superior: 200');
                                                                    }
                                                                    
                                                                    setTimeout(() => {
                                                                        // 17. Limite inferior
                                                                        if (numberInputs.length > 4) {
                                                                            numberInputs[4].value = '0';
                                                                            numberInputs[4].dispatchEvent(new Event('input', { bubbles: true }));
                                                                            numberInputs[4].dispatchEvent(new Event('change', { bubbles: true }));
                                                                            console.log('✅ Limite inferior: 0');
                                                                        }
                                                                        
                                                                        setTimeout(() => {
                                                                            // 18. Flexibilidade (%)
                                                                            if (numberInputs.length > 5) {
                                                                                numberInputs[5].value = '100';
                                                                                numberInputs[5].dispatchEvent(new Event('input', { bubbles: true }));
                                                                                numberInputs[5].dispatchEvent(new Event('change', { bubbles: true }));
                                                                                console.log('✅ Flexibilidade: 100%');
                                                                            }
                                                                            
                                                                            setTimeout(() => {
                                                                                // 19. Flexibilidade Sazonalidade - Superior (%)
                                                                                if (numberInputs.length > 6) {
                                                                                    numberInputs[6].value = '150';
                                                                                    numberInputs[6].dispatchEvent(new Event('input', { bubbles: true }));
                                                                                    numberInputs[6].dispatchEvent(new Event('change', { bubbles: true }));
                                                                                    console.log('✅ Flex Sazonal Superior: 150%');
                                                                                }
                                                                                
                                                                                setTimeout(() => {
                                                                                    // 20. Flexibilidade Sazonalidade - Inferior (%)
                                                                                    if (numberInputs.length > 7) {
                                                                                        numberInputs[7].value = '50';
                                                                                        numberInputs[7].dispatchEvent(new Event('input', { bubbles: true }));
                                                                                        numberInputs[7].dispatchEvent(new Event('change', { bubbles: true }));
                                                                                        console.log('✅ Flex Sazonal Inferior: 50%');
                                                                                    }
                                                                                    
                                                                                    setTimeout(() => {
                                                                                        // 21. Preço flat (R$/MWh)
                                                                                        const precoInput = document.querySelector('input[placeholder*="0,00"]');
                                                                                        if (precoInput) {
                                                                                            precoInput.value = '350.50';
                                                                                            precoInput.dispatchEvent(new Event('input', { bubbles: true }));
                                                                                            precoInput.dispatchEvent(new Event('blur', { bubbles: true }));
                                                                                            console.log('✅ Preço flat: R$ 350,50');
                                                                                        }
                                                                                        
                                                                                        // 22. Preço flat - Anos (select) - já vem 1 ano por padrão
                                                                                        const anosSelect = Array.from(document.querySelectorAll('select')).find(select => {
                                                                                            const options = Array.from(select.options);
                                                                                            return options.some(opt => opt.text.includes('ano'));
                                                                                        });
                                                                                        if (anosSelect) {
                                                                                            // Já vem 1 ano, mas podemos garantir
                                                                                            // anosSelect.selectedIndex = 0;
                                                                                        }
                                                                                        
                                                                                        // 23. Status (select) - já vem "Ativo" por padrão
                                                                                        const statusSelect = Array.from(document.querySelectorAll('select')).find(select => {
                                                                                            const options = Array.from(select.options);
                                                                                            return options.some(opt => opt.text.includes('Vigente') || opt.text.includes('encerrado'));
                                                                                        });
                                                                                        if (statusSelect) {
                                                                                            // Já vem "Ativo" por padrão
                                                                                            // statusSelect.selectedIndex = 0;
                                                                                        }
                                                                                        
                                                                                        setTimeout(() => {
                                                                                            console.log('✅✅✅ TODOS OS CAMPOS PREENCHIDOS COM SUCESSO! ✅✅✅');
                                                                                            alert('✅ Formulário preenchido com sucesso!\n\nTodos os campos foram preenchidos.\n\nRevise os dados e clique em "Salvar contrato" quando estiver pronto.');
                                                                                        }, 300);
                                                                                    }, 300);
                                                                                }, 300);
                                                                            }, 300);
                                                                        }, 300);
                                                                    }, 300);
                                                                }, 300);
                                                            }, 300);
                                                        }, 300);
                                                    }, 300);
                                                }, 300);
                                            }, 300);
                                        }, 300);
                                    }, 300);
                                }, 300);
                            }, 300);
                        }, 300);
                    }, 300);
                }, 300);
            }, 300);
        }, 300);
    }, 500);
}

// Executa o preenchimento
preencherTodosCamposContrato();
