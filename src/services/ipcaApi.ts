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
  // Usa intervalo de datas ao invés de "ultimos" para evitar erro 400
  
  try {
    // Formata datas no padrão DD/MM/YYYY
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    let dataInicialStr: string;
    let dataFinalStr: string;
    
    if (startDate && endDate) {
      // Usa as datas fornecidas (vigência do contrato)
      dataInicialStr = formatDate(startDate);
      dataFinalStr = formatDate(endDate);
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
      console.warn('[ipcaApi] A API do BCB pode estar temporariamente indisponível');
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
 * Obtém o multiplicador IPCA para um mês específico
 * @param multipliers Array de multiplicadores calculados
 * @param yearMonth Mês no formato YYYY-MM
 * @returns Multiplicador para o mês especificado ou 1.0 se não encontrado
 */
export function getIPCAMultiplierForMonth(
  multipliers: IPCAMultiplier[],
  yearMonth: string
): number {
  const found = multipliers.find((m) => m.month === yearMonth);
  return found ? found.multiplier : 1.0;
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

