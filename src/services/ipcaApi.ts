/**
 * Serviço para buscar e calcular dados do IPCA (Índice de Preços ao Consumidor Amplo)
 * Agora usa a API do backend que integra com o Banco Central do Brasil
 */

import { API_BASE_URL } from '../config/api';

export type IPCAVariation = {
  data: string; // Formato: "DD/MM/YYYY"
  valor: string; // Percentual como string (ex: "0.52")
};

export type IPCAMultiplier = {
  month: string; // Formato: "YYYY-MM"
  variation: number; // Variação percentual do mês
  multiplier: number; // Multiplicador acumulado
};

type BackendIPCAResponse = {
  success: boolean;
  data: {
    variations: IPCAVariation[];
    multipliers: IPCAMultiplier[];
  } | null;
  error?: string;
};

/**
 * Busca os multiplicadores do IPCA para um período específico via API do backend
 * O backend integra com a API do Banco Central do Brasil e calcula os multiplicadores
 * @param startDate Data de início no formato YYYY-MM-DD (opcional)
 * @param endDate Data de fim no formato YYYY-MM-DD (opcional)
 * @param months Número de meses para buscar se não fornecer as datas (padrão: 60)
 * @returns Promise com array de multiplicadores do IPCA
 */
export async function fetchIPCAMultipliers(
  startDate?: string,
  endDate?: string,
  months: number = 60
): Promise<IPCAMultiplier[]> {
  try {
    // Usa a URL base da API ou fallback para localhost:4000
    let baseUrl = API_BASE_URL || 'http://localhost:4000';
    
    // Remove barras finais
    baseUrl = baseUrl.replace(/\/+$/, '');
    
    // Se a URL base não termina com /api, adiciona
    if (!baseUrl.endsWith('/api')) {
      // Verifica se tem /api em algum lugar da URL
      if (!baseUrl.includes('/api')) {
        baseUrl = `${baseUrl}/api`;
      }
    }
    
    const params = new URLSearchParams();
    
    if (startDate) {
      params.append('startDate', startDate);
    }
    if (endDate) {
      params.append('endDate', endDate);
    }
    if (!startDate || !endDate) {
      params.append('months', months.toString());
    }
    
    const url = `${baseUrl}/ipca/multipliers?${params.toString()}`;
    
    console.log('[ipcaApi] 📅 Buscando multiplicadores IPCA do backend:', { startDate, endDate, months });
    console.log('[ipcaApi] 🔗 API_BASE_URL configurada:', API_BASE_URL);
    console.log('[ipcaApi] 🔗 URL final:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[ipcaApi] Status da resposta:', response.status, response.statusText);
    
    // Verifica o Content-Type antes de processar a resposta
    const contentType = response.headers.get('content-type');
    console.log('[ipcaApi] Content-Type:', contentType);
    
    // Lê o corpo da resposta como texto primeiro (para poder usar em múltiplos lugares)
    const textResponse = await response.text();
    
    // Verifica se a resposta é JSON
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[ipcaApi] ❌ Resposta não é JSON. URL:', url);
      console.error('[ipcaApi] ❌ Content-Type recebido:', contentType);
      console.error('[ipcaApi] ❌ Primeiros caracteres da resposta:', textResponse.substring(0, 500));
      
      if (response.status === 404) {
        console.warn('[ipcaApi] ⚠️ Endpoint não encontrado (404). Verifique se:');
        console.warn('[ipcaApi]   1. O backend está rodando em:', baseUrl.replace('/ipca/multipliers', ''));
        console.warn('[ipcaApi]   2. O endpoint existe: /ipca/multipliers');
        console.warn('[ipcaApi]   3. A URL está correta:', url);
      } else if (response.status >= 500) {
        console.warn('[ipcaApi] ⚠️ Erro no servidor (5xx) ao buscar IPCA');
      } else {
        console.warn('[ipcaApi] ⚠️ Resposta inesperada do servidor. Status:', response.status);
      }
      return [];
    }
    
    if (!response.ok) {
      console.error('[ipcaApi] ❌ Erro na resposta da API. Status:', response.status);
      console.error('[ipcaApi] ❌ Resposta:', textResponse.substring(0, 500));
      
      if (response.status === 404) {
        console.warn('[ipcaApi] ⚠️ Nenhum dado encontrado para o período ou endpoint não existe');
      } else if (response.status >= 500) {
        console.warn('[ipcaApi] ⚠️ Erro no servidor ao buscar IPCA');
      }
      return [];
    }
    
    // Tenta parsear como JSON
    let result: BackendIPCAResponse;
    try {
      result = JSON.parse(textResponse);
    } catch (jsonError) {
      console.error('[ipcaApi] ❌ Erro ao parsear JSON da resposta:', jsonError);
      console.error('[ipcaApi] ❌ Resposta recebida (primeiros 500 chars):', textResponse.substring(0, 500));
      return [];
    }
    
    if (!result.success || !result.data) {
      console.warn('[ipcaApi] ⚠️ Resposta do backend indicou erro:', result.error);
      return [];
    }
    
    const multipliers = result.data.multipliers || [];
    console.log('[ipcaApi] ✅ Multiplicadores IPCA carregados com sucesso:', multipliers.length, 'meses');
    
    return multipliers;
  } catch (error) {
    console.error('[ipcaApi] ❌ Erro ao buscar multiplicadores do IPCA:', error);
    
    if (error instanceof SyntaxError) {
      console.error('[ipcaApi] ❌ Erro de sintaxe JSON. Isso geralmente significa que o servidor retornou HTML ao invés de JSON.');
      console.error('[ipcaApi] ❌ Verifique se:');
      console.error('[ipcaApi]   1. O backend está rodando');
      console.error('[ipcaApi]   2. O endpoint /api/ipca/multipliers existe');
      console.error('[ipcaApi]   3. A URL base está correta:', API_BASE_URL || 'http://localhost:4000');
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('[ipcaApi] ❌ Erro de rede. Verifique se o backend está acessível.');
    }
    
    console.warn('[ipcaApi] ⚠️ O modal continuará funcionando sem cálculo automático de reajuste');
    return [];
  }
}

