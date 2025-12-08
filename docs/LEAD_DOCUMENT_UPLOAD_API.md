# Lead Document Upload API Documentation

This document describes how to upload documents to a lead entity from the frontend UI.

## Endpoint

```
POST /api/leads/:leadId/documents
```

## Authentication

Requires Bearer token authentication in the `Authorization` header.

```
Authorization: Bearer <your-jwt-token>
```

## Request Format

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ Yes | The document file to upload |
| `document_type` | string | ✅ Yes | Type/category of the document (e.g., `"contrato"`, `"procuracao"`, `"cnpj"`, etc.) |

### Upsert Behavior

> **Important**: If a document with the same `lead_id` + `document_type` combination already exists (and is not deleted), **it will be replaced** with the new file. The response will return status `200` instead of `201` to indicate the replacement.

This ensures each lead has only one active document per type.

## File Restrictions

- **Max file size**: 10MB
- **Allowed file types**:
  - PDF (`.pdf`) - `application/pdf`
  - Images: JPEG/JPG (`.jpeg`, `.jpg`) - `image/jpeg`, `image/jpg`
  - Images: PNG (`.png`) - `image/png`
  - Excel: XLS (`.xls`) - `application/vnd.ms-excel`
  - Excel: XLSX (`.xlsx`) - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

## Frontend Implementation Examples

### Using `fetch` with `FormData`

```javascript
async function uploadLeadDocument(leadId, file, documentType, authToken) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const response = await fetch(`/api/leads/${leadId}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      // DO NOT set Content-Type header - browser sets it automatically with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload document');
  }

  return response.json();
}

// Usage with file input
const fileInput = document.getElementById('documentInput');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    try {
      const result = await uploadLeadDocument('123', file, 'contrato', 'your-jwt-token');
      console.log('Upload successful:', result.data);
    } catch (error) {
      console.error('Upload failed:', error.message);
    }
  }
});
```

### Using `axios`

```javascript
import axios from 'axios';

async function uploadLeadDocument(leadId, file, documentType, authToken) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const response = await axios.post(
    `/api/leads/${leadId}/documents`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}
```

### React Example with Progress

```tsx
import { useState } from 'react';
import axios from 'axios';

function DocumentUpload({ leadId, authToken }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', 'contrato'); // or get from user selection

    setUploading(true);
    setProgress(0);

    try {
      const response = await axios.post(
        `/api/leads/${leadId}/documents`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setProgress(percent);
          },
        }
      );
      
      console.log('Document uploaded:', response.data.data);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && <progress value={progress} max="100" />}
    </div>
  );
}
```

---

## Response Format

### Success Response - New Document (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "123456789",
    "lead_id": "987654321",
    "filename_original": "meu_documento.pdf",
    "filename_normalized": "DOC_CONTRATO_CLIENTE_NAME_987654321_1702051200000.pdf",
    "storage_url": "https://s3.us-east-2.amazonaws.com/ynova-mkp-portal-files/lead-documents/DOC_CONTRATO_CLIENTE_NAME_987654321_1702051200000.pdf",
    "document_type": "contrato",
    "created_at": "2024-12-08T12:00:00.000Z",
    "updated_at": "2024-12-08T12:00:00.000Z",
    "deleted_at": null
  },
  "message": "Document uploaded successfully"
}
```

### Success Response - Replaced Document (200 OK)

When a document with the same `lead_id` + `document_type` already exists:

```json
{
  "success": true,
  "data": {
    "id": "123456789",
    "lead_id": "987654321",
    "filename_original": "novo_documento.pdf",
    "filename_normalized": "DOC_CONTRATO_CLIENTE_NAME_987654321_1702051300000.pdf",
    "storage_url": "https://s3.us-east-2.amazonaws.com/ynova-mkp-portal-files/lead-documents/DOC_CONTRATO_CLIENTE_NAME_987654321_1702051300000.pdf",
    "document_type": "contrato",
    "created_at": "2024-12-08T12:00:00.000Z",
    "updated_at": "2024-12-08T12:01:40.000Z",
    "deleted_at": null
  },
  "message": "Document replaced successfully"
}
```

### Error Responses

**400 - Bad Request** (Missing file)
```json
{
  "success": false,
  "error": "No file uploaded"
}
```

**400 - Bad Request** (Missing document_type)
```json
{
  "success": false,
  "error": "document_type is required"
}
```

**401 - Unauthorized**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**404 - Not Found** (Lead doesn't exist or no permission)
```json
{
  "success": false,
  "error": "Lead not found"
}
```

---

## Related Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/leads/:leadId/documents` | List all documents for a lead (includes pre-signed URLs) |
| `GET` | `/api/leads/documents/:documentId/signed-url` | Get a fresh signed URL for downloading |
| `DELETE` | `/api/leads/documents/:documentId` | Soft-delete a document |

---

## Get Documents Response Example

When fetching documents via `GET /api/leads/:leadId/documents`, each document includes a `signed_url` field:

```json
{
  "success": true,
  "data": [
    {
      "id": "123456789",
      "lead_id": "987654321",
      "filename_original": "meu_documento.pdf",
      "filename_normalized": "DOC_CONTRATO_CLIENTE_NAME_987654321_1702051200000.pdf",
      "storage_url": "https://s3.us-east-2.amazonaws.com/bucket/lead-documents/...",
      "document_type": "contrato",
      "created_at": "2024-12-08T12:00:00.000Z",
      "updated_at": "2024-12-08T12:00:00.000Z",
      "deleted_at": null,
      "signed_url": "https://s3.us-east-2.amazonaws.com/bucket/lead-documents/...?X-Amz-Algorithm=..."
    }
  ]
}
```

The `signed_url` is a pre-signed S3 URL valid for **1 hour** that allows direct file download.

---

## Notes

1. **File Naming**: The backend automatically normalizes filenames to the format:
   ```
   DOC_{DOCUMENT_TYPE}_{CLIENT_NAME}_{LEAD_ID}_{TIMESTAMP}.{ext}
   ```

2. **Signed URLs**: When you fetch documents via `GET /api/leads/:leadId/documents`, each document includes a `signed_url` field that is pre-signed and valid for 1 hour. Use `GET /api/leads/documents/:documentId/signed-url` to get a fresh URL if needed.

3. **Permissions**: 
   - **Admins** can upload documents to any lead
   - **Consultants** can only upload documents to their own leads

4. **Soft Delete**: When deleting a document, it performs a soft delete (sets `deleted_at` timestamp). The document won't appear in listings but remains in the database and S3.

