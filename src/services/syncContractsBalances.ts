import { getList as getEnergyBalanceList, energyBalanceRequest } from './energyBalanceApi';
import type { SyncResult, SyncResultItem } from '../components/balancos/SyncResultModal';
import type { ContractDetails as ContractMock } from '../types/contracts';

type MonthData = {
  volumeSeasonalizedMWh: number | null;
  flexibilityMaxMWh: number | null;
  flexibilityMinMWh: number | null;
  price: number | null;
};

/**
 * Extrai o medidor do contrato
 */
function extractMedidorFromContract(contract: ContractMock): string | null {
  const medidorField = contract.dadosContrato?.find((item) => {
    const label = item.label.toLowerCase();
    return label.includes('medidor') || label.includes('meter') || label.includes('grupo');
  });
  
  const medidor = medidorField?.value;
  if (!medidor || medidor === 'Não informado') {
    return null;
  }
  return medidor;
}

/**
 * Parseia o mês do balanço para formato YYYY-MM
 */
function parseBalanceMonth(balanceMonth: unknown): string | null {
  if (!balanceMonth) return null;
  
  const monthStr = String(balanceMonth);
  
  // Tenta extrair YYYY-MM
  const isoMatch = monthStr.match(/(\d{4})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}`;
  }
  
  // Tenta parsear formato "jan. 2025" ou similar
  const monthNames: Record<string, string> = {
    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
    'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
  };
  
  const ptBrMatch = monthStr.toLowerCase().match(/([a-z]{3})\.?\s*(\d{4})/);
  if (ptBrMatch && monthNames[ptBrMatch[1]]) {
    return `${ptBrMatch[2]}-${monthNames[ptBrMatch[1]]}`;
  }
  
  return null;
}

/**
 * Extrai dados dos meses do price_periods do contrato
 */
function extractMonthDataFromContract(contract: ContractMock): Map<string, MonthData> {
  const monthDataMap = new Map<string, MonthData>();
  
  const pricePeriodsJson = contract.periodPrice?.price_periods;
  if (!pricePeriodsJson) return monthDataMap;
  
  try {
    let parsed = typeof pricePeriodsJson === 'string' 
      ? JSON.parse(pricePeriodsJson) 
      : pricePeriodsJson;
    
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    
    if (parsed?.periods) {
      parsed.periods.forEach((period: { months?: Array<{
        ym: string;
        volumeSeasonalizedMWh?: number;
        flexibilityMaxMWh?: number;
        flexibilityMinMWh?: number;
        price?: number;
      }> }) => {
        period.months?.forEach((month) => {
          if (month.ym) {
            const monthData = {
              volumeSeasonalizedMWh: month.volumeSeasonalizedMWh ?? null,
              flexibilityMaxMWh: month.flexibilityMaxMWh ?? null,
              flexibilityMinMWh: month.flexibilityMinMWh ?? null,
              price: month.price ?? null,
            };
            
            console.log(`[syncContractsBalances] 📅 Extraído mês ${month.ym}:`, {
              volumeSeasonalizedMWh: monthData.volumeSeasonalizedMWh,
              flexibilityMaxMWh: monthData.flexibilityMaxMWh,
              flexibilityMinMWh: monthData.flexibilityMinMWh,
              price: monthData.price,
              rawMonth: month, // Log completo do objeto month
            });
            
            monthDataMap.set(month.ym, monthData);
          }
        });
      });
    }
  } catch (error) {
    console.warn('[syncContractsBalances] Erro ao parsear price_periods:', error);
  }
  
  return monthDataMap;
}

/**
 * Sincroniza todos os contratos com seus balanços correspondentes
 */
export async function syncAllContractsWithBalances(
  contracts: ContractMock[]
): Promise<SyncResult> {
  const result: SyncResult = {
    totalBalances: 0,
    totalContracts: contracts.length,
    synced: 0,
    skipped: 0,
    errors: 0,
    items: [],
  };
  
  console.log('[syncContractsBalances] 🚀 Iniciando sincronização...');
  console.log(`[syncContractsBalances] 📋 Total de contratos: ${contracts.length}`);
  
  // Buscar todos os balanços
  let balances: Array<Record<string, unknown>> = [];
  try {
    balances = await getEnergyBalanceList();
    result.totalBalances = balances.length;
    console.log(`[syncContractsBalances] 📊 Total de balanços: ${balances.length}`);
  } catch (error) {
    console.error('[syncContractsBalances] ❌ Erro ao buscar balanços:', error);
    return result;
  }
  
  if (balances.length === 0) {
    console.log('[syncContractsBalances] ℹ️ Nenhum balanço encontrado');
    return result;
  }
  
  // Criar mapa de balanços por medidor
  const balancesByMeter = new Map<string, Array<Record<string, unknown>>>();
  
  for (const balance of balances) {
    const meter = String(
      balance.meter || balance.medidor || balance.groupName || ''
    ).toLowerCase().trim();
    
    if (!meter) continue;
    
    if (!balancesByMeter.has(meter)) {
      balancesByMeter.set(meter, []);
    }
    balancesByMeter.get(meter)!.push(balance);
  }
  
  console.log(`[syncContractsBalances] 🗂️ Medidores únicos: ${balancesByMeter.size}`);
  
  // Processar cada contrato
  for (const contract of contracts) {
    const medidor = extractMedidorFromContract(contract);
    
    if (!medidor) {
      console.log(`[syncContractsBalances] ⏭️ Contrato ${contract.codigo}: sem medidor`);
      continue;
    }
    
    const medidorKey = medidor.toLowerCase().trim();
    const matchingBalances = balancesByMeter.get(medidorKey) || [];
    
    if (matchingBalances.length === 0) {
      console.log(`[syncContractsBalances] ⏭️ Contrato ${contract.codigo}: nenhum balanço para medidor "${medidor}"`);
      continue;
    }
    
    console.log(`[syncContractsBalances] 📦 Contrato ${contract.codigo}: ${matchingBalances.length} balanços encontrados`);
    
    // Extrair dados dos meses do contrato
    const monthDataMap = extractMonthDataFromContract(contract);
    
    if (monthDataMap.size === 0) {
      console.log(`[syncContractsBalances] ⏭️ Contrato ${contract.codigo}: sem dados de meses configurados`);
      
      // Adicionar item de skip para cada balanço
      for (const balance of matchingBalances) {
        const balanceMonth = parseBalanceMonth(
          balance.month || balance.mes || balance.referenceBase
        );
        
        result.items.push({
          balanceId: String(balance.id || ''),
          balanceMonth: balanceMonth || 'N/A',
          contractId: contract.id,
          contractCode: contract.codigo || '',
          clientName: contract.cliente || '',
          medidor,
          status: 'skipped',
          message: 'Contrato sem volumes configurados',
        });
        result.skipped++;
      }
      continue;
    }
    
    // Processar cada balanço
    for (const balance of matchingBalances) {
      const balanceId = String(balance.id || '');
      const balanceMonth = parseBalanceMonth(
        balance.month || balance.mes || balance.referenceBase
      );
      const clientName = String(
        balance.clientName || balance.client_name || contract.cliente || ''
      );
      
      if (!balanceId) {
        result.items.push({
          balanceId: 'N/A',
          balanceMonth: balanceMonth || 'N/A',
          contractId: contract.id,
          contractCode: contract.codigo || '',
          clientName,
          medidor,
          status: 'skipped',
          message: 'Balanço sem ID',
        });
        result.skipped++;
        continue;
      }
      
      if (!balanceMonth) {
        result.items.push({
          balanceId,
          balanceMonth: 'N/A',
          contractId: contract.id,
          contractCode: contract.codigo || '',
          clientName,
          medidor,
          status: 'skipped',
          message: 'Mês do balanço não identificado',
        });
        result.skipped++;
        continue;
      }
      
      // Buscar dados do mês no contrato
      const monthData = monthDataMap.get(balanceMonth);
      
      console.log(`[syncContractsBalances] 📊 Dados extraídos do contrato para ${balanceMonth}:`, {
        volumeSeasonalizedMWh: monthData?.volumeSeasonalizedMWh,
        flexibilityMaxMWh: monthData?.flexibilityMaxMWh,
        flexibilityMinMWh: monthData?.flexibilityMinMWh,
        price: monthData?.price,
      });
      
      if (!monthData) {
        result.items.push({
          balanceId,
          balanceMonth,
          contractId: contract.id,
          contractCode: contract.codigo || '',
          clientName,
          medidor,
          status: 'skipped',
          message: `Mês ${balanceMonth} não configurado no contrato`,
        });
        result.skipped++;
        continue;
      }
      
      // Preparar payload de atualização
      const updatePayload: Record<string, unknown> = {};
      const updatedFields: string[] = [];
      
      // IMPORTANTE: Sempre envia o contractId para vincular o balanço ao contrato
      // Converte para número se o contract.id for string numérico
      const contractIdNum = typeof contract.id === 'string' && /^\d+$/.test(contract.id)
        ? Number(contract.id)
        : contract.id;
      updatePayload.contractId = contractIdNum;
      updatePayload.contract_id = contractIdNum;
      
      // IMPORTANTE: O campo 'contract' deve receber o CÓDIGO do contrato (ex: "2025-5443"), não o volume!
      // O volume vai no campo 'contrato'
      const contractCode = contract.codigo || contract.id;
      updatePayload.contract = contractCode;
      updatePayload.contractCode = contractCode;
      updatePayload.contract_code = contractCode;
      console.log(`[syncContractsBalances] 🔗 Vinculando balanço ${balanceId} ao contrato ${contractIdNum} (código: ${contractCode})`);
      updatedFields.push(`Contrato: ${contractCode}`);
      
      // O volume vai no campo 'contrato' (não em 'contract')
      if (monthData.volumeSeasonalizedMWh !== null && monthData.volumeSeasonalizedMWh !== undefined) {
        const volume = Number(monthData.volumeSeasonalizedMWh);
        if (!isNaN(volume) && isFinite(volume)) {
          updatePayload.contrato = volume;
          updatedFields.push(`Volume: ${volume.toFixed(2)} MWh`);
        }
      }
      if (monthData.flexibilityMaxMWh !== null && monthData.flexibilityMaxMWh !== undefined) {
        const maxDemand = Number(monthData.flexibilityMaxMWh);
        if (!isNaN(maxDemand) && isFinite(maxDemand)) {
          updatePayload.maxDemand = maxDemand;
          updatePayload.max_demand = maxDemand;
          updatePayload.maximo = maxDemand;
          updatedFields.push(`Máximo: ${maxDemand.toFixed(2)} MWh`);
          console.log(`[syncContractsBalances] ✅ max_demand será enviado como número: ${maxDemand} (tipo: ${typeof maxDemand})`);
        } else {
          console.log(`[syncContractsBalances] ⚠️ flexibilityMaxMWh não é um número válido: ${monthData.flexibilityMaxMWh}`);
        }
      } else {
        console.log(`[syncContractsBalances] ⚠️ flexibilityMaxMWh é null/undefined para ${balanceMonth}`);
      }
      if (monthData.flexibilityMinMWh !== null && monthData.flexibilityMinMWh !== undefined) {
        const minDemand = Number(monthData.flexibilityMinMWh);
        if (!isNaN(minDemand) && isFinite(minDemand)) {
          updatePayload.minDemand = minDemand;
          updatePayload.min_demand = minDemand;
          updatePayload.minimo = minDemand;
          updatedFields.push(`Mínimo: ${minDemand.toFixed(2)} MWh`);
          console.log(`[syncContractsBalances] ✅ min_demand será enviado como número: ${minDemand} (tipo: ${typeof minDemand})`);
        } else {
          console.log(`[syncContractsBalances] ⚠️ flexibilityMinMWh não é um número válido: ${monthData.flexibilityMinMWh}`);
        }
      } else {
        console.log(`[syncContractsBalances] ⚠️ flexibilityMinMWh é null/undefined para ${balanceMonth}`);
      }
      if (monthData.price !== null && monthData.price !== undefined) {
        const price = Number(monthData.price);
        if (!isNaN(price) && isFinite(price)) {
          updatePayload.price = price;
          updatePayload.preco = price;
          updatedFields.push(`Preço: R$ ${price.toFixed(2)}`);
        }
      }
      
      console.log(`[syncContractsBalances] 📦 Payload completo que será enviado:`, JSON.stringify(updatePayload, null, 2));
      
      if (Object.keys(updatePayload).length === 0) {
        result.items.push({
          balanceId,
          balanceMonth,
          contractId: contract.id,
          contractCode: contract.codigo || '',
          clientName,
          medidor,
          status: 'skipped',
          message: 'Nenhum dado para atualizar',
        });
        result.skipped++;
        continue;
      }
      
      // Atualizar balanço
      try {
        console.log(`[syncContractsBalances] 📤 Atualizando balanço ${balanceId} (${balanceMonth})`);
        console.log(`[syncContractsBalances] 📤 URL: /energy-balance/${balanceId}`);
        console.log(`[syncContractsBalances] 📤 Payload final (antes de stringify):`, updatePayload);
        console.log(`[syncContractsBalances] 📤 Payload final (JSON):`, JSON.stringify(updatePayload, null, 2));
        
        await energyBalanceRequest(`/energy-balance/${balanceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify(updatePayload),
        });
        
        result.items.push({
          balanceId,
          balanceMonth,
          contractId: contract.id,
          contractCode: contract.codigo || '',
          clientName,
          medidor,
          status: 'success',
          message: 'Balanço atualizado com sucesso',
          updatedFields,
        });
        result.synced++;
        
        console.log(`[syncContractsBalances] ✅ Balanço ${balanceId} atualizado`);
      } catch (error) {
        console.error(`[syncContractsBalances] ❌ Erro ao atualizar balanço ${balanceId}:`, error);
        
        result.items.push({
          balanceId,
          balanceMonth,
          contractId: contract.id,
          contractCode: contract.codigo || '',
          clientName,
          medidor,
          status: 'error',
          message: error instanceof Error ? error.message : 'Erro ao atualizar',
        });
        result.errors++;
      }
    }
  }
  
  console.log('[syncContractsBalances] ✅ Sincronização concluída:', {
    synced: result.synced,
    skipped: result.skipped,
    errors: result.errors,
  });
  
  return result;
}