/**
 * Busca as variações do IPCA para um período específico via API do backend
 * Mantida para compatibilidade com código existente
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
  try {
    // Usa a URL base da API ou fallback para localhost
    let baseUrl = API_BASE_URL || 'http://localhost:4000';
    
    // Garante que a URL base termina sem barra
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Se a URL base não contém /api, adiciona
    if (!baseUrl.includes('/api')) {
      baseUrl = `${baseUrl}/api`;
    }
    
    const params = new URLSearchParams();
    
    if (startDate) {
      params.append('startDate', startDate);
    }
    if (endDate) {
      params.append('endDate', endDate);
    }
    if (!startDate || !endDate) {
      params.append('months', months.toString());
    }
    
    const url = `${baseUrl}/ipca/multipliers?${params.toString()}`;
    
    console.log('[ipcaApi] 📅 Buscando variações IPCA do backend:', { startDate, endDate, months });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    // Verifica se a resposta é JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[ipcaApi] ⚠️ Resposta não é JSON ao buscar variações');
      return [];
    }
    
    if (!response.ok) {
      console.warn('[ipcaApi] ⚠️ Erro ao buscar variações do IPCA');
      return [];
    }
    
    let result: BackendIPCAResponse;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('[ipcaApi] ❌ Erro ao parsear JSON:', jsonError);
      return [];
    }
    
    if (!result.success || !result.data) {
      return [];
    }
    
    return result.data.variations || [];
  } catch (error) {
    console.error('[ipcaApi] Erro ao buscar variações do IPCA:', error);
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
 * Cache para multiplicadores do IPCA
 */
class IPCAMultiplierCache {
  private data: IPCAMultiplier[] | null = null;
  private timestamp: number | null = null;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hora
  
  isValid(): boolean {
    if (!this.data || !this.timestamp) {
      return false;
    }
    return Date.now() - this.timestamp < this.CACHE_DURATION;
  }
  
  set(data: IPCAMultiplier[]): void {
    this.data = data;
    this.timestamp = Date.now();
  }
  
  get(): IPCAMultiplier[] | null {
    return this.isValid() ? this.data : null;
  }
  
  clear(): void {
    this.data = null;
    this.timestamp = null;
  }
}

const ipcaMultiplierCache = new IPCAMultiplierCache();

/**
 * Busca os multiplicadores do IPCA com cache
 * @param startDate Data de início no formato YYYY-MM-DD (opcional)
 * @param endDate Data de fim no formato YYYY-MM-DD (opcional)
 * @param months Número de meses para buscar se não fornecer as datas
 * @param forceRefresh Força a atualização do cache
 * @returns Promise com array de multiplicadores do IPCA
 */
export async function fetchIPCAMultipliersWithCache(
  startDate?: string,
  endDate?: string,
  months: number = 60,
  forceRefresh: boolean = false
): Promise<IPCAMultiplier[]> {
  if (!forceRefresh) {
    const cached = ipcaMultiplierCache.get();
    if (cached) {
      console.log('[ipcaApi] 💾 Usando multiplicadores do IPCA em cache');
      return cached;
    }
  }
  
  try {
    const multipliers = await fetchIPCAMultipliers(startDate, endDate, months);
    if (multipliers.length > 0) {
      ipcaMultiplierCache.set(multipliers);
      console.log(`[ipcaApi] ✅ Multiplicadores IPCA carregados e armazenados em cache: ${multipliers.length} meses`);
    }
    return multipliers;
  } catch (error) {
    console.warn('[ipcaApi] Não foi possível carregar multiplicadores do IPCA, continuando sem reajuste automático');
    return [];
  }
}

/**
 * Busca as variações do IPCA com cache (mantida para compatibilidade)
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
  // Para manter compatibilidade, busca as variações
  // Mas internamente usa os multiplicadores do backend
  try {
    const variations = await fetchIPCAVariations(startDate, endDate, months);
    if (variations.length > 0 && !forceRefresh) {
      ipcaCache.set(variations);
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

