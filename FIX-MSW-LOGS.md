# Correções: MSW e Logs de Debug

## ✅ Problemas Resolvidos

### 1. **MSW causando loops infinitos**
- **Problema**: MSW estava interceptando requisições para `https://localhost/` sem handlers, causando warnings infinitos
- **Solução**: 
  - Adicionado `onUnhandledRequest: 'bypass'` no worker.start()
  - Melhorado o desregistro do MSW quando não está em modo mock
  - Adicionado handler para ignorar requisições não tratadas

### 2. **Logs de debug para criação de contrato**
- **Adicionado logs detalhados em todo o fluxo**:
  - `CreateContractModal` - quando o formulário é submetido
  - `ContratosPage` - quando handleCreateContract é chamado
  - `ContractsProvider` - quando addContract é executado
  - `ContractsContext` - quando createContractInApi é chamado
  - `contracts.ts` - quando createContract faz a chamada POST
  - `apiClient.ts` - quando a requisição HTTP é feita

## 📋 Fluxo de Logs ao Salvar Contrato

Quando você salvar um contrato manualmente, verá esta sequência de logs:

1. `[CreateContractModal] 🚀 Iniciando salvamento do contrato...`
2. `[CreateContractModal] 📋 Contrato montado: {...}`
3. `[CreateContractModal] 📞 Chamando onCreate com contrato: {...}`
4. `[ContratosPage] 🎯 handleCreateContract chamado`
5. `[ContratosPage] 📦 Contrato recebido: {...}`
6. `[ContratosPage] 📞 Chamando addContract...`
7. `[ContractsProvider] 🎯 addContract chamado`
8. `[ContractsProvider] 📦 Contrato recebido para adicionar: {...}`
9. `[ContractsProvider] 📞 Chamando createContractInApi...`
10. `[ContractsContext] 🚀 createContractInApi iniciado`
11. `[ContractsContext] 📦 Contrato recebido: {...}`
12. `[ContractsContext] 🔗 writeBaseUrl resolvido: ...`
13. `[ContractsContext] 🔍 shouldUseService: true/false`
14. `[ContractsContext] 📞 Usando createContractService (apiClient)...`
15. `[ContractsContext] 📤 contractToServicePayload - Payload completo montado: {...}`
16. `[contracts.ts] 📥 prepareWritePayload - Payload recebido: {...}`
17. `[contracts.ts] 🔍 Valores extraídos: {...}`
18. `[contracts.ts] 📤 prepareWritePayload - Payload final preparado: {...}`
19. `[contracts.ts] 🚀 createContract - Iniciando criação de contrato`
20. `[contracts.ts] 📋 Payload original: {...}`
21. `[contracts.ts] 🔗 Chamando POST: /contracts`
22. `[contracts.ts] 📦 Body que será enviado: {...}`
23. `[apiClient] 📤 postJson - Path: /contracts`
24. `[apiClient] 📤 postJson - Headers: {...}`
25. `[apiClient] 📤 postJson - Body: {...}`
26. `[apiClient] 🔗 URL construída para contratos: https://cec49efdc912.ngrok-free.app/contracts`
27. `[apiClient] 🌐 apiFetch - URL completa: ...`
28. `[apiClient] 🌐 apiFetch - Método: POST`
29. `[apiClient] 🌐 apiFetch - RequestInit: {...}`
30. `[apiClient] ✅ apiFetch - Resposta recebida: {...}`
31. `[contracts.ts] ✅ Resposta recebida: {...}`
32. `[contracts.ts] 📊 Contratos normalizados: {...}`
33. `[ContractsContext] ✅ Resposta de createContractService: {...}`
34. `[ContractsProvider] ✅ Contrato criado na API: {...}`
35. `[ContratosPage] ✅ Contrato salvo com sucesso: {...}`

## 🔍 Como Debugar

1. **Abra o Console do navegador** (F12 → Console)
2. **Crie um contrato manualmente**
3. **Acompanhe os logs** na ordem acima
4. **Se houver erro**, os logs mostrarão exatamente onde falhou:
   - Se não chegar no log 14 → problema no fluxo do React
   - Se parar no log 22 → problema no payload
   - Se parar no log 26 → problema na URL
   - Se parar no log 30 → problema na requisição HTTP
   - Se parar no log 31 → problema na resposta da API

## ⚠️ MSW

O MSW agora está configurado para:
- **Não interceptar requisições externas** (ngrok, APIs reais)
- **Bypass de requisições sem handler** (evita warnings)
- **Desregistro automático** quando `VITE_API_MOCK !== 'true'`

Se ainda ver warnings do MSW:
1. Verifique se `VITE_API_MOCK` não está definido como `'true'` no `.env`
2. Limpe o cache do navegador
3. Desregistre manualmente o service worker: DevTools → Application → Service Workers → Unregister

