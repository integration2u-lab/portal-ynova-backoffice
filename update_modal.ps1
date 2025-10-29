 = 'src/pages/contratos/CreateContractModal.tsx'
 = Get-Content  -Raw
 = "  const validate = React.useCallback\(\(\) => \{[\s\S]*?\n  if \(!open\) return null;"
 = @"
  const validate = React.useCallback(() => {
    const nextErrors: FormErrors = {};
  // invoices removed

    if (!formState.razaoSocial.trim()) {
      nextErrors.razaoSocial = 'Informe a razão social';
    }

    if (!formState.client.trim()) {
      nextErrors.client = 'Informe o cliente';
    }

    if (!formState.contractCode.trim()) {
      nextErrors.contractCode = 'Informe o código do contrato';
    }

    if (!isValidCnpj(formState.cnpj)) {
      nextErrors.cnpj = 'Informe um CNPJ válido';
    }

    const volumeValue = Number(formState.volume);
    if (!Number.isFinite(volumeValue) || volumeValue <= 0) {
      nextErrors.volume = 'Informe um volume maior que zero';
    }

    if (!formState.startDate) {
      nextErrors.startDate = 'Informe o início da vigência';
    }

    if (!formState.endDate) {
      nextErrors.endDate = 'Informe o fim da vigência';
    }

    if (formState.startDate && formState.endDate) {
      const start = new Date(${formState.startDate}T00:00:00);
      const end = new Date(${formState.endDate}T00:00:00);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        nextErrors.endDate = 'O fim deve ser maior ou igual ao início';
      }
    }

    const upper = Number(formState.upperLimit);
    const lower = Number(formState.lowerLimit);
    const flex = Number(formState.flexibility);

    if (!Number.isFinite(upper) || upper < 0 || upper > 500) {
      nextErrors.upperLimit = 'Limite superior deve estar entre 0% e 500%';
    }

    if (!Number.isFinite(lower) || lower < 0 || lower > 500) {
      nextErrors.lowerLimit = 'Limite inferior deve estar entre 0% e 500%';
    }

    if (!Number.isFinite(flex) || flex < 0 || flex > 500) {
      nextErrors.flexibility = 'Flexibilidade deve estar entre 0% e 500%';
    }

    if (
      Number.isFinite(upper) &&
      Number.isFinite(lower) &&
      upper >= 0 &&
      lower >= 0 &&
      upper <= 500 &&
      lower <= 500 &&
      upper < lower
    ) {
      nextErrors.upperLimit = 'Limite superior deve ser maior ou igual ao inferior';
    }

    const supplierSelection = formState.supplierSelection;
    const supplierCandidate =
      supplierSelection === CUSTOM_SUPPLIER_OPTION
        ? formState.customSupplier.trim()
        : formState.supplier.trim();
    if (!supplierSelection) {
      nextErrors.supplier = 'Selecione um fornecedor';
    } else if (supplierSelection === CUSTOM_SUPPLIER_OPTION && !formState.customSupplier.trim()) {
      nextErrors.customSupplier = 'Informe o novo fornecedor';
    } else if (!supplierCandidate) {
      nextErrors.supplier = 'Selecione um fornecedor';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formState]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const isValid = validate();
    if (!isValid) return;

    const id = ensureId();
    const codigo = formState.contractCode.trim() || id;
    const razaoSocial = formState.razaoSocial.trim();
    const supplierSelection = formState.supplierSelection;
    const supplierValue =
      supplierSelection === CUSTOM_SUPPLIER_OPTION
        ? formState.customSupplier.trim()
        : formState.supplier.trim();

    const periodsAverage = priceSummary.averagePrice ?? 0;
    const flatAverage = parseCurrencyInput(formState.flatPrice) ?? 0;
    const priceAverage = priceSummary.filledMonths ? periodsAverage : flatAverage;
    const referenceMonths = deriveReferenceMonths(formState);
    const priceSummaryText = priceAverage ? formatCurrencyBRL(priceAverage) : 'Não informado';

    const volumeValue = Number(formState.volume);
    const normalizedVolume =
      formState.volumeUnit === 'MW_MEDIO' ? volumeValue * HOURS_IN_MONTH : volumeValue;

    const proinfaNumber = parseProinfa(formState.proinfa);
    const proinfaDisplay =
      proinfaNumber === null
        ? 'Não informado'
        : proinfaNumber.toLocaleString('pt-BR', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          });

    const startMonth = formState.startDate ? formState.startDate.slice(0, 7) : '';
    const endMonth = formState.endDate ? formState.endDate.slice(0, 7) : '';

    const dadosContrato = [
      { label: 'Razão social', value: razaoSocial || 'Não informado' },
      { label: 'Cliente', value: formState.client.trim() || 'Não informado' },
      { label: 'Código do contrato', value: codigo || 'Não informado' },
      { label: 'CNPJ', value: formState.cnpj.trim() || 'Não informado' },
      { label: 'Segmento', value: formState.segment.trim() || 'Não informado' },
      { label: 'Modalidade', value: formState.modality.trim() || 'Não informado' },
      { label: 'Fonte de energia', value: formState.energySource },
      { label: 'Fornecedor', value: supplierValue || 'Não informado' },
      { label: 'Proinfa', value: proinfaDisplay },
      {
        label: 'Vigência',
        value:
          startMonth && endMonth
            ? ${formatMesLabel(startMonth)} - 
            : 'Não informado',
      },
      // ciclo de faturamento removed
      { label: 'Medidor', value: formState.medidor.trim() || 'Não informado' },
      {
        label: 'Flex / Limites',
        value: ${formState.flexibility || '0'}% (% - %),
      },
      {
        label: 'Volume contratado',
        value: Number.isFinite(volumeValue)
          ? ${volumeFormatter.format(volumeValue)} 
          : 'Não informado',
      },
      { label: 'Preço flat (R$/MWh)', value: priceSummaryText },
      { label: 'Responsável', value: formState.contact.trim() || 'Não informado' },
    ];

    const defaultStatus = obrigacaoColunas.slice(1).reduce<Record<string, StatusResumo>>((acc, col) => {
      acc[col] = 'Em análise';
      return acc;
    }, {} as Record<string, StatusResumo>);

    const historicoDemanda: ContractMock['historicoDemanda'] = [];
    const historicoConsumo: ContractMock['historicoConsumo'] = [];

    const invoices: ContractMock['faturas'] = [];

    const newContract: ContractMock = {
      id,
      codigo,
      razaoSocial: razaoSocial || formState.client.trim(),
      cliente: formState.client.trim(),
      cnpj: formState.cnpj.trim(),
      segmento: formState.segment.trim(),
      contato: formState.contact.trim(),
      status: formState.status,
      fonte: formState.energySource,
      modalidade: formState.modality.trim(),
      inicioVigencia: formState.startDate,
      fimVigencia: formState.endDate,
      limiteSuperior: ${formState.upperLimit || '0'}%,
      limiteInferior: ${formState.lowerLimit || '0'}%,
      flex: ${formState.flexibility || '0'}%,
      precoMedio: priceAverage,
      fornecedor: supplierValue,
      proinfa: proinfaNumber,
      cicloFaturamento: '',
      periodos: referenceMonths,
      resumoConformidades: { ...formState.resumoConformidades },
      kpis: [
        { label: 'Consumo acumulado', value: ${volumeFormatter.format(0)} MWh, helper: 'Contrato recém-criado' },
        { label: 'Receita Prevista', value: formatCurrencyBRL(0) },
        { label: 'Economia vs Cativo', value: formatCurrencyBRL(0) },
        { label: 'Variação mensal', value: '0%' },
      ],
      dadosContrato,
      historicoDemanda,
      historicoConsumo,
      obrigacoes: referenceMonths.map((mes) => ({
        periodo: formatMesLabel(mes),
        status: { ...defaultStatus },
      })),
      analises: buildAnalises(),
      faturas: invoices,
    };

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onCreate(newContract);
      setFormState(buildInitialFormState());
      setErrors({});
    } catch (error) {
      console.error('[CreateContractModal] Falha ao criar contrato.', error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível criar o contrato. Tente novamente.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;"@ 
,  = [regex]::Replace(, , , 'Singleline', [ref]0)
if ( -ne 1) { throw "replacement count " }
Set-Content -Path  -Value  -Encoding UTF8
