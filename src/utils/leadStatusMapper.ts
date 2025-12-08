/**
 * Lead status mapping utility
 * Maps raw status strings to display labels and badge styling
 */

export interface StageDefinition {
  key: string;
  label: string;
  badgeClass: string;
  statuses: readonly string[];
}

export const stageDefinitions: readonly StageDefinition[] = [
  {
    key: 'prospeccao',
    label: 'Prospecção',
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    statuses: ['appointmentscheduled', 'novo', 'prospeccao', 'prospecting'],
  },
  {
    key: 'fatura',
    label: 'Fatura',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    statuses: ['1142458134', 'fatura', 'invoice'],
  },
  {
    key: 'qualificado',
    label: 'Qualificado',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    statuses: ['qualifiedtobuy', 'qualificado', 'qualificacao', 'qualification'],
  },
  {
    key: 'apresentacao',
    label: 'Apresentação',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    statuses: ['1142458135', 'apresentacao', 'apresentação', 'apresentacao realizada'],
  },
  {
    key: 'negociacao',
    label: 'Negociação',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    statuses: ['decisionmakerboughtin', 'negociacao', 'negotiation'],
  },
  {
    key: 'fechamento',
    label: 'Fechamento',
    badgeClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    statuses: ['presentationscheduled', 'fechamento', 'fechamento agendado'],
  },
  {
    key: 'em_assinatura',
    label: 'Em assinatura',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    statuses: ['contractsent', 'emassinatura', 'em assinatura', 'assinatura'],
  },
  {
    key: 'nutricao',
    label: 'Nutrição',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    statuses: [
      'closedwon',
      'nutricao',
      'nutrição',
      'nurturing',
      'fechado',
      'fechado ganho',
      'fechado_ganho',
      'won',
      'ganho',
    ],
  },
  {
    key: 'contrato_gestao_ok',
    label: 'Contrato Gestão ok',
    badgeClass: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
    statuses: ['1173301169', 'contrato gestao', 'contrato gestao ok'],
  },
  {
    key: 'contrato_energia_ok',
    label: 'Contrato Energia ok',
    badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    statuses: ['1173301170', 'contrato energia', 'contrato energia ok'],
  },
  {
    key: 'perdido',
    label: 'Perdido',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    statuses: ['1173301171', 'closedlost', 'perdido', 'lost', 'fechado perdido', 'fechado_perdido'],
  },
] as const;

// Default stage for unknown statuses
const defaultStage: StageDefinition = {
  key: 'unknown',
  label: 'Desconhecido',
  badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  statuses: [],
};

/**
 * Find the stage definition for a given status string
 * @param status - The raw status string from the lead
 * @returns The matching StageDefinition or the default stage
 */
export function getLeadStage(status: string | null | undefined): StageDefinition {
  if (!status) return defaultStage;
  
  const normalizedStatus = status.toLowerCase().trim();
  
  for (const stage of stageDefinitions) {
    if (stage.statuses.some(s => s.toLowerCase() === normalizedStatus)) {
      return stage;
    }
  }
  
  return defaultStage;
}

/**
 * Get the display label and badge classes for a lead status
 * @param status - The raw status string from the lead
 * @returns Object with label and badgeClass
 */
export function getLeadStatusBadge(status: string | null | undefined): {
  label: string;
  badgeClass: string;
} {
  const stage = getLeadStage(status);
  return {
    label: stage.label,
    badgeClass: stage.badgeClass,
  };
}

/**
 * Check if a status belongs to a specific stage key
 * @param status - The raw status string
 * @param stageKey - The stage key to check against
 * @returns boolean indicating if status belongs to the stage
 */
export function isStatusInStage(status: string | null | undefined, stageKey: string): boolean {
  if (!status) return false;
  const stage = getLeadStage(status);
  return stage.key === stageKey;
}

