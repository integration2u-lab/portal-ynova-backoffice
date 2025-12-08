/**
 * IDP API Service
 * Functions for interacting with the IDP Jobs API and lead document uploads
 */

import { API_BASE_URL } from '../config/api';
import type {
  IdpJobsResponse,
  IdpJobResponse,
  DocumentUploadResponse,
  ApiErrorResponse,
} from '../types/idp';

// Use VITE_IDP_API_URL or fallback to proxy path for local dev
const getIdpApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_IDP_API_URL;
  
  // In development, use the Vite proxy to bypass CORS
  if (import.meta.env.DEV) {
    // Use relative path which Vite will proxy to localhost:3001
    return '/api/idp';
  }
  
  if (envUrl) {
    return envUrl;
  }
  // Fallback: use API_BASE_URL + /api/idp
  return `${API_BASE_URL}/api/idp`;
};

const IDP_API_URL = getIdpApiUrl();

// Temporary hardcoded token for development
const DEV_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIiLCJlbWFpbCI6ImNvbnN1bHRhbnQxQHlub3ZhbWFya2V0cGxhY2UuY29tIiwibmFtZSI6IkNvbnN1bHRvciIsInN1cm5hbWUiOiJZbm92YSIsInBob25lIjoiKzU1MTE5OTk5OTk5MTEiLCJwaG90b191cmwiOiJodHRwczovL3MzLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tL3lub3ZhLW1rcC1wb3J0YWwtZmlsZXMvcHJvZmlsZS1waG90b3MvMi0xNzU4NDc1NTc2MTU4LmpwZyIsImFkZHJlc3MiOiJSdWEgZGFzIEZsb3JlcywgMTIwIiwiY2l0eSI6IlPDo28gUGF1bG8iLCJzdGF0ZSI6IlNQIiwiemlwX2NvZGUiOiIwMTIzNC01NjciLCJiaXJ0aF9kYXRlIjoiMTk4NS0wNi0xNVQwMDowMDowMC4wMDBaIiwicGl4X2tleSI6IjExMS41NjEuMjI4LTA1Iiwicm9sZSI6ImNvbnN1bHRhbnQiLCJjbGllbnRfaWQiOm51bGwsImNyZWF0ZWRfYXQiOiIyMDI1LTA5LTIxVDE2OjI4OjU2LjIyMVoiLCJpYXQiOjE3NTg5MTI1MjEsImV4cCI6MTc1ODk5ODkyMX0.0gBZdDoMd2YXm4OsPxa9yOgIhkIXWrXISQdh8d0KjTg';

console.log('[idpApi] IDP API URL:', IDP_API_URL);

/**
 * Fetch paginated list of IDP jobs
 * @param page - Page number (1-based)
 * @param size - Number of items per page (default: 30, max: 100)
 * @returns Promise with IDP jobs response
 */
export async function fetchIdpJobs(
  page: number = 1,
  size: number = 30
): Promise<IdpJobsResponse> {
  const url = `${IDP_API_URL}/jobs?page=${page}&size=${size}`;
  
  console.log('[idpApi] Fetching IDP jobs:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'Authorization': `Bearer ${DEV_BEARER_TOKEN}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[idpApi] Error fetching IDP jobs:', response.status, errorText);
    throw new Error(`Failed to fetch IDP jobs: ${response.status} ${response.statusText}`);
  }
  
  const data: IdpJobsResponse = await response.json();
  console.log('[idpApi] Fetched', data.data.items.length, 'jobs');
  
  return data;
}

/**
 * Fetch a single IDP job by document ID
 * @param documentId - UUID of the document
 * @returns Promise with IDP job response
 */
export async function fetchIdpJobById(documentId: string): Promise<IdpJobResponse> {
  const url = `${IDP_API_URL}/jobs/${documentId}`;
  
  console.log('[idpApi] Fetching IDP job:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'Authorization': `Bearer ${DEV_BEARER_TOKEN}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      const error: ApiErrorResponse = await response.json();
      throw new Error(error.message || `IDP job not found: ${documentId}`);
    }
    throw new Error(`Failed to fetch IDP job: ${response.status} ${response.statusText}`);
  }
  
  const data: IdpJobResponse = await response.json();
  return data;
}

/**
 * Upload a document to a lead
 * @param leadId - Lead ID to attach document to
 * @param file - File to upload
 * @param documentType - Type of document (e.g., 'apresentacao')
 * @returns Promise with upload response
 */
export async function uploadLeadDocument(
  leadId: number,
  file: File,
  documentType: string
): Promise<DocumentUploadResponse> {
  const url = `${API_BASE_URL}/api/leads/${leadId}/documents`;
  
  console.log('[idpApi] Uploading document:', { leadId, documentType, fileName: file.name });
  
  // Validate file size (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('O arquivo deve ter no máximo 10MB');
  }
  
  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  
  const allowedExtensions = ['.pdf', '.ppt', '.pptx'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    throw new Error('Apenas arquivos PDF ou PowerPoint são permitidos');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      'Authorization': `Bearer ${DEV_BEARER_TOKEN}`,
      // Note: Don't set Content-Type for FormData - browser sets it automatically with boundary
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    console.error('[idpApi] Upload error:', errorData);
    throw new Error(errorData.error || `Erro no upload: ${response.status}`);
  }
  
  const data: DocumentUploadResponse = await response.json();
  console.log('[idpApi] Upload successful:', data);
  
  return data;
}

/**
 * Download file from S3 URL
 * Fetches the file as a blob and triggers download
 * @param url - S3 URL of the file
 * @param filename - Optional filename for download
 */
export async function downloadFile(url: string, filename?: string): Promise<void> {
  try {
    console.log('[idpApi] Downloading file:', url);
    
    // Fetch the file as a blob
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Create a blob URL and trigger download
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL
    URL.revokeObjectURL(blobUrl);
    
    console.log('[idpApi] Download completed:', filename);
  } catch (error) {
    console.error('[idpApi] Download error:', error);
    // Fallback: open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

