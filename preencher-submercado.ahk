; Script AutoHotkey para preencher o campo Submercado no formulário de criação de contrato
; Este script funciona de forma independente e não altera o código do site

; ============================================
; CONFIGURAÇÕES
; ============================================
; Altere o valor abaixo para o submercado desejado:
; Opções: "Norte", "Nordeste", "Sudeste/Centro-Oeste", "Sul"
SubmercadoDesejado := "Sudeste/Centro-Oeste"

; ============================================
; FUNÇÃO: Copiar código JavaScript para clipboard
; ============================================
CopiarCodigoJavaScript() {
    ; Código JavaScript que será copiado
    jsCode := "(function(){`n"
    jsCode .= "    const SUBMERCADO_DESEJADO = '" . SubmercadoDesejado . "';`n"
    jsCode .= "    const selects = document.querySelectorAll('select');`n"
    jsCode .= "    let submarketSelect = null;`n"
    jsCode .= "    for (let select of selects) {`n"
    jsCode .= "        const options = Array.from(select.options);`n"
    jsCode .= "        const hasSubmarketOptions = options.some(opt => {`n"
    jsCode .= "            const text = opt.text.toLowerCase().trim();`n"
    jsCode .= "            return text === 'norte' || text === 'nordeste' || text === 'sudeste/centro-oeste' || text === 'sul';`n"
    jsCode .= "        });`n"
    jsCode .= "        if (hasSubmarketOptions) { submarketSelect = select; break; }`n"
    jsCode .= "    }`n"
    jsCode .= "    if (!submarketSelect) { alert('Campo Submercado não encontrado!'); return false; }`n"
    jsCode .= "    const opcaoDesejada = Array.from(submarketSelect.options).find(opt => opt.text.trim() === SUBMERCADO_DESEJADO);`n"
    jsCode .= "    if (!opcaoDesejada) { alert('Opção não encontrada!'); return false; }`n"
    jsCode .= "    submarketSelect.value = opcaoDesejada.value;`n"
    jsCode .= "    submarketSelect.dispatchEvent(new Event('change', { bubbles: true }));`n"
    jsCode .= "    submarketSelect.dispatchEvent(new Event('input', { bubbles: true }));`n"
    jsCode .= "    submarketSelect.focus();`n"
    jsCode .= "    console.log('✅ Submercado selecionado: ' + opcaoDesejada.text);`n"
    jsCode .= "    return true;`n"
    jsCode .= "})();"
    
    Clipboard := jsCode
    return jsCode
}

; ============================================
; FUNÇÃO: Abrir console do navegador e colar código
; ============================================
ExecutarPreenchimento() {
    ; Copia o código JavaScript
    jsCode := CopiarCodigoJavaScript()
    
    ; Mostra instruções
    MsgBox, 4, AutoHotkey - Preencher Submercado, 
    (LTrim
        Submercado configurado: %SubmercadoDesejado%
        
        O código JavaScript foi copiado para a área de transferência.
        
        Instruções:
        1. Certifique-se de que o formulário de criação de contrato está aberto
        2. Abra o console do navegador (F12)
        3. Cole o código (Ctrl+V)
        4. Pressione Enter
        
        Deseja que eu tente abrir o console automaticamente?
    )
    
    IfMsgBox Yes
    {
        ; Tenta abrir o console do navegador
        ; Pressiona F12 para abrir DevTools
        Send, {F12}
        Sleep, 500
        
        ; Tenta focar no console
        Send, ^+j  ; Ctrl+Shift+J (Chrome/Edge)
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
    CopiarCodigoJavaScript()
    ToolTip, Código JavaScript copiado para a área de transferência!
    Sleep, 2000
    ToolTip
    return

; ============================================
; MENSAGEM INICIAL
; ============================================
MsgBox, 0, AutoHotkey - Preencher Submercado, 
(LTrim
    Script AutoHotkey para preencher campo Submercado
    
    Submercado configurado: %SubmercadoDesejado%
    
    Hotkeys:
    - F8: Executar preenchimento (abre console e cola código)
    - F9: Apenas copiar código JavaScript
    
    O código será copiado para a área de transferência.
    Cole no console do navegador (F12) e pressione Enter.
), 5
