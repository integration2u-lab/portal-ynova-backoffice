/**
 * Serviço para buscar e calcular dados do IPCA (Índice de Preços ao Consumidor Amplo)
 * API do Banco Central do Brasil
 */

export type IPCAVariation = {
  data: string; // Formato: "DD/MM/YYYY"
  valor: string; // Percentual como string (ex: "0.52")
};

export type IPCAMultiplier = {
  month: string; // Formato: "YYYY-MM"
  variation: number; // Variação percentual do mês
  multiplier: number; // Multiplicador acumulado
};

/**
 * Busca as variações do IPCA para um período específico da API do BCB
 * Série 433 = IPCA (variação mensal)
 * IMPORTANTE: A API só retorna dados históricos, não dados futuros
 * @param startDate Data de início no formato YYYY-MM-DD (opcional)
 * @param endDate Data de fim no formato YYYY-MM-DD (opcional)
 * @param months Número de meses para buscar se não fornecer as datas (padrão: 60)
 * @returns Promise com array de variações do IPCA
 */
export async function fetchIPCAVariations(
  startDate?: string,
  endDate?: string,
  months: number = 60
): Promise<IPCAVariation[]> {
  // API do Banco Central do Brasil - Série 433 (IPCA)
  // Documentação: https://dadosabertos.bcb.gov.br/dataset/433-ipca---variacao-mensal
  // IMPORTANTE: A API só retorna dados históricos, não dados futuros
  
  try {
    // Formata datas no padrão DD/MM/YYYY
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    // Obtém a data atual (hoje) para limitar busca ao histórico
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
    
    let dataInicialStr: string;
    let dataFinalStr: string;
    
    if (startDate && endDate) {
      // Limita a data final à data atual (IPCA só tem dados históricos)
      const endDateObj = new Date(endDate + 'T00:00:00'); // Adiciona hora para evitar problemas de timezone
      const hojeObj = new Date();
      hojeObj.setHours(0, 0, 0, 0); // Zera horas para comparação
      
      // Compara apenas datas (sem horas)
      const endTimestamp = endDateObj.getTime();
      const hojeTimestamp = hojeObj.getTime();
      
      // Se a data final for futura, usa a data de hoje
      let dataFinalLimite = endTimestamp > hojeTimestamp ? hojeObj : endDateObj;
      
      // Se a data inicial também for futura, ajusta para buscar dados históricos
      const startDateObj = new Date(startDate + 'T00:00:00');
      let dataInicialLimite = startDateObj;
      
      if (startDateObj.getTime() > hojeTimestamp) {
        // Se a data inicial for futura, busca desde 2 anos atrás
        const doisAnosAtras = new Date();
        doisAnosAtras.setFullYear(doisAnosAtras.getFullYear() - 2);
        doisAnosAtras.setHours(0, 0, 0, 0);
        dataInicialLimite = doisAnosAtras;
        console.warn('[ipcaApi] ⚠️ Data inicial é futura, ajustando para buscar dados históricos desde', formatDate(doisAnosAtras.toISOString().split('T')[0]));
      }
      
      // Ajusta para primeiro dia do mês inicial e último dia do mês final
      const inicioYear = dataInicialLimite.getFullYear();
      const inicioMonth = dataInicialLimite.getMonth();
      const fimYear = dataFinalLimite.getFullYear();
      const fimMonth = dataFinalLimite.getMonth();
      
      // Primeiro dia do mês inicial
      dataInicialStr = `01/${String(inicioMonth + 1).padStart(2, '0')}/${inicioYear}`;
      
      // Último dia do mês final
      const ultimoDiaDoMes = new Date(fimYear, fimMonth + 1, 0).getDate();
      dataFinalStr = `${String(ultimoDiaDoMes).padStart(2, '0')}/${String(fimMonth + 1).padStart(2, '0')}/${fimYear}`;
      
      console.log('[ipcaApi] 🔄 Datas ajustadas (limitando ao histórico):', {
        original: { startDate, endDate },
        ajustada: { inicio: dataInicialStr, fim: dataFinalStr },
        hoje: hojeStr,
        dataFinalEraFutura: endTimestamp > hojeTimestamp,
        dataInicialEraFutura: startDateObj.getTime() > hojeTimestamp
      });
    } else {
      // Calcula data inicial (X meses atrás) e data final (hoje)
      const dataFinal = new Date();
      const dataInicial = new Date();
      dataInicial.setMonth(dataInicial.getMonth() - months);
      
      const formatDateFromDate = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };
      
      dataInicialStr = formatDateFromDate(dataInicial);
      dataFinalStr = formatDateFromDate(dataFinal);
    }
    
    // Em desenvolvimento, usa o proxy do Vite para evitar CORS
    // Em produção, você precisará configurar um proxy no seu servidor ou usar CORS no backend
    const isDev = import.meta.env.DEV;
    const baseUrl = isDev ? '/api-bcb' : 'https://api.bcb.gov.br';
    const url = `${baseUrl}/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${dataInicialStr}&dataFinal=${dataFinalStr}`;
    
    console.log('[ipcaApi] 📅 Buscando IPCA do período:', dataInicialStr, 'até', dataFinalStr);
    console.log('[ipcaApi] 🌐 Modo:', isDev ? 'Desenvolvimento (via proxy)' : 'Produção (direto)');
    console.log('[ipcaApi] 🔗 URL completa:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[ipcaApi] Status da resposta:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[ipcaApi] Erro na resposta da API:', errorText);
      
      // Se for 404, pode ser porque não há dados para o período (datas futuras)
      if (response.status === 404) {
        console.warn('[ipcaApi] ⚠️ Nenhum dado encontrado para o período. Verifique se as datas são históricas (o IPCA não tem dados futuros).');
      } else {
        console.warn('[ipcaApi] A API do BCB pode estar temporariamente indisponível');
      }
      return [];
    }
    
    const data: IPCAVariation[] = await response.json();
    console.log('[ipcaApi] ✅ IPCA carregado com sucesso:', data.length, 'meses');
    
    // Valida se os dados retornados são válidos
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[ipcaApi] API retornou dados vazios ou inválidos');
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('[ipcaApi] Erro ao buscar variações do IPCA:', error);
    console.warn('[ipcaApi] O modal continuará funcionando sem cálculo automático de reajuste');
    // Retorna array vazio ao invés de lançar erro, permitindo que o modal funcione sem IPCA
    return [];
  }
}

