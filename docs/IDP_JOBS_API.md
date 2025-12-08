# IDP Jobs API Documentation

This document describes the API endpoints for fetching IDP (Intelligent Document Processing) jobs from DynamoDB, enriched with lead data from PostgreSQL.

## Table of Contents
- [Overview](#overview)
- [Configuration](#configuration)
- [Endpoints](#endpoints)
  - [List IDP Jobs](#list-idp-jobs)
  - [Get IDP Job by Document ID](#get-idp-job-by-document-id)
- [Response Models](#response-models)
- [Complete Response Example](#complete-response-example)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)

---

## Overview

The IDP Jobs API provides access to processed invoice documents stored in DynamoDB. By default, each IDP job is **enriched** with related data from PostgreSQL, including:
- **Lead data** (`leads` table) - matched via `idp_id` = `document_id`
- **Lead documents** (`lead_documents` table) - all documents related to the lead
- **Lead invoices** (`lead_invoices` table) - all invoices related to the lead

**Base URL:** `/api/idp`

**Important:** The `lead_data` field can be:
- An object containing `lead`, `documents`, and `invoices` when a matching lead exists
- `null` when no lead is associated with the IDP job

---

## Configuration

The following environment variables must be configured in your `.env` file:

```env
# AWS Region for DynamoDB
AWS_REGION=us-east-2

# DynamoDB Access Credentials
DYNAMODB_ACCESS_KEY=your_access_key_here
DYNAMOD_SECRET=your_secret_key_here

# PostgreSQL (Prisma) - for lead data enrichment
DATABASE_URL=your_postgresql_connection_string
```

---

## Endpoints

### List IDP Jobs

Retrieves a paginated list of IDP jobs sorted by `completed_at` in descending order (most recent first). By default, includes enriched lead data from PostgreSQL.

**Endpoint:** `GET /api/idp/jobs`

**Authentication:** Public (no authentication required)

#### Query Parameters

| Parameter  | Type    | Default | Description                                        | Constraints      |
|------------|---------|---------|---------------------------------------------------|------------------|
| `page`     | number  | 1       | Page number (1-based indexing)                    | Must be >= 1     |
| `size`     | number  | 10      | Number of items per page                          | Min: 1, Max: 100 |
| `enriched` | boolean | true    | Include lead data from PostgreSQL                 | true/false       |

#### Response Structure

```json
{
  "success": true,
  "message": "IDP jobs retrieved successfully",
  "data": {
    "items": [ /* Array of IDP Job items */ ],
    "pagination": {
      "page": 1,
      "size": 30,
      "totalItems": 686,
      "totalPages": 23,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

---

### Get IDP Job by Document ID

Retrieves a single IDP job by its `document_id`. By default, includes enriched lead data.

**Endpoint:** `GET /api/idp/jobs/:documentId`

**Authentication:** Public (no authentication required)

#### Path Parameters

| Parameter    | Type   | Description                          | Format |
|--------------|--------|--------------------------------------|--------|
| `documentId` | string | Unique identifier of the document    | UUID   |

#### Query Parameters

| Parameter  | Type    | Default | Description                        |
|------------|---------|---------|-----------------------------------|
| `enriched` | boolean | true    | Include lead data from PostgreSQL |

#### Success Response

**Status Code:** `200 OK`

#### Error Response

**Status Code:** `404 Not Found`

```json
{
  "success": false,
  "message": "IDP job not found for document_id: 0cf44c63-7206-44e5-8513-0541a4fd0a5c",
  "error": "NOT_FOUND"
}
```

---

## Response Models

### IDP Job Item (with lead_data)

| Field                      | Type           | Nullable | Description                                      |
|----------------------------|----------------|----------|--------------------------------------------------|
| `document_id`              | string         | No       | UUID of the document                             |
| `job_id`                   | string         | No       | Internal job identifier (hash)                   |
| `status`                   | string         | No       | Job status: "COMPLETED", "PROCESSING", "FAILED"  |
| `started_at`               | string         | No       | ISO timestamp when processing started            |
| `completed_at`             | string         | Yes      | ISO timestamp when processing completed          |
| `s3_bucket`                | string         | No       | S3 bucket containing the original PDF            |
| `s3_key`                   | string         | No       | S3 key/path of the original PDF                  |
| `file_size_bytes`          | number         | No       | File size in bytes                               |
| `file_size_mb`             | number         | No       | File size in megabytes                           |
| `page_count`               | number         | Yes      | Number of pages in the document                  |
| `excel_file_name`          | string         | Yes      | Generated Excel simulation filename              |
| `excel_file_size_bytes`    | number         | Yes      | Excel file size in bytes                         |
| `excel_generated_at`       | string         | Yes      | ISO timestamp when Excel was generated           |
| `excel_s3_url`             | string         | Yes      | Full S3 URL to download the Excel simulation     |
| `textract_output_bucket`   | string         | Yes      | S3 bucket for Textract output                    |
| `textract_output_prefix`   | string         | Yes      | S3 prefix for Textract results                   |
| `extracted_data`           | object         | Yes      | Extracted invoice data from IDP                  |
| `lead_data`                | object \| null | Yes      | **Related lead data from PostgreSQL (or null)**  |

### Extracted Data Object

| Field                          | Type           | Nullable | Description                               |
|--------------------------------|----------------|----------|-------------------------------------------|
| `document_id`                  | string         | No       | UUID of the document                      |
| `nome_cliente`                 | string         | No       | Client name                               |
| `documento_cliente`            | string         | Yes      | Client document (CNPJ/CPF)                |
| `codigo_cliente`               | string         | Yes      | Client code                               |
| `codigo_instalacao`            | string         | No       | Installation/consumer unit code           |
| `distribuidora`                | string         | No       | Energy distributor (normalized)           |
| `distribuidora_origem`         | string         | Yes      | Original distributor name from invoice    |
| `address`                      | string         | Yes      | Installation address                      |
| `city`                         | string         | Yes      | City                                      |
| `state`                        | string         | Yes      | State (2 chars, e.g., "SP", "MG", "GO")   |
| `neighborhood`                 | string         | Yes      | Neighborhood                              |
| `zip_code`                     | string         | Yes      | ZIP code                                  |
| `modalidade_tarifaria`         | string         | Yes      | Tariff modality: "Verde", "Azul", null    |
| `subgrupo`                     | string         | Yes      | Subgroup: "A3", "A4", "B3", etc.          |
| `periodo_fatura`               | string         | No       | Billing period (e.g., "06/2025")          |
| `data_vencimento`              | string         | Yes      | Due date (e.g., "24/07/2025")             |
| `valor_fatura`                 | number         | No       | Total invoice value in BRL                |
| `bandeira_tarifaria`           | string         | Yes      | Tariff flag color                         |
| `demanda_contratada_fora_ponta`| number         | Yes      | Contracted demand off-peak (kW)           |
| `demanda_contratada_ponta`     | number         | Yes      | Contracted demand peak (kW)               |
| `extracted_at`                 | string         | No       | ISO timestamp of extraction               |
| `incentivo_irrigacao`          | boolean        | No       | Has irrigation incentive                  |
| `investimento_adequacao_solar` | boolean        | No       | Requires solar adequacy investment        |
| `historico_consumo`            | array          | No       | Consumption history (up to 13 months)     |
| `historico_demanda`            | array          | No       | Demand history (up to 13 months)          |
| `historico_energia_reativa`    | array          | No       | Reactive energy history                   |
| `tributos`                     | object         | No       | Tax information (ICMS, PIS, COFINS)       |

### Consumption History Item (`historico_consumo`)

| Field                   | Type   | Nullable | Description                    |
|-------------------------|--------|----------|--------------------------------|
| `mes`                   | string | No       | Month/Year (e.g., "06/2025")   |
| `consumo_fora_ponta_kwh`| number | No       | Off-peak consumption in kWh    |
| `consumo_ponta_kwh`     | number | Yes      | Peak consumption in kWh        |

### Demand History Item (`historico_demanda`)

| Field                | Type   | Nullable | Description                    |
|----------------------|--------|----------|--------------------------------|
| `mes`                | string | No       | Month/Year (e.g., "06/2025")   |
| `demanda_fora_ponta_kw` | number | No    | Off-peak demand in kW          |
| `demanda_ponta_kw`   | number | Yes      | Peak demand in kW              |

### Reactive Energy History Item (`historico_energia_reativa`)

| Field                            | Type   | Nullable | Description                        |
|----------------------------------|--------|----------|------------------------------------|
| `mes`                            | string | No       | Month/Year (e.g., "06/2025")       |
| `energia_reativa_fora_ponta_kvarh` | number | No     | Off-peak reactive energy in kVArh  |
| `energia_reativa_ponta_kvarh`    | number | Yes      | Peak reactive energy in kVArh      |

### Taxes Object (`tributos`)

| Field   | Type   | Description                              |
|---------|--------|------------------------------------------|
| `icms`  | object | ICMS tax: `{ valor: number, aliquota: number }` |
| `pis`   | object | PIS tax: `{ valor: number, aliquota: number }`  |
| `cofins`| object | COFINS tax: `{ valor: number, aliquota: number }` |

---

### Lead Data Object (`lead_data`)

**Important:** This field is `null` when no lead is associated with the IDP job's `document_id`.

| Field       | Type   | Description                                      |
|-------------|--------|--------------------------------------------------|
| `lead`      | object | Lead record from `leads` table (or null)         |
| `documents` | array  | Array of documents from `lead_documents` table   |
| `invoices`  | array  | Array of invoices from `lead_invoices` table     |

### Lead Object

| Field                  | Type    | Nullable | Description                           |
|------------------------|---------|----------|---------------------------------------|
| `id`                   | number  | No       | Lead ID                               |
| `consumer_unit`        | string  | No       | Consumer unit identifier              |
| `cnpj`                 | string  | No       | Client CNPJ/CPF                       |
| `name`                 | string  | No       | Client name                           |
| `email`                | string  | No       | Contact email                         |
| `phone`                | string  | No       | Contact phone                         |
| `month`                | string  | No       | Reference month (e.g., "06")          |
| `year`                 | number  | No       | Reference year (e.g., 2025)           |
| `energy_value`         | number  | No       | Energy value in kWh                   |
| `invoice_amount`       | number  | No       | Invoice amount in BRL                 |
| `status`               | string  | No       | Lead status (e.g., "qualifiedtobuy", "apresentacao") |
| `observations`         | string  | Yes      | Additional notes/observations         |
| `address`              | string  | Yes      | Address                               |
| `city`                 | string  | Yes      | City                                  |
| `state`                | string  | Yes      | State (2 chars)                       |
| `zip_code`             | string  | Yes      | ZIP code                              |
| `source`               | string  | Yes      | Lead source                           |
| `id_crm`               | string  | Yes      | CRM integration ID                    |
| `contract_signed`      | boolean | No       | Whether contract is signed            |
| `contract_signed_at`   | object  | Yes      | Contract signing timestamp            |
| `contract_id`          | string  | Yes      | Contract ID                           |
| `has_solar_generation` | boolean | No       | Has solar generation                  |
| `solar_generation_type`| string  | Yes      | Type of solar generation              |
| `consultant_id`        | number  | Yes      | Assigned consultant ID                |
| `idp_id`               | string  | Yes      | IDP document_id (links to DynamoDB)   |
| `created_at`           | object  | Yes      | Creation timestamp                    |
| `updated_at`           | object  | Yes      | Last update timestamp                 |

### Lead Document Object

| Field                | Type   | Nullable | Description                    |
|----------------------|--------|----------|--------------------------------|
| `id`                 | number | No       | Document ID                    |
| `lead_id`            | number | No       | Related lead ID                |
| `filename_original`  | string | No       | Original filename              |
| `filename_normalized`| string | No       | Normalized filename            |
| `storage_url`        | string | No       | S3 URL to the document         |
| `document_type`      | string | No       | Type of document               |
| `created_at`         | object | Yes      | Creation timestamp             |
| `updated_at`         | object | Yes      | Last update timestamp          |

### Lead Invoice Object

| Field                | Type    | Nullable | Description                              |
|----------------------|---------|----------|------------------------------------------|
| `id`                 | number  | No       | Invoice ID                               |
| `lead_id`            | number  | No       | Related lead ID                          |
| `idp_id`             | string  | Yes      | IDP document_id                          |
| `simulation`         | boolean | No       | Has simulation generated                 |
| `proposal`           | boolean | No       | Has proposal generated                   |
| `filename_original`  | string  | No       | Original filename                        |
| `filename_normalized`| string  | No       | Normalized filename                      |
| `storage_url`        | string  | No       | S3 URL to the invoice PDF                |
| `invoice_amount`     | number  | No       | Invoice amount in BRL                    |
| `extracted_data`     | object  | No       | Extracted invoice data (same structure as IDP) |
| `created_at`         | object  | Yes      | Creation timestamp                       |
| `updated_at`         | object  | Yes      | Last update timestamp                    |

### Pagination Object

| Field              | Type    | Description                              |
|--------------------|---------|------------------------------------------|
| `page`             | number  | Current page number                      |
| `size`             | number  | Number of items per page                 |
| `totalItems`       | number  | Total number of items available          |
| `totalPages`       | number  | Total number of pages                    |
| `hasNextPage`      | boolean | Whether there's a next page              |
| `hasPreviousPage`  | boolean | Whether there's a previous page          |

---

## Complete Response Example

### IDP Job WITH Lead Data

```json
{
  "excel_file_size_bytes": 115840,
  "excel_s3_url": "https://energy-invoice-idp-output-dev.s3.us-east-2.amazonaws.com/simulacao/RIOTEK_INDUSTRIA_E_COMERCIO_DE_EMBALAGEN_LTDA_2025-12-04_16-10-18_simulacao.xlsx",
  "s3_bucket": "energy-invoice-idp-input-dev",
  "page_count": 3,
  "status": "COMPLETED",
  "job_id": "bbcfd88e34ae7be43a2a406c5f477827675bd736f307ce601f1786d293334ef8",
  "file_size_bytes": 1471958,
  "completed_at": "2025-12-04T16:10:18.555765",
  "textract_output_bucket": "energy-invoice-idp-textract-output-dev",
  "file_size_mb": 1.4,
  "excel_generated_at": "2025-12-04T16:10:20.644147",
  "document_id": "7d514ad8-d941-4b40-82c0-4fd8e900bebb",
  "excel_file_name": "RIOTEK_INDUSTRIA_E_COMERCIO_DE_EMBALAGEN_LTDA_2025-12-04_16-10-18_simulacao.xlsx",
  "extracted_data": {
    "modalidade_tarifaria": "Verde",
    "valor_fatura": 17292.92,
    "city": "SAO JOSE DO RIO PARDO",
    "codigo_instalacao": "716604797",
    "nome_cliente": "RIOTEK INDUSTRIA E COMERCIO DE EMBALAGEN LTDA",
    "distribuidora_origem": "CPFL Santa Cruz",
    "document_id": "7d514ad8-d941-4b40-82c0-4fd8e900bebb",
    "tributos": {
      "icms": { "valor": 1761.18, "aliquota": 18 },
      "pis": { "valor": 230.49, "aliquota": 0.86 },
      "cofins": { "valor": 1064.03, "aliquota": 3.97 }
    },
    "codigo_cliente": "720000339007",
    "zip_code": "13720-000",
    "incentivo_irrigacao": false,
    "historico_consumo": [
      { "consumo_fora_ponta_kwh": 19628, "mes": "06/2025", "consumo_ponta_kwh": 2351 },
      { "consumo_fora_ponta_kwh": 21219, "mes": "05/2025", "consumo_ponta_kwh": 2472 },
      { "consumo_fora_ponta_kwh": 93986, "mes": "04/2025", "consumo_ponta_kwh": 9684 }
    ],
    "historico_demanda": [
      { "demanda_ponta_kw": 56, "demanda_fora_ponta_kw": 59, "mes": "06/2025" },
      { "demanda_ponta_kw": 57, "demanda_fora_ponta_kw": 58, "mes": "05/2025" },
      { "demanda_ponta_kw": 519, "demanda_fora_ponta_kw": 504, "mes": "04/2025" }
    ],
    "subgrupo": "A4",
    "distribuidora": "CPFL Santa Cruz",
    "periodo_fatura": "06/2025",
    "state": "SP",
    "historico_energia_reativa": [
      { "energia_reativa_ponta_kvarh": 18, "mes": "06/2025", "energia_reativa_fora_ponta_kvarh": 23.664 }
    ],
    "address": "CH STA LUZIA, S/N1",
    "extracted_at": "2025-12-04T16:10:18.499915",
    "demanda_contratada_ponta": null,
    "documento_cliente": "45.637.507/0001-99",
    "data_vencimento": "24/07/2025",
    "investimento_adequacao_solar": false,
    "bandeira_tarifaria": "Vermelha Patamar 1",
    "neighborhood": "STA LUZIA",
    "demanda_contratada_fora_ponta": 750
  },
  "s3_key": "invoices/7d514ad8-d941-4b40-82c0-4fd8e900bebb.pdf",
  "textract_output_prefix": "textract-results/7d514ad8-d941-4b40-82c0-4fd8e900bebb/",
  "started_at": "2025-12-04T16:09:54.763711",
  "lead_data": {
    "lead": {
      "id": 3240,
      "consumer_unit": "716604797",
      "cnpj": "45.637.507/0001-99",
      "name": "RIOTEK INDUSTRIA E COMERCIO DE EMBALAGEN LTDA",
      "email": "contato@cliente.com.br",
      "phone": "+55 (00) 00000-0000",
      "month": "06",
      "year": 2025,
      "energy_value": 21979,
      "invoice_amount": 17292.92,
      "status": "qualifiedtobuy",
      "observations": "Informações Adicionais:\r\nUtiliza Gerador: N\r\nTem Geração Solar: S\r\nGeração na mesma unidade: N\r\nÉ B Optante: N\r\nJá está no Mercado Livre: S\r\nTérmino do contrato: 2025-12-31",
      "address": "CH STA LUZIA, S/N1",
      "city": "SAO JOSE DO RIO PARDO",
      "state": "SP",
      "zip_code": "13720-000",
      "source": null,
      "id_crm": null,
      "contract_signed": false,
      "contract_signed_at": null,
      "contract_id": null,
      "has_solar_generation": false,
      "solar_generation_type": null,
      "consultant_id": 27,
      "idp_id": "7d514ad8-d941-4b40-82c0-4fd8e900bebb",
      "created_at": {},
      "updated_at": {}
    },
    "documents": [],
    "invoices": [
      {
        "id": 1736,
        "lead_id": 3240,
        "idp_id": "7d514ad8-d941-4b40-82c0-4fd8e900bebb",
        "simulation": true,
        "proposal": true,
        "filename_original": "21 LANÇADOS EM 21.07.25 - atual.pdf",
        "filename_normalized": "716604797_06-2025.pdf",
        "storage_url": "https://s3.us-east-2.amazonaws.com/ynova-mkp-portal-files/lead-invoices/FATURA_A_DETERMINAR_2025A DETERMINAR_3240.pdf",
        "invoice_amount": 17292.92,
        "extracted_data": {
          "nome_cliente": "RIOTEK INDUSTRIA E COMERCIO DE EMBALAGEN LTDA",
          "codigo_instalacao": "716604797",
          "documento_cliente": "45.637.507/0001-99",
          "periodo_fatura": "06/2025",
          "valor_fatura": 17292.92,
          "distribuidora": "CPFL Santa Cruz",
          "modalidade_tarifaria": "Verde",
          "subgrupo": "A4",
          "address": "CH STA LUZIA, S/N1",
          "city": "SAO JOSE DO RIO PARDO",
          "state": "SP",
          "zip_code": "13720-000",
          "data_vencimento": "24/07/2025",
          "demanda_contratada_fora_ponta": 750,
          "demanda_contratada_ponta": null,
          "historico_consumo": [
            { "consumo_fora_ponta_kwh": 19628, "mes": "06/2025", "consumo_ponta_kwh": 2351 }
          ],
          "historico_demanda": [
            { "demanda_ponta_kw": 56, "demanda_fora_ponta_kw": 59, "mes": "06/2025" }
          ],
          "tributos": {
            "icms": { "valor": 1761.18, "aliquota": 18 },
            "pis": { "valor": 230.49, "aliquota": 0.86 },
            "cofins": { "valor": 1064.03, "aliquota": 3.97 }
          },
          "bandeira_tarifaria": "Vermelha Patamar 1",
          "excel_s3_url": "https://energy-invoice-idp-output-dev.s3.us-east-2.amazonaws.com/simulacao/RIOTEK_simulacao.xlsx"
        },
        "created_at": {},
        "updated_at": {}
      }
    ]
  }
}
```

### IDP Job WITHOUT Lead Data (lead_data is null)

```json
{
  "excel_file_size_bytes": 116020,
  "excel_s3_url": "https://energy-invoice-idp-output-dev.s3.us-east-2.amazonaws.com/simulacao/CESAG_LTDA_2025-12-04_15-52-03_simulacao.xlsx",
  "s3_bucket": "energy-invoice-idp-input-dev",
  "page_count": 2,
  "status": "COMPLETED",
  "job_id": "5987379e87e7384dff8b9ca0d1cdec6dbd85cdc15a70444c51d88de598d53d48",
  "file_size_bytes": 1668944,
  "completed_at": "2025-12-04T15:52:03.264728",
  "textract_output_bucket": "energy-invoice-idp-textract-output-dev",
  "file_size_mb": 1.59,
  "excel_generated_at": "2025-12-04T15:52:05.243844",
  "document_id": "3b398c33-138a-47cc-bfc3-d32dd84282f3",
  "excel_file_name": "CESAG_LTDA_2025-12-04_15-52-03_simulacao.xlsx",
  "extracted_data": {
    "modalidade_tarifaria": "Verde",
    "valor_fatura": 19470.01,
    "city": "CASAS DE TABUA",
    "codigo_instalacao": "987081",
    "nome_cliente": "CESAG LTDA",
    "distribuidora_origem": "ENERGISA MINAS RIO DISTRIBUIDORA DE ENERGIA S.A.",
    "document_id": "3b398c33-138a-47cc-bfc3-d32dd84282f3",
    "tributos": {
      "icms": { "valor": 3379.46, "aliquota": 18 },
      "pis": { "valor": 168.72, "aliquota": 1.65 },
      "cofins": { "valor": 777.24, "aliquota": 7.6 }
    },
    "codigo_cliente": "1/110686-3",
    "zip_code": "36860-000",
    "incentivo_irrigacao": false,
    "historico_consumo": [
      { "consumo_fora_ponta_kwh": 13860, "mes": "10/2025", "consumo_ponta_kwh": 164.7 },
      { "consumo_fora_ponta_kwh": 13245.3, "mes": "09/2025", "consumo_ponta_kwh": 160.56 }
    ],
    "historico_demanda": [
      { "demanda_ponta_kw": 9.36, "demanda_fora_ponta_kw": 185.04, "mes": "10/2025" },
      { "demanda_ponta_kw": 0, "demanda_fora_ponta_kw": 167.4, "mes": "09/2025" }
    ],
    "subgrupo": "A4",
    "distribuidora": "Energisa ESS",
    "periodo_fatura": "10/2025",
    "state": "MG",
    "historico_energia_reativa": [
      { "energia_reativa_ponta_kvarh": 0, "mes": "10/2025", "energia_reativa_fora_ponta_kvarh": 1771.2 }
    ],
    "address": "FAZENDA, SN SANTA ROSA",
    "extracted_at": "2025-12-04T15:52:03.195980",
    "demanda_contratada_ponta": null,
    "documento_cliente": "21.435.862/0001-17",
    "data_vencimento": "26/10/2025",
    "investimento_adequacao_solar": false,
    "bandeira_tarifaria": "Vermelha Patamar 1",
    "neighborhood": "AREA RURAL",
    "demanda_contratada_fora_ponta": 190
  },
  "s3_key": "invoices/3b398c33-138a-47cc-bfc3-d32dd84282f3.pdf",
  "textract_output_prefix": "textract-results/3b398c33-138a-47cc-bfc3-d32dd84282f3/",
  "started_at": "2025-12-04T15:51:26.776915",
  "lead_data": null
}
```

### Full API Response Example

```json
{
  "success": true,
  "message": "IDP jobs retrieved successfully",
  "data": {
    "items": [
      {
        "document_id": "7d514ad8-d941-4b40-82c0-4fd8e900bebb",
        "status": "COMPLETED",
        "extracted_data": { "..." },
        "lead_data": {
          "lead": { "id": 3240, "name": "RIOTEK...", "status": "qualifiedtobuy" },
          "documents": [],
          "invoices": [{ "id": 1736, "simulation": true, "proposal": true }]
        }
      },
      {
        "document_id": "3b398c33-138a-47cc-bfc3-d32dd84282f3",
        "status": "COMPLETED",
        "extracted_data": { "..." },
        "lead_data": null
      }
    ],
    "pagination": {
      "page": 1,
      "size": 30,
      "totalItems": 686,
      "totalPages": 23,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

---

## Usage Examples

### React/TypeScript Types

```typescript
// Types for the API response
interface TaxInfo {
  valor: number;
  aliquota: number;
}

interface Tributos {
  icms: TaxInfo;
  pis: TaxInfo;
  cofins: TaxInfo;
}

interface ConsumoHistorico {
  mes: string;
  consumo_fora_ponta_kwh: number;
  consumo_ponta_kwh: number | null;
}

interface DemandaHistorico {
  mes: string;
  demanda_fora_ponta_kw: number;
  demanda_ponta_kw: number | null;
}

interface EnergiaReativaHistorico {
  mes: string;
  energia_reativa_fora_ponta_kvarh: number;
  energia_reativa_ponta_kvarh: number | null;
}

interface ExtractedData {
  document_id: string;
  nome_cliente: string;
  documento_cliente: string | null;
  codigo_cliente: string | null;
  codigo_instalacao: string;
  distribuidora: string;
  distribuidora_origem: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  zip_code: string | null;
  modalidade_tarifaria: string | null;
  subgrupo: string | null;
  periodo_fatura: string;
  data_vencimento: string | null;
  valor_fatura: number;
  bandeira_tarifaria: string | null;
  demanda_contratada_fora_ponta: number | null;
  demanda_contratada_ponta: number | null;
  extracted_at: string;
  incentivo_irrigacao: boolean;
  investimento_adequacao_solar: boolean;
  historico_consumo: ConsumoHistorico[];
  historico_demanda: DemandaHistorico[];
  historico_energia_reativa: EnergiaReativaHistorico[];
  tributos: Tributos;
}

interface Lead {
  id: number;
  consumer_unit: string;
  cnpj: string;
  name: string;
  email: string;
  phone: string;
  month: string;
  year: number;
  energy_value: number;
  invoice_amount: number;
  status: string;
  observations: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  source: string | null;
  id_crm: string | null;
  contract_signed: boolean;
  contract_signed_at: Date | null;
  contract_id: string | null;
  has_solar_generation: boolean;
  solar_generation_type: string | null;
  consultant_id: number | null;
  idp_id: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

interface LeadDocument {
  id: number;
  lead_id: number;
  filename_original: string;
  filename_normalized: string;
  storage_url: string;
  document_type: string;
  created_at: Date | null;
  updated_at: Date | null;
}

interface LeadInvoice {
  id: number;
  lead_id: number;
  idp_id: string | null;
  simulation: boolean;
  proposal: boolean;
  filename_original: string;
  filename_normalized: string;
  storage_url: string;
  invoice_amount: number;
  extracted_data: ExtractedData;
  created_at: Date | null;
  updated_at: Date | null;
}

interface LeadData {
  lead: Lead | null;
  documents: LeadDocument[];
  invoices: LeadInvoice[];
}

interface IdpJob {
  document_id: string;
  job_id: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  started_at: string;
  completed_at: string | null;
  s3_bucket: string;
  s3_key: string;
  file_size_bytes: number;
  file_size_mb: number;
  page_count: number | null;
  excel_file_name: string | null;
  excel_file_size_bytes: number | null;
  excel_generated_at: string | null;
  excel_s3_url: string | null;
  textract_output_bucket: string | null;
  textract_output_prefix: string | null;
  extracted_data: ExtractedData | null;
  lead_data: LeadData | null;  // Can be null!
}

interface Pagination {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface IdpJobsResponse {
  success: boolean;
  message: string;
  data: {
    items: IdpJob[];
    pagination: Pagination;
  };
}
```

### React Component Example

```tsx
import { useState, useEffect } from 'react';

const IdpJobsTable: React.FC = () => {
  const [jobs, setJobs] = useState<IdpJob[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/idp/jobs?page=${page}&size=${pageSize}`
        );
        const result: IdpJobsResponse = await response.json();
        
        if (result.success) {
          setJobs(result.data.items);
          setPagination(result.data.pagination);
        }
      } catch (error) {
        console.error('Error fetching IDP jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [page]);

  const getLeadStatus = (job: IdpJob): string => {
    if (!job.lead_data?.lead) return 'Sem Lead';
    return job.lead_data.lead.status;
  };

  const hasSimulation = (job: IdpJob): boolean => {
    return job.lead_data?.invoices?.some(inv => inv.simulation) ?? false;
  };

  const hasProposal = (job: IdpJob): boolean => {
    return job.lead_data?.invoices?.some(inv => inv.proposal) ?? false;
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1>Faturas Processadas pelo IDP</h1>
      
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>CNPJ</th>
            <th>Distribuidora</th>
            <th>Valor Fatura</th>
            <th>Status Lead</th>
            <th>Simulação</th>
            <th>Proposta</th>
            <th>Processado em</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.document_id}>
              <td>{job.extracted_data?.nome_cliente || 'N/A'}</td>
              <td>{job.extracted_data?.documento_cliente || 'N/A'}</td>
              <td>{job.extracted_data?.distribuidora || 'N/A'}</td>
              <td>
                R$ {job.extracted_data?.valor_fatura?.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                }) || '0,00'}
              </td>
              <td>
                <span className={job.lead_data ? 'has-lead' : 'no-lead'}>
                  {getLeadStatus(job)}
                </span>
              </td>
              <td>{hasSimulation(job) ? '✅' : '❌'}</td>
              <td>{hasProposal(job) ? '✅' : '❌'}</td>
              <td>
                {job.completed_at 
                  ? new Date(job.completed_at).toLocaleString('pt-BR')
                  : 'Processando...'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div className="pagination">
          <button 
            onClick={() => setPage(p => p - 1)} 
            disabled={!pagination.hasPreviousPage}
          >
            Anterior
          </button>
          <span>
            Página {pagination.page} de {pagination.totalPages} 
            ({pagination.totalItems} registros)
          </span>
          <button 
            onClick={() => setPage(p => p + 1)} 
            disabled={!pagination.hasNextPage}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

export default IdpJobsTable;
```

### cURL Examples

```bash
# List enriched jobs (default)
curl -X GET "http://localhost:3001/api/idp/jobs"

# List with pagination
curl -X GET "http://localhost:3001/api/idp/jobs?page=2&size=20"

# List jobs WITHOUT enrichment (faster, DynamoDB only)
curl -X GET "http://localhost:3001/api/idp/jobs?enriched=false"

# Get specific enriched job
curl -X GET "http://localhost:3001/api/idp/jobs/7d514ad8-d941-4b40-82c0-4fd8e900bebb"

# Get job WITHOUT enrichment
curl -X GET "http://localhost:3001/api/idp/jobs/7d514ad8-d941-4b40-82c0-4fd8e900bebb?enriched=false"
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Error Codes

| HTTP Status | Error Code           | Description                                |
|-------------|----------------------|--------------------------------------------|
| 400         | `INVALID_DOCUMENT_ID`| Invalid UUID format for document_id        |
| 404         | `NOT_FOUND`          | IDP job not found for given document_id    |
| 500         | `INTERNAL_ERROR`     | Server error while fetching data           |

---

## Data Flow

```
┌─────────────────────┐     ┌─────────────────────┐
│    DynamoDB         │     │    PostgreSQL       │
│  (IDP Jobs Table)   │     │  (Prisma/Leads)     │
│                     │     │                     │
│  - document_id      │     │  - leads.idp_id     │
│  - extracted_data   │     │  - lead_documents   │
│  - excel_s3_url     │     │  - lead_invoices    │
└─────────┬───────────┘     └──────────┬──────────┘
          │                            │
          │  document_id ──────────────┤ idp_id
          │                            │
          └───────────┬────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │   API Layer   │
              │  (Enrichment) │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │   Response    │
              │   (Merged)    │
              └───────────────┘
```

---

## Performance Notes

1. **Enriched vs Non-enriched**: Use `enriched=false` when you only need DynamoDB data. This is faster as it skips PostgreSQL queries.

2. **Pagination**: The API enriches only the paginated items (not all items), optimizing database queries.

3. **Parallel Processing**: Lead data is fetched in parallel for all items on the page.

4. **No Lead Found**: When a lead is not found for a `document_id`, `lead_data` will be `null`.

---

## Changelog

| Version | Date       | Changes                                        |
|---------|------------|------------------------------------------------|
| 1.1.0   | 2025-12-08 | Added PostgreSQL enrichment with lead data     |
| 1.0.0   | 2025-12-08 | Initial implementation                         |
