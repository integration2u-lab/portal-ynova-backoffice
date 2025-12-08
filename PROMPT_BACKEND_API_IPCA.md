# 📊 Especificação: API de IPCA (Índice de Preços ao Consumidor Amplo)

## Objetivo
Criar um endpoint no backend para buscar dados do IPCA da API do Banco Central do Brasil e calcular multiplicadores acumulados para reajuste de preços em contratos de energia.

---

## 🔌 Endpoint Principal

### GET `/api/ipca/multipliers`

**Descrição:** Retorna os multiplicadores acumulados do IPCA para um período específico, incluindo projeções para meses futuros.

**Query Parameters:**
- `startDate` (opcional, string): Data de início no formato `YYYY-MM-DD`
- `endDate` (opcional, string): Data de fim no formato `YYYY-MM-DD`
- `months` (opcional, number): Número de meses para buscar se não fornecer as datas (padrão: 60)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "variations": [
      {
        "data": "01/01/2024",
        "valor": "0.42"
      },
      {
        "data": "01/02/2024",
        "valor": "0.83"
      }
    ],
    "multipliers": [
      {
        "month": "2024-01",
        "variation": 0.42,
        "multiplier": 1.0042
      },
      {
        "month": "2024-02",
        "variation": 0.83,
        "multiplier": 1.0125
      }
    ]
  }
}
```

**Response Error (400/500):**
```json
{
  "success": false,
  "error": "Mensagem de erro descritiva",
  "data": null
}
```

---

## 📋 Endpoint Auxiliar (Opcional)

### GET `/api/ipca/multiplier/:yearMonth`

**Descrição:** Retorna o multiplicador IPCA para um mês específico (formato `YYYY-MM`).

**Path Parameters:**
- `yearMonth` (string): Mês no formato `YYYY-MM` (ex: `2024-01`)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "month": "2024-01",
    "variation": 0.42,
    "multiplier": 1.0042
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": "Multiplicador não encontrado para o mês especificado",
  "data": null
}
```

---

## 🔗 Integração com API do Banco Central do Brasil

### Documentação Oficial
- **URL Base:** `https://api.bcb.gov.br`
- **Série:** 433 (IPCA - Variação Mensal)
- **Documentação:** https://dadosabertos.bcb.gov.br/dataset/433-ipca---variacao-mensal

### Endpoint BCB
```
GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=DD/MM/YYYY&dataFinal=DD/MM/YYYY
```

### Formato de Resposta BCB
```json
[
  {
    "data": "01/01/2024",
    "valor": "0.42"
  },
  {
    "data": "01/02/2024",
    "valor": "0.83"
  }
]
```

**Campos:**
- `data` (string): Data no formato `DD/MM/YYYY` (sempre dia 01)
- `valor` (string): Variação percentual do mês como string (ex: `"0.42"` = 0,42%)

---

## 🧮 Lógica de Cálculo

### 1. Busca de Dados Históricos

**IMPORTANTE:** A API do BCB só retorna dados históricos, não dados futuros.

**Regras de Data:**
- Se `endDate` for futura (maior que hoje), limitar à data atual
- Se `startDate` for futura, buscar desde 2 anos atrás
- Sempre ajustar para:
  - **Data Inicial:** Primeiro dia do mês inicial (`01/MM/YYYY`)
  - **Data Final:** Último dia do mês final (`DD/MM/YYYY`, onde DD é o último dia do mês)

**Exemplo:**
```javascript
// Input: startDate = "2024-01-15", endDate = "2025-12-31"
// Data atual: "2024-08-20"
// 
// Ajustes:
// - endDate limitado a hoje: "2024-08-20"
// - Data inicial ajustada: "01/01/2024"
// - Data final ajustada: "31/08/2024"
```

### 2. Cálculo de Multiplicadores Acumulados

**Fórmula:**
```
multiplier = 1.0 × (1 + var1/100) × (1 + var2/100) × ...
```

**Processo:**
1. Ordenar variações por data (mais antiga primeiro)
2. Iniciar com `accumulatedMultiplier = 1.0`
3. Para cada variação:
   - Converter `valor` de string para número (ex: `"0.42"` → `0.42`)
   - Calcular: `accumulatedMultiplier *= (1 + variationValue / 100)`
   - Adicionar ao array: `{ month: "YYYY-MM", variation: 0.42, multiplier: 1.0042 }`

**Exemplo de Cálculo:**
```javascript
// Variações recebidas:
[
  { data: "01/01/2024", valor: "0.42" },
  { data: "01/02/2024", valor: "0.83" }
]

// Cálculo:
// Mês 2024-01:
//   multiplier = 1.0 × (1 + 0.42/100) = 1.0042
// 
// Mês 2024-02:
//   multiplier = 1.0042 × (1 + 0.83/100) = 1.0125

// Resultado:
[
  { month: "2024-01", variation: 0.42, multiplier: 1.0042 },
  { month: "2024-02", variation: 0.83, multiplier: 1.0125 }
]
```

### 3. Projeção para Meses Futuros

Quando um mês solicitado não tem dados históricos (é futuro), projetar usando:

**Método:**
1. Calcular a média das últimas 12 variações conhecidas (ou todas se houver menos de 12)
2. Continuar acumulando mês a mês usando essa média
3. Fórmula para cada mês futuro: `multiplier *= (1 + averageVariation / 100)`

**Exemplo:**
```javascript
// Último mês com dados: 2024-08 (multiplier: 1.0250)
// Últimas 12 variações: [0.42, 0.83, 0.36, ...] → média: 0.50%
// Mês solicitado: 2024-12

// Cálculo:
// 2024-09: multiplier = 1.0250 × (1 + 0.50/100) = 1.0301
// 2024-10: multiplier = 1.0301 × (1 + 0.50/100) = 1.0352
// 2024-11: multiplier = 1.0352 × (1 + 0.50/100) = 1.0404
// 2024-12: multiplier = 1.0404 × (1 + 0.50/100) = 1.0456
```

