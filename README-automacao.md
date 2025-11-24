# Scripts de Automação para Preenchimento de Contrato

Scripts para automatizar o preenchimento do formulário de criação de contrato manual.

## Opção 1: AutoHotkey (Windows)

### Instalação
1. Baixe e instale o AutoHotkey: https://www.autohotkey.com/
2. Execute o arquivo `preencher-contrato.ahk`
3. O script ficará rodando em background

### Uso
1. Abra o portal e clique para criar um novo contrato
2. Quando o formulário estiver aberto, pressione **Ctrl+Shift+C**
3. O formulário será preenchido automaticamente

### Personalização
Edite o arquivo `preencher-contrato.ahk` para alterar:
- A hotkey (linha 4: `^+c::` - mude para outra combinação)
- Os valores preenchidos (edite os `SendInput`)

## Opção 2: JavaScript no Console do Navegador

### Uso
1. Abra o portal e clique para criar um novo contrato
2. Abra o Console do navegador (F12 → Console)
3. Copie e cole o conteúdo do arquivo `preencher-contrato.js`
4. Pressione Enter
5. O formulário será preenchido automaticamente

### Vantagens
- Não precisa instalar nada
- Funciona em qualquer navegador
- Fácil de personalizar

## Opção 3: Keyboard Maestro / Alfred (Mac)

Use o script JavaScript adaptado para sua ferramenta de automação preferida.

## Dados Preenchidos (TODOS OS CAMPOS)

### Dados do Contrato
1. **Cliente**: Empresa Teste Automatizada Ltda
2. **Razão Social**: Empresa Teste Automatizada Ltda - Razão Social
3. **CNPJ**: 12.345.678/0001-90
4. **Segmento**: Indústria
5. **Contato responsável**: João Silva
6. **Volume contratado**: 1000 MWh
7. **Fonte de energia**: Incentivada 0% (padrão)
8. **Modalidade contratada**: Preço Fixo
9. **Submercado**: Sudeste/Centro-Oeste
10. **Fornecedor**: Primeiro da lista
11. **Medidor**: Medidor Teste 001
12. **E-mail do Balanço**: balanco@teste.com.br
13. **E-mail de Faturamento**: faturamento@teste.com.br
14. **Ciclo de vigência - Início**: 2024-01-01
15. **Ciclo de vigência - Fim**: 2024-12-31
16. **Limite superior**: 200%
17. **Limite inferior**: 0%
18. **Flexibilidade (%)**: 100%
19. **Flexibilidade Sazonalidade - Superior (%)**: 150%
20. **Flexibilidade Sazonalidade - Inferior (%)**: 50%
21. **Preço flat (R$/MWh)**: R$ 350,50
22. **Preço flat - Anos**: 1 ano (padrão)

### Status do Contrato
23. **Status**: Ativo (padrão)

## Notas

- Os scripts preenchem os campos, mas **você precisa clicar em "Salvar contrato" manualmente**
- Revise os dados antes de salvar
- Ajuste os valores conforme necessário editando os scripts

