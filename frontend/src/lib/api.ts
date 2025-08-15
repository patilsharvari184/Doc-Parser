import axios from 'axios';

//const API_BASE_URL = 'https://7cf211b7f45c.ngrok-free.app';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  }
});

export interface UploadResponse {
  message: string;
  document_ids: string[];
}

export interface ExternalLinkResponse {
  message: string;
  document_id: string;
}

export interface AskResponse {
  answer: string;
  citations: {
    page: number;
    source: string;
    text: string;
  }[];
}

export const uploadPDFs = async (files: File[]): Promise<UploadResponse> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await api.post('/process-multiple-pdfs/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });

  return response.data;
};

export const processExternalLink = async (url: string): Promise<ExternalLinkResponse> => {
  const response = await api.post('/process-external-link/', { url });
  return response.data;
};

export const askQuestion = async (question: string, documentIds: string[]): Promise<AskResponse> => {
  const response = await api.post('/ask', {
    question,
    document_ids: documentIds
  });
  return response.data;
};