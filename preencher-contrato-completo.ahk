; Script AutoHotkey para preencher TODOS os campos do formulário de criação de contrato
; Este script funciona de forma independente e não altera o código do site

; ============================================
; CONFIGURAÇÕES - ALTERE OS VALORES AQUI
; ============================================
DADOS_cliente := "Empresa Teste Automatizada Ltda"
DADOS_razaoSocial := "Empresa Teste Automatizada Ltda - Razão Social"
DADOS_cnpj := "12.345.678/0001-90"
DADOS_segmento := "Indústria"
DADOS_contato := "João Silva"
DADOS_volume := "1000"
DADOS_volumeUnit := "MWh"  ; "MWh" ou "MW médio"
DADOS_fonteEnergia := "Incentivada 0%"  ; "Incentivada 0%", "Incentivada 50%", "Incentivada 100%"
DADOS_modalidade := "Preço Fixo"
DADOS_submercado := "Sudeste/Centro-Oeste"  ; "Norte", "Nordeste", "Sudeste/Centro-Oeste", "Sul"
DADOS_fornecedor := "Boven"  ; Escolha um fornecedor da lista: "Boven", "Serena", "Bolt", "Matrix", "Voltta", "Newave", "Auren" - OU deixe vazio "" para selecionar o primeiro disponível
DADOS_medidor := "Medidor Teste 001"
DADOS_emailBalanco := "balanco@teste.com.br"
DADOS_emailFaturamento := "faturamento@teste.com.br"
DADOS_dataInicio := "2024-01-01"  ; Formato: YYYY-MM-DD
DADOS_dataFim := "2024-12-31"  ; Formato: YYYY-MM-DD
DADOS_limiteSuperior := "200"
DADOS_limiteInferior := "0"
DADOS_flexibilidade := "100"
DADOS_flexSaz                   onalSuperior := "150"
DADOS_flexSazonalInferior := "50"
DADOS_precoFlat := "350.50"
DADOS_flatYears := "1"
DADOS_status := "Ativo"  ; "Ativo" ou "Inativo"

; ============================================
; FUNÇÃO: Gerar código JavaScript completo
; ============================================
GerarCodigoJavaScript() {
    ; Lê o arquivo JavaScript completo
    FileRead, jsCode, preencher-contrato-completo.js
    
    ; Se não conseguir ler o arquivo, gera o código inline
    if (ErrorLevel) {
        ; Gera código JavaScript inline com os dados configurados
        jsCode := "(function(){`n"
        jsCode .= "    const DADOS = {`n"
        jsCode .= "        cliente: '" . DADOS_cliente . "',`n"
        jsCode .= "        razaoSocial: '" . DADOS_razaoSocial . "',`n"
        jsCode .= "        cnpj: '" . DADOS_cnpj . "',`n"
        jsCode .= "        segmento: '" . DADOS_segmento . "',`n"
        jsCode .= "        contato: '" . DADOS_contato . "',`n"
        jsCode .= "        volume: '" . DADOS_volume . "',`n"
        jsCode .= "        volumeUnit: '" . DADOS_volumeUnit . "',`n"
        jsCode .= "        fonteEnergia: '" . DADOS_fonteEnergia . "',`n"
        jsCode .= "        modalidade: '" . DADOS_modalidade . "',`n"
        jsCode .= "        submercado: '" . DADOS_submercado . "',`n"
        jsCode .= "        fornecedor: '" . DADOS_fornecedor . "',`n"
        jsCode .= "        medidor: '" . DADOS_medidor . "',`n"
        jsCode .= "        emailBalanco: '" . DADOS_emailBalanco . "',`n"
        jsCode .= "        emailFaturamento: '" . DADOS_emailFaturamento . "',`n"
        jsCode .= "        dataInicio: '" . DADOS_dataInicio . "',`n"
        jsCode .= "        dataFim: '" . DADOS_dataFim . "',`n"
        jsCode .= "        limiteSuperior: '" . DADOS_limiteSuperior . "',`n"
        jsCode .= "        limiteInferior: '" . DADOS_limiteInferior . "',`n"
        jsCode .= "        flexibilidade: '" . DADOS_flexibilidade . "',`n"
        jsCode .= "        flexSazonalSuperior: '" . DADOS_flexSazonalSuperior . "',`n"
        jsCode .= "        flexSazonalInferior: '" . DADOS_flexSazonalInferior . "',`n"
        jsCode .= "        precoFlat: '" . DADOS_precoFlat . "',`n"
        jsCode .= "        flatYears: " . DADOS_flatYears . ",`n"
        jsCode .= "        status: '" . DADOS_status . "'`n"
        jsCode .= "    };`n"
        jsCode .= "    console.log('🚀 [Preencher Contrato] Iniciando...');`n"
        jsCode .= "    // ... resto do código ...`n"
        jsCode .= "})();"
    }
    
    return jsCode
}