/**
 * Converte a data do formato DD/MM/YYYY para YYYY-MM
 * @param dateStr Data no formato DD/MM/YYYY
 * @returns Data no formato YYYY-MM
 */
function convertDateToYearMonth(dateStr: string): string {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}`;
}

/**
 * Calcula os multiplicadores acumulados do IPCA
 * Fórmula: multiplier = 1 × (1 + var1/100) × (1 + var2/100) × ...
 * @param variations Array de variações do IPCA
 * @returns Array de multiplicadores com acumulação
 */
export function calculateIPCAMultipliers(variations: IPCAVariation[]): IPCAMultiplier[] {
  const multipliers: IPCAMultiplier[] = [];
  let accumulatedMultiplier = 1.0;
  
  // Ordena as variações por data (mais antiga primeiro)
  const sortedVariations = [...variations].sort((a, b) => {
    const [dayA, monthA, yearA] = a.data.split('/').map(Number);
    const [dayB, monthB, yearB] = b.data.split('/').map(Number);
    
    const dateA = new Date(yearA, monthA - 1, dayA);
    const dateB = new Date(yearB, monthB - 1, dayB);
    
    return dateA.getTime() - dateB.getTime();
  });
  
  for (const variation of sortedVariations) {
    const variationValue = parseFloat(variation.valor);
    
    if (Number.isNaN(variationValue)) {
      console.warn(`[ipcaApi] Variação inválida para ${variation.data}: ${variation.valor}`);
      continue;
    }
    
    // Calcula o multiplicador acumulado
    accumulatedMultiplier *= (1 + variationValue / 100);
    
    multipliers.push({
      month: convertDateToYearMonth(variation.data),
      variation: variationValue,
      multiplier: accumulatedMultiplier,
    });
  }
  
  return multipliers;
}

/**
 * Calcula quantos meses existem entre dois meses (formato YYYY-MM)
 */
function monthsBetween(startMonth: string, endMonth: string): number {
  const [startYear, startM] = startMonth.split('-').map(Number);
  const [endYear, endM] = endMonth.split('-').map(Number);
  return (endYear - startYear) * 12 + (endM - startM);
}

/**
 * Obtém o multiplicador IPCA para um mês específico
 * Para meses futuros, continua acumulando progressivamente usando a última variação conhecida
 * @param multipliers Array de multiplicadores calculados
 * @param yearMonth Mês no formato YYYY-MM
 * @returns Multiplicador para o mês especificado, calculado progressivamente para meses futuros, ou 1.0 se não encontrado
 */
export function getIPCAMultiplierForMonth(
  multipliers: IPCAMultiplier[],
  yearMonth: string
): number {
  const found = multipliers.find((m) => m.month === yearMonth);
  
  if (found) {
    return found.multiplier;
  }
  
  // Se não encontrou, verifica se é um mês futuro
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month || isNaN(year) || isNaN(month)) {
    return 1.0;
  }
  
  const mesSolicitado = new Date(year, month - 1, 1);
  const hoje = new Date();
  hoje.setDate(1); // Primeiro dia do mês atual
  
  if (mesSolicitado > hoje && multipliers.length > 0) {
    // É um mês futuro - continua acumulando progressivamente
    const ultimoMultiplier = multipliers[multipliers.length - 1];
    
    // Calcula a média das últimas variações (últimos 12 meses ou todas disponíveis)
    const ultimasVariacoes = multipliers.slice(-12).map(m => m.variation);
    const mediaVariacao = ultimasVariacoes.length > 0
      ? ultimasVariacoes.reduce((sum, v) => sum + v, 0) / ultimasVariacoes.length
      : ultimoMultiplier.variation;
    
    // Calcula quantos meses à frente está o mês solicitado
    const mesesAdiante = monthsBetween(ultimoMultiplier.month, yearMonth);
    
    if (mesesAdiante > 0) {
      // Continua acumulando usando a média das últimas variações para cada mês futuro
      let acumulado = ultimoMultiplier.multiplier;
      
      // Acumula mês a mês para manter progressão
      for (let i = 0; i < mesesAdiante; i++) {
        acumulado *= (1 + mediaVariacao / 100);
      }
      
      console.log(`[ipcaApi] 📊 Mês futuro ${yearMonth}: acumulando progressivamente (${ultimoMultiplier.month} → ${yearMonth}, ${mesesAdiante} meses, média variação: ${mediaVariacao.toFixed(2)}%, multiplicador final: ${acumulado.toFixed(6)})`);
      return acumulado;
    }
    
    // Fallback: se não conseguiu calcular, usa o último multiplicador
    return ultimoMultiplier.multiplier;
  }
  
  // Retorna 1.0 (sem reajuste) se não encontrou e não é futuro
  return 1.0;
}

/**
 * Calcula o preço reajustado com base no IPCA
 * @param basePrice Preço base
 * @param multipliers Array de multiplicadores do IPCA
 * @param yearMonth Mês para o qual calcular o reajuste
 * @returns Preço reajustado
 */
export function calculateAdjustedPrice(
  basePrice: number,
  multipliers: IPCAMultiplier[],
  yearMonth: string
): number {
  const multiplier = getIPCAMultiplierForMonth(multipliers, yearMonth);
  return basePrice * multiplier;
}

/**
 * Cache simples para as variações do IPCA
 * Evita múltiplas requisições à API em um curto período
 */
class IPCACache {
  private data: IPCAVariation[] | null = null;
  private timestamp: number | null = null;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hora
  
  isValid(): boolean {
    if (!this.data || !this.timestamp) {
      return false;
    }
    return Date.now() - this.timestamp < this.CACHE_DURATION;
  }
  
  set(data: IPCAVariation[]): void {
    this.data = data;
    this.timestamp = Date.now();
  }
  
  get(): IPCAVariation[] | null {
    return this.isValid() ? this.data : null;
  }
  
  clear(): void {
    this.data = null;
    this.timestamp = null;
  }
}

const ipcaCache = new IPCACache();

/**
 * Busca as variações do IPCA com cache
 * @param startDate Data de início no formato YYYY-MM-DD (opcional)
 * @param endDate Data de fim no formato YYYY-MM-DD (opcional)
 * @param months Número de meses para buscar se não fornecer as datas
 * @param forceRefresh Força a atualização do cache
 * @returns Promise com array de variações do IPCA
 */
export async function fetchIPCAVariationsWithCache(
  startDate?: string,
  endDate?: string,
  months: number = 60,
  forceRefresh: boolean = false
): Promise<IPCAVariation[]> {
  // Cria uma chave única baseada no período
  const cacheKey = startDate && endDate ? `${startDate}_${endDate}` : `last_${months}`;
  
  if (!forceRefresh) {
    const cached = ipcaCache.get();
    if (cached) {
      console.log('[ipcaApi] 💾 Usando dados do IPCA em cache');
      return cached;
    }
  }
  
  try {
    const variations = await fetchIPCAVariations(startDate, endDate, months);
    if (variations.length > 0) {
      ipcaCache.set(variations);
      console.log(`[ipcaApi] ✅ IPCA carregado e armazenado em cache: ${variations.length} meses`);
    }
    return variations;
  } catch (error) {
    console.warn('[ipcaApi] Não foi possível carregar dados do IPCA, continuando sem reajuste automático');
    return [];
  }
}

/**
 * Limpa o cache do IPCA
 */
export function clearIPCACache(): void {
  ipcaCache.clear();
}

