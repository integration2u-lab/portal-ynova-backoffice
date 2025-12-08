import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  X,
  Check,
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Zap,
} from 'lucide-react';
import { fetchIdpJobs, uploadLeadDocument, downloadFile } from '../services/idpApi';
import { getLeadStatusBadge } from '../utils/leadStatusMapper';
import type { IdpJob, Pagination } from '../types/idp';

// ============ Formatting Utilities ============

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatNumber = (
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = { maximumFractionDigits: 0 }
): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return new Intl.NumberFormat('pt-BR', options).format(value);
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const formatShortDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
};

const getStatusDisplay = (status: string): { label: string; className: string } => {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'Concluído',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      };
    case 'IN_PROGRESS':
      return {
        label: 'Processando',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      };
    case 'FAILED':
      return {
        label: 'Falhou',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      };
    default:
      return {
        label: status,
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      };
  }
};

// ============ Tab Type ============

type TabId = 'invoice' | 'lead' | 'upload';

// ============ Main Component ============

export default function InvoiceAnalysisPage() {
  // State for jobs list
  const [jobs, setJobs] = useState<IdpJob[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for modal
  const [selectedJob, setSelectedJob] = useState<IdpJob | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('invoice');

  // State for file upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch jobs on mount and page change
  const loadJobs = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchIdpJobs(page, 30);
      setJobs(response.data.items);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error loading jobs:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar faturas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs(currentPage);
  }, [currentPage, loadJobs]);

  // Modal handlers
  const openModal = (job: IdpJob) => {
    setSelectedJob(job);
    setActiveTab('invoice');
    setUploadFile(null);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const closeModal = () => {
    setSelectedJob(null);
    setActiveTab('invoice');
    setUploadFile(null);
    setUploadError(null);
    setUploadSuccess(false);
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedJob) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedJob]);

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && (!pagination || page <= pagination.totalPages)) {
      setCurrentPage(page);
    }
  };

  // File upload handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadError(null);
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedJob?.lead_data?.lead?.id) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await uploadLeadDocument(selectedJob.lead_data.lead.id, uploadFile, 'apresentacao');
      setUploadSuccess(true);
      setUploadFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setIsUploading(false);
    }
  };

  // Excel download handler
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownloadExcel = async (job: IdpJob, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (job.excel_s3_url && !isDownloading) {
      setIsDownloading(true);
      try {
        await downloadFile(job.excel_s3_url, job.excel_file_name || 'simulacao.xlsx');
      } finally {
        setIsDownloading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Análise de Faturas
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Visualize todas as faturas processadas pelo sistema IDP.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadJobs(currentPage)}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#2b3238] dark:text-gray-200 dark:hover:bg-[#111418] disabled:opacity-50"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Table Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 size={32} className="animate-spin text-yn-orange" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileText size={48} className="mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Nenhuma fatura encontrada
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              As faturas processadas aparecerão aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-[#2b3238]">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#1a1f24] dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">CNPJ</th>
                    <th className="px-4 py-3">Distribuidora</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Status Lead</th>
                    <th className="px-4 py-3">Processado em</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                  {jobs.map((job) => {
                    const statusDisplay = getStatusDisplay(job.status);
                    const leadStatus = job.lead_data?.lead?.status;
                    const leadBadge = leadStatus
                      ? getLeadStatusBadge(leadStatus)
                      : null;

                    return (
                      <tr
                        key={job.document_id}
                        onClick={() => openModal(job)}
                        className="cursor-pointer transition hover:bg-gray-50/70 dark:hover:bg-[#111418]"
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                          <span
                            className="block max-w-[200px] truncate"
                            title={job.extracted_data?.nome_cliente || '-'}
                          >
                            {job.extracted_data?.nome_cliente || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                          {job.extracted_data?.documento_cliente || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                          <span
                            className="block max-w-[150px] truncate"
                            title={job.extracted_data?.distribuidora || '-'}
                          >
                            {job.extracted_data?.distribuidora || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                          {formatCurrency(job.extracted_data?.valor_fatura)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                          {job.extracted_data?.periodo_fatura || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusDisplay.className}`}
                          >
                            {statusDisplay.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {leadBadge ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${leadBadge.badgeClass}`}
                            >
                              {leadBadge.label}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              Sem lead
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                          {formatShortDate(job.completed_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal(job);
                              }}
                              className="rounded p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-yn-orange dark:text-gray-400 dark:hover:bg-[#2b3238] dark:hover:text-yn-orange"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            {job.excel_s3_url && (
                              <button
                                type="button"
                                onClick={(e) => handleDownloadExcel(job, e)}
                                className="rounded p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-green-600 dark:text-gray-400 dark:hover:bg-[#2b3238] dark:hover:text-green-400"
                                title="Baixar Excel"
                              >
                                <Download size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-[#2b3238]">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.size + 1}
                  </span>{' '}
                  a{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.size, pagination.totalItems)}
                  </span>{' '}
                  de{' '}
                  <span className="font-medium">{pagination.totalItems}</span>{' '}
                  resultados
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={!pagination.hasPreviousPage}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2b3238] dark:text-gray-200 dark:hover:bg-[#111418]"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="px-2 text-sm text-gray-700 dark:text-gray-200">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2b3238] dark:text-gray-200 dark:hover:bg-[#111418]"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Full-Screen Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="h-screen w-screen overflow-auto bg-white dark:bg-[#111418]">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-[#2b3238] dark:bg-[#111418]">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Detalhes da Fatura
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedJob.extracted_data?.nome_cliente || 'Cliente não identificado'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedJob.excel_s3_url && (
                  <button
                    type="button"
                    onClick={() => handleDownloadExcel(selectedJob)}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Baixando...
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Baixar Excel
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#2b3238] dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 dark:border-[#2b3238] dark:bg-[#1a1f24]">
              <nav className="flex gap-4" aria-label="Tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('invoice')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
                    activeTab === 'invoice'
                      ? 'border-yn-orange text-yn-orange'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <FileText size={18} className="mr-2 inline-block" />
                  Resumo da Fatura
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('lead')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
                    activeTab === 'lead'
                      ? 'border-yn-orange text-yn-orange'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <User size={18} className="mr-2 inline-block" />
                  Dados do Lead
                  {selectedJob.lead_data?.lead && (
                    <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-green-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
                    activeTab === 'upload'
                      ? 'border-yn-orange text-yn-orange'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Upload size={18} className="mr-2 inline-block" />
                  Apresentação Revisada
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Tab 1: Invoice Summary */}
              {activeTab === 'invoice' && selectedJob.extracted_data && (
                <div className="space-y-6">
                  {/* Main Info Cards */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Client Information */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <User size={20} className="text-yn-orange" />
                        Informações do Cliente
                      </h3>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Nome:</dt>
                          <dd className="max-w-[300px] truncate text-right font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.nome_cliente}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Documento:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.documento_cliente || '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Código Cliente:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.codigo_cliente || '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Cód. Instalação:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.codigo_instalacao}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Address Information */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <MapPin size={20} className="text-yn-orange" />
                        Endereço
                      </h3>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Endereço:</dt>
                          <dd className="max-w-[300px] truncate text-right font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.address || '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Bairro:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.neighborhood || '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Cidade/Estado:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.city || '-'} /{' '}
                            {selectedJob.extracted_data.state || '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">CEP:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.zip_code || '-'}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Invoice Information */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <FileText size={20} className="text-yn-orange" />
                        Informações da Fatura
                      </h3>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Período:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.periodo_fatura}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Vencimento:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.data_vencimento || '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Valor:</dt>
                          <dd className="text-lg font-bold text-yn-orange">
                            {formatCurrency(selectedJob.extracted_data.valor_fatura)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Bandeira:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.bandeira_tarifaria || '-'}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Energy Information */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <Zap size={20} className="text-yn-orange" />
                        Informações Energéticas
                      </h3>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Distribuidora:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.distribuidora}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Modalidade:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.modalidade_tarifaria || '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Subgrupo:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.subgrupo || '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Demanda Contratada FP:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.demanda_contratada_fora_ponta
                              ? `${formatNumber(selectedJob.extracted_data.demanda_contratada_fora_ponta)} kW`
                              : '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Demanda Contratada P:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedJob.extracted_data.demanda_contratada_ponta
                              ? `${formatNumber(selectedJob.extracted_data.demanda_contratada_ponta)} kW`
                              : '-'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Taxes Table */}
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Tributos
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-[#2b3238]">
                        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#1a1f24] dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3 text-right">Alíquota (%)</th>
                            <th className="px-4 py-3 text-right">Valor (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                          <tr>
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">ICMS</td>
                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                              {formatNumber(selectedJob.extracted_data.tributos.icms.aliquota, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                              {formatCurrency(selectedJob.extracted_data.tributos.icms.valor)}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">PIS</td>
                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                              {formatNumber(selectedJob.extracted_data.tributos.pis.aliquota, { maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                              {formatCurrency(selectedJob.extracted_data.tributos.pis.valor)}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">COFINS</td>
                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                              {formatNumber(selectedJob.extracted_data.tributos.cofins.aliquota, { maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                              {formatCurrency(selectedJob.extracted_data.tributos.cofins.valor)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Consumption History */}
                  {selectedJob.extracted_data.historico_consumo.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Histórico de Consumo
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-[#2b3238]">
                          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#1a1f24] dark:text-gray-400">
                            <tr>
                              <th className="px-4 py-3">Mês</th>
                              <th className="px-4 py-3 text-right">Consumo Ponta (kWh)</th>
                              <th className="px-4 py-3 text-right">Consumo Fora Ponta (kWh)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                            {selectedJob.extracted_data.historico_consumo.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                                  {item.mes}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                                  {formatNumber(item.consumo_ponta_kwh)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                                  {formatNumber(item.consumo_fora_ponta_kwh)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Demand History */}
                  {selectedJob.extracted_data.historico_demanda.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Histórico de Demanda
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-[#2b3238]">
                          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#1a1f24] dark:text-gray-400">
                            <tr>
                              <th className="px-4 py-3">Mês</th>
                              <th className="px-4 py-3 text-right">Demanda Ponta (kW)</th>
                              <th className="px-4 py-3 text-right">Demanda Fora Ponta (kW)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                            {selectedJob.extracted_data.historico_demanda.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                                  {item.mes}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                                  {formatNumber(item.demanda_ponta_kw)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                                  {formatNumber(item.demanda_fora_ponta_kw)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Lead Data */}
              {activeTab === 'lead' && (
                <div className="space-y-6">
                  {selectedJob.lead_data?.lead ? (
                    <>
                      {/* Lead Info Cards */}
                      <div className="grid gap-6 lg:grid-cols-2">
                        {/* Lead Information */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            <User size={20} className="text-yn-orange" />
                            Informações do Lead
                          </h3>
                          <dl className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">ID:</dt>
                              <dd className="font-medium text-gray-900 dark:text-gray-100">
                                #{selectedJob.lead_data.lead.id}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">Nome:</dt>
                              <dd className="max-w-[300px] truncate text-right font-medium text-gray-900 dark:text-gray-100">
                                {selectedJob.lead_data.lead.name}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">CNPJ:</dt>
                              <dd className="font-medium text-gray-900 dark:text-gray-100">
                                {selectedJob.lead_data.lead.cnpj}
                              </dd>
                            </div>
                            <div className="flex justify-between items-center">
                              <dt className="text-gray-600 dark:text-gray-400">Status:</dt>
                              <dd>
                                {(() => {
                                  const badge = getLeadStatusBadge(selectedJob.lead_data.lead.status);
                                  return (
                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge.badgeClass}`}>
                                      {badge.label}
                                    </span>
                                  );
                                })()}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">Unidade Consumidora:</dt>
                              <dd className="font-medium text-gray-900 dark:text-gray-100">
                                {selectedJob.lead_data.lead.consumer_unit}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Contact Information */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            <Phone size={20} className="text-yn-orange" />
                            Contato
                          </h3>
                          <dl className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                              <dt className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Mail size={16} />
                                Email:
                              </dt>
                              <dd className="font-medium text-gray-900 dark:text-gray-100">
                                {selectedJob.lead_data.lead.email}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Phone size={16} />
                                Telefone:
                              </dt>
                              <dd className="font-medium text-gray-900 dark:text-gray-100">
                                {selectedJob.lead_data.lead.phone}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">Cidade/Estado:</dt>
                              <dd className="font-medium text-gray-900 dark:text-gray-100">
                                {selectedJob.lead_data.lead.city || '-'} /{' '}
                                {selectedJob.lead_data.lead.state || '-'}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Energy Information */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            <Zap size={20} className="text-yn-orange" />
                            Informações Energéticas
                          </h3>
                          <dl className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">Valor da Fatura:</dt>
                              <dd className="font-bold text-yn-orange">
                                {formatCurrency(selectedJob.lead_data.lead.invoice_amount)}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">Valor Energia:</dt>
                              <dd className="font-medium text-gray-900 dark:text-gray-100">
                                {formatNumber(selectedJob.lead_data.lead.energy_value)} kWh
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">Mês/Ano Referência:</dt>
                              <dd className="font-medium text-gray-900 dark:text-gray-100">
                                {selectedJob.lead_data.lead.month}/{selectedJob.lead_data.lead.year}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">Geração Solar:</dt>
                              <dd className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${selectedJob.lead_data.lead.has_solar_generation ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {selectedJob.lead_data.lead.has_solar_generation ? 'Sim' : 'Não'}
                                </span>
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Contract Information */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            <Building2 size={20} className="text-yn-orange" />
                            Contrato
                          </h3>
                          <dl className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">Contrato Assinado:</dt>
                              <dd className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${selectedJob.lead_data.lead.contract_signed ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {selectedJob.lead_data.lead.contract_signed ? 'Sim' : 'Não'}
                                </span>
                              </dd>
                            </div>
                            {selectedJob.lead_data.lead.contract_id && (
                              <div className="flex justify-between">
                                <dt className="text-gray-600 dark:text-gray-400">ID do Contrato:</dt>
                                <dd className="font-medium text-gray-900 dark:text-gray-100">
                                  {selectedJob.lead_data.lead.contract_id}
                                </dd>
                              </div>
                            )}
                            {selectedJob.lead_data.lead.consultant_id && (
                              <div className="flex justify-between">
                                <dt className="text-gray-600 dark:text-gray-400">ID do Consultor:</dt>
                                <dd className="font-medium text-gray-900 dark:text-gray-100">
                                  #{selectedJob.lead_data.lead.consultant_id}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>

                      {/* Observations */}
                      {selectedJob.lead_data.lead.observations && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Observações
                          </h3>
                          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                            {selectedJob.lead_data.lead.observations}
                          </p>
                        </div>
                      )}

                      {/* Lead Invoices */}
                      {selectedJob.lead_data.invoices.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Faturas Vinculadas ({selectedJob.lead_data.invoices.length})
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-[#2b3238]">
                              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#1a1f24] dark:text-gray-400">
                                <tr>
                                  <th className="px-4 py-3">Arquivo</th>
                                  <th className="px-4 py-3 text-right">Valor</th>
                                  <th className="px-4 py-3 text-center">Simulação</th>
                                  <th className="px-4 py-3 text-center">Proposta</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                                {selectedJob.lead_data.invoices.map((invoice) => (
                                  <tr key={invoice.id}>
                                    <td className="px-4 py-3">
                                      <span className="block max-w-[250px] truncate font-medium text-gray-800 dark:text-gray-100" title={invoice.filename_original}>
                                        {invoice.filename_original}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                                      {formatCurrency(invoice.invoice_amount)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {invoice.simulation ? (
                                        <Check size={18} className="mx-auto text-green-500" />
                                      ) : (
                                        <X size={18} className="mx-auto text-gray-400" />
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {invoice.proposal ? (
                                        <Check size={18} className="mx-auto text-green-500" />
                                      ) : (
                                        <X size={18} className="mx-auto text-gray-400" />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Lead Documents */}
                      {selectedJob.lead_data.documents.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Documentos Vinculados ({selectedJob.lead_data.documents.length})
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-[#2b3238]">
                              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#1a1f24] dark:text-gray-400">
                                <tr>
                                  <th className="px-4 py-3">Arquivo</th>
                                  <th className="px-4 py-3">Tipo</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                                {selectedJob.lead_data.documents.map((doc) => (
                                  <tr key={doc.id}>
                                    <td className="px-4 py-3">
                                      <span className="block max-w-[300px] truncate font-medium text-gray-800 dark:text-gray-100" title={doc.filename_original}>
                                        {doc.filename_original}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                                      {doc.document_type}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                      <User size={48} className="mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        Sem lead vinculado
                      </h3>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Esta fatura ainda não possui um lead associado no sistema.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Upload Apresentação */}
              {activeTab === 'upload' && (
                <div className="space-y-6">
                  {selectedJob.lead_data?.lead ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <Upload size={20} className="text-yn-orange" />
                        Upload de Apresentação Revisada
                      </h3>
                      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                        Envie a apresentação revisada para o lead{' '}
                        <strong>{selectedJob.lead_data.lead.name}</strong>. Se já existir uma
                        apresentação, ela será substituída.
                      </p>

                      {/* Upload Success */}
                      {uploadSuccess && (
                        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200">
                          <Check size={18} />
                          Apresentação enviada com sucesso!
                        </div>
                      )}

                      {/* Upload Error */}
                      {uploadError && (
                        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                          <AlertCircle size={18} />
                          {uploadError}
                        </div>
                      )}

                      {/* File Input */}
                      <div className="mb-6">
                        <label
                          htmlFor="apresentacao-file"
                          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Arquivo (PDF ou PowerPoint)
                        </label>
                        <input
                          ref={fileInputRef}
                          id="apresentacao-file"
                          type="file"
                          accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                          onChange={handleFileChange}
                          disabled={isUploading}
                          className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-700 file:mr-4 file:border-0 file:bg-yn-orange file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-yn-orange/90 focus:outline-none dark:border-[#2b3238] dark:bg-[#111418] dark:text-gray-200"
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Tamanho máximo: 10MB
                        </p>
                      </div>

                      {/* Selected File Info */}
                      {uploadFile && (
                        <div className="mb-6 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#2b3238] dark:bg-[#111418]">
                          <FileText size={18} className="text-gray-500" />
                          <span className="flex-1 truncate text-sm text-gray-700 dark:text-gray-200">
                            {uploadFile.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      )}

                      {/* Upload Button */}
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={!uploadFile || isUploading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-yn-orange px-6 py-3 text-sm font-semibold text-white transition hover:bg-yn-orange/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            Enviar Apresentação
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                      <AlertCircle size={48} className="mb-4 text-yellow-500" />
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        Upload não disponível
                      </h3>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        É necessário ter um lead vinculado para enviar a apresentação revisada.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

