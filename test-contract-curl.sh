#!/bin/bash

# Comando curl para testar criação de contrato com os novos campos
# URL: https://api-balanco.ynovamarketplace.com/contracts

curl --location --request POST 'https://cec49efdc912.ngrok-free.app/contracts' \
--header 'Content-Type: application/json' \
--header 'ngrok-skip-browser-warning: true' \
--data-raw '{
  "contract_code": "CT-TEST-2024-001",
  "client_name": "Empresa Teste Ltda",
  "legal_name": "Empresa Teste Ltda - Razão Social",
  "cnpj": "12.345.678/0001-90",
  "segment": "Indústria",
  "contact_responsible": "João Silva",
  "contracted_volume_mwh": 1000,
  "status": "Ativo",
  "energy_source": "Incentivada 0%",
  "contracted_modality": "Preço Fixo",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "billing_cycle": "",
  "upper_limit_percent": 200,
  "lower_limit_percent": 0,
  "flexibility_percent": 100,
  "average_price_mwh": 350.50,
  "balance_email": "balanco@teste.com.br",
  "billing_email": "faturamento@teste.com.br",
  "supplier": "Boven",
  "groupName": "Grupo Teste",
  "submarket": "Sudeste/Centro-Oeste",
  "supplierEmail": "faturamento@teste.com.br",
  "seasonalFlexibilityMinPercentage": 50,
  "seasonalFlexibilityUpperPercentage": 150,
  "flat_price_mwh": 350.50,
  "flat_years": 1,
  "periodPrice": {
    "price_periods": null,
    "flat_price_mwh": 350.50,
    "flat_years": 1
  }
}'