---

## 💾 Cache (Recomendado)

**Duração do Cache:** 1 hora (3600 segundos)

**Estratégia:**
- Cachear os dados brutos retornados da API do BCB
- Invalidar cache após 1 hora
- Permitir forçar refresh via query parameter `?forceRefresh=true`

**Vantagens:**
- Reduz chamadas à API do BCB
- Melhora performance
- Evita rate limiting

---

## 📝 Tratamento de Erros

### Erros da API BCB

**404 Not Found:**
- Causa: Período solicitado não tem dados (ex: datas futuras)
- Ação: Retornar array vazio de variações, mas ainda calcular multiplicadores para meses futuros se necessário

**500/503 Service Unavailable:**
- Causa: API do BCB temporariamente indisponível
- Ação: Retornar erro 503 com mensagem apropriada

**Timeout:**
- Causa: Requisição demorou mais que 10 segundos
- Ação: Retornar erro 504 Gateway Timeout

### Erros de Validação

**400 Bad Request:**
- Data inválida (formato incorreto)
- `months` negativo ou muito grande (> 120)
- Período inválido (startDate > endDate)

---

## 🔄 Fluxo de Requisição

```
1. Frontend envia: GET /api/ipca/multipliers?startDate=2024-01-01&endDate=2025-12-31

2. Backend valida parâmetros

3. Backend verifica cache (se implementado)

4. Backend ajusta datas:
   - Se endDate > hoje → limitar a hoje
   - Se startDate > hoje → buscar desde 2 anos atrás
   - Ajustar para primeiro/último dia do mês

5. Backend busca da API BCB:
   GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2024&dataFinal=31/08/2024

6. Backend calcula multiplicadores acumulados

7. Backend projeta para meses futuros (se necessário)

8. Backend retorna JSON formatado
```

---

## 📊 Estrutura de Dados

### Tipo: IPCAVariation
```typescript
{
  data: string;      // Formato: "DD/MM/YYYY"
  valor: string;     // Percentual como string (ex: "0.42")
}
```

### Tipo: IPCAMultiplier
```typescript
{
  month: string;     // Formato: "YYYY-MM"
  variation: number; // Variação percentual do mês (ex: 0.42)
  multiplier: number; // Multiplicador acumulado (ex: 1.0042)
}
```

---

## ✅ Checklist de Implementação

- [ ] Criar endpoint `GET /api/ipca/multipliers`
- [ ] Implementar validação de parâmetros (datas, months)
- [ ] Implementar ajuste de datas (limitar a hoje, primeiro/último dia do mês)
- [ ] Integrar com API do BCB (`https://api.bcb.gov.br`)
- [ ] Implementar tratamento de erros da API BCB (404, 500, timeout)
- [ ] Implementar cálculo de multiplicadores acumulados
- [ ] Implementar projeção para meses futuros
- [ ] Implementar cache (duração: 1 hora)
- [ ] Adicionar logs para debugging
- [ ] Documentar formato de resposta
- [ ] Testar com diferentes cenários:
  - [ ] Datas históricas
  - [ ] Datas futuras
  - [ ] Período sem dados
  - [ ] API BCB indisponível
  - [ ] Cache válido/inválido

---

## 🔗 Referências

- **Documentação BCB:** https://dadosabertos.bcb.gov.br/dataset/433-ipca---variacao-mensal
- **Série 433 (IPCA):** https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados
- **Código Frontend:** `src/services/ipcaApi.ts` (para referência da lógica atual)

---

## 💡 Observações Finais

1. **Performance:** A API do BCB pode ser lenta. Recomenda-se implementar cache e considerar timeout de 10 segundos.

2. **Dados Futuros:** A API do BCB não retorna dados futuros. O backend deve projetar usando a média das últimas variações.

3. **Timezone:** Sempre trabalhar com datas em UTC ou considerar timezone do Brasil (UTC-3).

4. **Validação:** Validar que `valor` da API BCB é um número válido antes de calcular.

5. **Logs:** Adicionar logs informativos para facilitar debugging:
   - Datas ajustadas
   - Quantidade de dados retornados
   - Multiplicadores calculados
   - Projeções para meses futuros

---

## 📝 Exemplo Completo de Uso

### Request
```
GET /api/ipca/multipliers?startDate=2024-01-01&endDate=2025-12-31
```

### Response (sucesso)
```json
{
  "success": true,
  "data": {
    "variations": [
      {
        "data": "01/01/2024",
        "valor": "0.42"
      },
      {
        "data": "01/02/2024",
        "valor": "0.83"
      },
      {
        "data": "01/03/2024",
        "valor": "0.36"
      }
    ],
    "multipliers": [
      {
        "month": "2024-01",
        "variation": 0.42,
        "multiplier": 1.0042
      },
      {
        "month": "2024-02",
        "variation": 0.83,
        "multiplier": 1.0125
      },
      {
        "month": "2024-03",
        "variation": 0.36,
        "multiplier": 1.0161
      },
      {
        "month": "2024-04",
        "variation": 0.50,
        "multiplier": 1.0212
      }
    ]
  }
}
```

### Response (erro - API BCB indisponível)
```json
{
  "success": false,
  "error": "API do Banco Central temporariamente indisponível. Tente novamente mais tarde.",
  "data": null
}
```

### Response (erro - validação)
```json
{
  "success": false,
  "error": "Data de início inválida. Formato esperado: YYYY-MM-DD",
  "data": null
}
```

