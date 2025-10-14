import React, { ChangeEvent, useMemo, useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  FileText,
  Upload,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react';

type Etapa = 'upload' | 'processamento' | 'dados';

type Tributo = {
  valor: number;
  aliquota: number;
};

type Tributos = {
  icms: Tributo;
  pis: Tributo;
  cofins: Tributo;
};

type HistoricoConsumo = {
  mes: string;
  consumo_ponta_kwh: number;
  consumo_fora_ponta_kwh: number;
};

type HistoricoDemanda = {
  mes: string;
  demanda_ponta_kw: number;
  demanda_fora_ponta_kw: number;
};

type ExtractedData = {
  modalidade_tarifaria: string;
  address: string;
  valor_fatura: number;
  city: string;
  codigo_instalacao: string;
  extracted_at: string;
  demanda_contratada_ponta: number | null;
  nome_cliente: string;
  distribuidora_origem: string;
  documento_cliente: string;
  document_id: string;
  data_vencimento: string;
  tributos: Tributos;
  codigo_cliente: string | null;
  zip_code: string;
  historico_consumo: HistoricoConsumo[];
  historico_demanda: HistoricoDemanda[];
  subgrupo: string;
  distribuidora: string;
  periodo_fatura: string;
  bandeira_tarifaria: string;
  neighborhood: string;
  state: string;
  demanda_contratada_fora_ponta: number;
};

type ProcessingStatus = {
  file_size_bytes: number;
  textract_output_bucket: string;
  file_size_mb: number;
  s3_bucket: string;
  page_count: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  document_id: string;
  job_id: string;
  textract_output_prefix: string;
  s3_key: string;
  started_at: string;
  completed_at?: string;
  excel_file_name?: string;
  excel_file_size_bytes?: number;
  excel_generated_at?: string;
  excel_s3_url?: string;
  extracted_data?: ExtractedData;
};

const formatCurrency = (value: number | null | undefined) => {
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
  options: Intl.NumberFormatOptions = {
    maximumFractionDigits: 0,
  },
) => {
  if (value === null || value === undefined) {
    return '-';
  }

  return new Intl.NumberFormat('pt-BR', options).format(value);
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function InvoiceProcessingPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('upload');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const currentStepIndex = useMemo(() => {
    const order: Etapa[] = ['upload', 'processamento', 'dados'];
    return order.indexOf(etapa);
  }, [etapa]);

  // Cleanup polling and Object URLs on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      // Clean up Object URL to prevent memory leaks
      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
      }
    };
  }, [pdfObjectUrl]);

  // Elapsed time counter
  useEffect(() => {
    if (isPolling && startTimeRef.current) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPolling]);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const convertFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const createObjectUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const processFile = async (file: File) => {
    // Prevent multiple simultaneous uploads
    if (isUploading) {
      return;
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      setUploadError('Por favor, selecione apenas arquivos PDF.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('O arquivo deve ter no máximo 10MB.');
      return;
    }

    setArquivo(file);
    setUploadError(null);
    setIsUploading(true);

    try {
      // Generate UUID for document_id
      const documentId = crypto.randomUUID();
      setDocumentId(documentId);

      // Convert file to base64 for API
      const base64File = await convertFileToBase64(file);
      
      // For PDF viewer, use Object URL for larger files (>1MB) to avoid memory issues
      if (file.size > 1024 * 1024) { // 1MB threshold
        const objectUrl = createObjectUrl(file);
        setPdfObjectUrl(objectUrl);
        setPdfDataUrl(null);
      } else {
        const dataUrl = await convertFileToDataUrl(file);
        setPdfDataUrl(dataUrl);
        setPdfObjectUrl(null);
      }

      // Prepare request payload
      const payload = {
        base64_file: `data:application/pdf;base64,${base64File}`,
        filename: file.name,
        document_id: documentId,
      };

      // Make API call
      const response = await fetch('https://api.ynovamarketplace.com/api/idp/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro no upload: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro no processamento do documento');
      }

      // Success - advance to processing step
      setEtapa('processamento');
      startPolling(documentId);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Erro desconhecido no upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isUploading) {
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await processFile(file);
  };

  const startPolling = (docId: string) => {
    setIsPolling(true);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    setProcessingError(null);

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `https://d7eqdg7oj5.execute-api.us-east-2.amazonaws.com/dev/document/${docId}`
        );

        if (!response.ok) {
          throw new Error(`Erro na consulta: ${response.status} ${response.statusText}`);
        }

        const status: ProcessingStatus = await response.json();
        setProcessingStatus(status);

        // Check completion criteria
        if (status.status === 'COMPLETED' && status.excel_s3_url) {
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setEtapa('dados');
        } else if (status.status === 'FAILED') {
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setProcessingError('Falha no processamento do documento. Tente novamente.');
        }

      } catch (error) {
        console.error('Polling error:', error);
        setProcessingError(error instanceof Error ? error.message : 'Erro na consulta do status');
      }
    };

    // Initial poll
    pollStatus();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(pollStatus, 5000);
  };

  const handleReset = () => {
    setArquivo(null);
    setDocumentId(null);
    setProcessingStatus(null);
    setEtapa('upload');
    setUploadError(null);
    setProcessingError(null);
    setElapsedTime(0);
    setIsUploading(false);
    setIsPolling(false);
    setPdfDataUrl(null);
    
    // Clean up Object URL to prevent memory leaks
    if (pdfObjectUrl) {
      URL.revokeObjectURL(pdfObjectUrl);
      setPdfObjectUrl(null);
    }
    
    setIsDragOver(false);
    setIsSidebarCollapsed(false);
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    startTimeRef.current = null;
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const steps = useMemo(
    () => [
      { id: 'upload' as Etapa, label: 'Upload de Dados' },
      { id: 'processamento' as Etapa, label: 'Processamento OCR' },
      { id: 'dados' as Etapa, label: 'Dados Extraídos' },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Análise de Fatura</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Envie uma fatura de energia em PDF para extração automática de dados.
          </p>
        </div>
        <div className="flex gap-2">
          {etapa === 'dados' && (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#2b3238] dark:text-gray-200 dark:hover:bg-[#111418]"
            >
              {isSidebarCollapsed ? (
                <>
                  <Eye size={18} />
                  Mostrar dados
                </>
              ) : (
                <>
                  <Eye size={18} />
                  Ocultar dados
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#2b3238] dark:text-gray-200 dark:hover:bg-[#111418]"
          >
            <RefreshCw size={18} />
            Nova fatura
          </button>
        </div>
      </div>

      <nav aria-label="Etapas do processamento" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
        <ol className="flex flex-col gap-4 md:flex-row md:items-center">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isActive = index === currentStepIndex;

            const circleClasses = isCompleted
              ? 'bg-yn-blue text-white'
              : isActive
              ? 'bg-yn-orange text-white'
              : 'bg-gray-200 text-gray-600 dark:bg-[#2b3238] dark:text-gray-300';

            const connectorClasses = isCompleted
              ? 'bg-yn-orange'
              : isActive
              ? 'bg-yn-orange/60'
              : 'bg-gray-200 dark:bg-[#2b3238]';

            return (
              <li key={step.id} className="flex flex-1 items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold transition-colors ${circleClasses}`}>
                  {isCompleted ? <Check size={22} /> : index + 1}
                </div>
                <div className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">{step.label}</div>
                {index < steps.length - 1 && (
                  <div className="hidden flex-1 md:block">
                    <div className={`h-1 rounded-full ${connectorClasses}`} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Upload */}
      {etapa === 'upload' && (
        <section 
          className={`rounded-xl border border-dashed p-10 text-center shadow-sm transition-colors ${
            isDragOver 
              ? 'border-yn-orange bg-yn-orange/5 dark:border-yn-orange dark:bg-yn-orange/10' 
              : 'border-yn-orange/40 bg-white dark:border-yn-orange/30 dark:bg-[#1a1f24]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
            isDragOver ? 'bg-yn-orange text-white' : 'bg-yn-orange/10 text-yn-orange'
          }`}>
            <Upload size={32} />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isDragOver ? 'Solte o arquivo PDF aqui' : 'Carregue a fatura de energia'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {isDragOver 
              ? 'Arquivo detectado! Solte para fazer o upload.' 
              : 'Arraste e solte o arquivo PDF aqui ou clique no botão abaixo para escolher uma fatura.'
            }
          </p>
          
          {uploadError && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
              <AlertCircle size={16} />
              {uploadError}
            </div>
          )}

          <label className={`mt-6 inline-flex cursor-pointer items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
            isUploading 
              ? 'bg-gray-400 text-white cursor-not-allowed opacity-50' 
              : 'bg-yn-orange text-white hover:bg-yn-orange/90'
          }`}>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileUpload} 
              className="hidden" 
              disabled={isUploading}
            />
            {isUploading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload size={18} />
                Selecionar arquivo PDF
              </>
            )}
          </label>
          
          {arquivo && !isUploading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <FileText size={16} />
              <span className="truncate font-medium">{arquivo.name}</span>
              <span className="text-gray-500">({formatFileSize(arquivo.size)})</span>
            </div>
          )}
        </section>
      )}

      {/* Step 2: Processing */}
      {etapa === 'processamento' && (
        <section className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yn-orange/10 text-yn-orange">
                <RefreshCw size={24} className="animate-spin" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Processando documento</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Aguarde enquanto extraímos os dados da fatura enviada...
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Clock size={16} />
                  <span className="font-mono">{formatElapsedTime(elapsedTime)}</span>
                </div>
              </div>
            </div>

            {processingError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                <AlertCircle size={16} />
                {processingError}
              </div>
            )}

            {processingStatus && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-[#2b3238] dark:bg-[#111418]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Status
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {processingStatus.status === 'IN_PROGRESS' ? 'Processando' : 
                     processingStatus.status === 'COMPLETED' ? 'Concluído' : 'Falhou'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 dark:border-[#2b3238] dark:bg-[#111418]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Páginas
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatNumber(processingStatus.page_count)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 dark:border-[#2b3238] dark:bg-[#111418]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Tamanho
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatFileSize(processingStatus.file_size_bytes)}
                  </p>
                </div>
                 <div className="rounded-lg border border-gray-200 p-4 dark:border-[#2b3238] dark:bg-[#111418]">
                   <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                     Document ID
                   </p>
                   <p className="mt-1 text-xs font-mono text-gray-900 dark:text-gray-100 break-all">
                     {processingStatus.document_id}
                   </p>
                 </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 3: Extracted Data */}
      {etapa === 'dados' && processingStatus?.extracted_data && (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dados extraídos com sucesso</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Revise os dados extraídos da fatura e faça o download da planilha de simulação.
              </p>
            </div>
            {processingStatus.excel_s3_url && (
              <a
                href={processingStatus.excel_s3_url}
                download={processingStatus.excel_file_name || 'simulacao.xlsx'}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-yn-orange px-6 py-3 text-sm font-semibold text-white transition hover:bg-yn-orange/90"
              >
                <Download size={18} />
                Download Planilha de Simulação
              </a>
            )}
          </div>

          <div className={`grid gap-6 transition-all duration-300 ${
            isSidebarCollapsed 
              ? 'lg:grid-cols-1' 
              : 'lg:grid-cols-2'
          }`}>
            {/* PDF Viewer */}
            <div className={`rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24] ${
              isSidebarCollapsed ? 'p-2' : 'p-6'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Eye size={20} className="text-yn-orange" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Fatura Original</h3>
              </div>
              <div className={`w-full ${
                isSidebarCollapsed 
                  ? 'h-[calc(100vh-120px)]' 
                  : 'h-[calc(100vh-300px)]'
              }`}>
                {(pdfDataUrl || pdfObjectUrl) ? (
                  <iframe
                    src={pdfDataUrl || pdfObjectUrl || ''}
                    className="w-full h-full rounded-lg border border-gray-200 dark:border-[#2b3238]"
                    title="Fatura PDF"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50 dark:bg-[#111418] rounded-lg border border-gray-200 dark:border-[#2b3238] flex items-center justify-center">
                    <div className="text-center p-8">
                      <FileText size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Carregando PDF...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Data and Tables - Only show when sidebar is not collapsed */}
            {!isSidebarCollapsed && (
              <div className="space-y-6">
                {/* Customer Information */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Informações do Cliente</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Nome:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.nome_cliente}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Documento:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.documento_cliente}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Código do Cliente:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.codigo_cliente || '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Endereço:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100 text-right">
                        {processingStatus.extracted_data.address}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Bairro:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.neighborhood}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Cidade/Estado:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.city}/{processingStatus.extracted_data.state}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">CEP:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.zip_code}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Invoice Information */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Informações da Fatura</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Período:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.periodo_fatura}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Vencimento:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.data_vencimento}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Valor da Fatura:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(processingStatus.extracted_data.valor_fatura)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Modalidade:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.modalidade_tarifaria}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Bandeira:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.bandeira_tarifaria}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Distribuidora:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100 text-right">
                        {processingStatus.extracted_data.distribuidora}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Código Instalação:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.codigo_instalacao}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Subgrupo:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.subgrupo}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Demanda Contratada FP:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatNumber(processingStatus.extracted_data.demanda_contratada_fora_ponta)} kW
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-300">Demanda Contratada P:</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {processingStatus.extracted_data.demanda_contratada_ponta 
                          ? `${formatNumber(processingStatus.extracted_data.demanda_contratada_ponta)} kW`
                          : '-'
                        }
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Taxes Table */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tributos</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-[#2b3238]">
                      <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#1a1f24] dark:text-gray-300">
                        <tr>
                          <th className="px-4 py-3">Tipo de Tributo</th>
                          <th className="px-4 py-3 text-right">Alíquota (%)</th>
                          <th className="px-4 py-3 text-right">Valor (R$)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                        <tr>
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">ICMS</td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                            {formatNumber(processingStatus.extracted_data.tributos.icms.aliquota, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                            {formatCurrency(processingStatus.extracted_data.tributos.icms.valor)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">PIS</td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                            {formatNumber(processingStatus.extracted_data.tributos.pis.aliquota, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                            {formatCurrency(processingStatus.extracted_data.tributos.pis.valor)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">COFINS</td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                            {formatNumber(processingStatus.extracted_data.tributos.cofins.aliquota, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                            {formatCurrency(processingStatus.extracted_data.tributos.cofins.valor)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Consumption History Table */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Histórico de Consumo</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-[#2b3238]">
                      <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#1a1f24] dark:text-gray-300">
                        <tr>
                          <th className="px-4 py-3">Mês</th>
                          <th className="px-4 py-3 text-right">Consumo Ponta (kWh)</th>
                          <th className="px-4 py-3 text-right">Consumo Fora Ponta (kWh)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                        {processingStatus.extracted_data.historico_consumo.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50/70 dark:hover:bg-[#111418]">
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                              {item.mes}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                              {formatNumber(Math.floor(item.consumo_ponta_kwh), {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                              {formatNumber(Math.floor(item.consumo_fora_ponta_kwh), {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Demand History Table */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Histórico de Demanda</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-[#2b3238]">
                      <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#1a1f24] dark:text-gray-300">
                        <tr>
                          <th className="px-4 py-3">Mês</th>
                          <th className="px-4 py-3 text-right">Demanda Ponta (kW)</th>
                          <th className="px-4 py-3 text-right">Demanda Fora Ponta (kW)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                        {processingStatus.extracted_data.historico_demanda.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50/70 dark:hover:bg-[#111418]">
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                              {item.mes}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                              {formatNumber(Math.floor(item.demanda_ponta_kw), {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                              {formatNumber(Math.floor(item.demanda_fora_ponta_kw), {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