; ============================================
; FUNÇÃO: Executar preenchimento
; ============================================
ExecutarPreenchimento() {
    ; Tenta ler o arquivo JavaScript
    FileRead, jsCode, preencher-contrato-completo.js
    
    if (ErrorLevel) {
        MsgBox, 16, Erro, Arquivo preencher-contrato-completo.js não encontrado!`n`nCertifique-se de que o arquivo está na mesma pasta do script AutoHotkey.
        return
    }
    
    ; Copia o código para a área de transferência
    Clipboard := jsCode
    
    ; Mostra instruções
    MsgBox, 4, AutoHotkey - Preencher Contrato Completo, 
    (LTrim
        Código JavaScript copiado para a área de transferência!
        
        Instruções:
        1. Certifique-se de que o formulário de criação de contrato está aberto
        2. Abra o console do navegador (F12)
        3. Vá para a aba "Console"
        4. Cole o código (Ctrl+V)
        5. Pressione Enter
        
        Deseja que eu tente abrir o console automaticamente?
    )
    
    IfMsgBox Yes
    {
        ; Tenta abrir o console do navegador
        Send, {F12}
        Sleep, 500
        
        ; Tenta focar no console (Ctrl+Shift+J no Chrome/Edge)
        Send, ^+j
        Sleep, 300
        
        ; Cola o código
        Send, ^v
        Sleep, 200
        
        ; Pressiona Enter
        Send, {Enter}
        
        ToolTip, Código executado! Verifique o console.
        Sleep, 2000
        ToolTip
    }
    else
    {
        ToolTip, Código copiado! Cole no console do navegador (F12).
        Sleep, 2000
        ToolTip
    }
}

; ============================================
; HOTKEY: F8 para executar
; ============================================
F8::
    ExecutarPreenchimento()
    return

; ============================================
; HOTKEY: F9 para apenas copiar código
; ============================================
F9::
    FileRead, jsCode, preencher-contrato-completo.js
    if (!ErrorLevel) {
        Clipboard := jsCode
        ToolTip, Código JavaScript copiado para a área de transferência!
        Sleep, 2000
        ToolTip
    } else {
        MsgBox, 16, Erro, Arquivo preencher-contrato-completo.js não encontrado!
    }
    return

; ============================================
; MENSAGEM INICIAL
; ============================================
MsgBox, 0, AutoHotkey - Preencher Contrato Completo, 
(LTrim
    Script AutoHotkey para preencher TODOS os campos do formulário
    
    Configurações atuais:
    - Cliente: %DADOS_cliente%
    - Submercado: %DADOS_submercado%
    - Fornecedor: %DADOS_fornecedor%
    - Volume: %DADOS_volume% %DADOS_volumeUnit%
    
    Hotkeys:
    - F8: Executar preenchimento (abre console e cola código)
    - F9: Apenas copiar código JavaScript
    
    O código será copiado para a área de transferência.
    Cole no console do navegador (F12) e pressione Enter.
    
    IMPORTANTE: Certifique-se de que o arquivo
    preencher-contrato-completo.js está na mesma pasta!
), 8

