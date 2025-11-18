# Migração para Variáveis de Ambiente

## ✅ Alterações Realizadas

Todas as URLs hardcoded foram removidas e centralizadas no arquivo `.env`.

### Arquivos Atualizados:

1. **`src/config/api.ts`** - Configuração centralizada
   - Agora lê todas as URLs do `.env`
   - Exporta constantes para uso em todo o projeto

2. **`src/lib/apiClient.ts`** - Cliente HTTP
   - Usa `API_BASE_URL` do config
   - Removida URL hardcoded

3. **`src/services/energyBalanceApi.ts`** - API de balanço energético
   - Usa `ENERGY_BALANCE_WEBHOOK_URL` do config
   - Removida URL hardcoded do webhook

4. **`src/services/contracts.ts`** - API de contratos
   - Removido log com URL hardcoded

5. **`src/pages/contratos/ContractsContext.tsx`** - Context de contratos
   - Usa `API_BASE_URL` do config
   - Removida URL hardcoded

6. **`src/services/leadSimulationApi.ts`** - API de simulação
   - Usa `LEAD_SIMULATION_WEBHOOK_URL` do config
   - Removida URL hardcoded

7. **`src/components/UploadXLSX.tsx`** - Upload de arquivos
   - Usa `INVOICE_WEBHOOK_URL` do config
   - Removida URL hardcoded

8. **`src/pages/InvoiceProcessingPage.tsx`** - Processamento de faturas
   - Usa `IDP_API_URL` do config
   - Removida URL hardcoded

## 📝 Arquivo .env

Crie o arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
# Configuração de URLs da API
# Este arquivo contém as configurações atuais do ambiente

# URL base da API de balanço energético e contratos
VITE_API_BASE_URL=https://cec49efdc912.ngrok-free.app

# URL do webhook N8N para envio de emails de balanço
VITE_ENERGY_BALANCE_WEBHOOK=https://n8n.ynovamarketplace.com/webhook-test/email-balanco-unico

# URL do webhook N8N para processamento de faturas
VITE_INVOICE_WEBHOOK=https://n8n.ynovamarketplace.com/webhook-test/8d7b84b3-f20d-4374-a812-76db38ebc77d

# URL do webhook N8N para simulação de leads
VITE_LEAD_SIMULATION_WEBHOOK=https://n8n.ynovamarketplace.com/webhook/mockBalancoEnergetico

# URL da API de autenticação/IDP
VITE_IDP_API_URL=https://api.ynovamarketplace.com/api/idp

# Usar proxy em desenvolvimento (true/false)
VITE_USE_PROXY=false
```

## 🔧 Variáveis de Ambiente Disponíveis

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `VITE_API_BASE_URL` | URL base da API (balanço e contratos) | `https://cec49efdc912.ngrok-free.app` |
| `VITE_ENERGY_BALANCE_WEBHOOK` | Webhook para envio de emails | `https://n8n.ynovamarketplace.com/webhook-test/email-balanco-unico` |
| `VITE_INVOICE_WEBHOOK` | Webhook para processamento de faturas | `https://n8n.ynovamarketplace.com/webhook-test/8d7b84b3-f20d-4374-a812-76db38ebc77d` |
| `VITE_LEAD_SIMULATION_WEBHOOK` | Webhook para simulação de leads | `https://n8n.ynovamarketplace.com/webhook/mockBalancoEnergetico` |
| `VITE_IDP_API_URL` | URL da API de autenticação | `https://api.ynovamarketplace.com/api/idp` |
| `VITE_USE_PROXY` | Usar proxy em desenvolvimento | `false` |

## 📦 Como Usar

1. **Criar o arquivo `.env`** na raiz do projeto com o conteúdo acima
2. **Reiniciar o servidor de desenvolvimento** (se estiver rodando)
3. **Todas as URLs serão carregadas automaticamente** do `.env`

## 🔄 Para Alterar URLs

Basta editar o arquivo `.env` e reiniciar o servidor. Não é necessário alterar código!

## ⚠️ Importante

- O arquivo `.env` não deve ser commitado no Git (já deve estar no `.gitignore`)
- Use `.env.example` como template para outros desenvolvedores
- As URLs no código são apenas fallbacks caso a variável de ambiente não esteja definida

## ✅ Status

- ✅ Todas as URLs hardcoded removidas
- ✅ Configuração centralizada em `src/config/api.ts`
- ✅ URLs padrão configuradas para ngrok: `https://cec49efdc912.ngrok-free.app`
- ✅ Sistema pronto para usar variáveis de ambiente

