import React, { createContext, useContext, useState, ReactNode } from 'react';
import { uploadPDFs, processExternalLink } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface PDFDocument {
  id: string;
  name: string;
  uploadDate: string;
  status: 'completed' | 'processing' | 'error';
  size: string;
  pages: number;
  url?: string;
  documentId?: string; // Backend document ID
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  citations?: string[];
  tableReference?: boolean;
  timestamp: Date;
  documentId?: string;
}

interface AppContextType {
  documents: PDFDocument[];
  selectedDocument: PDFDocument | null;
  messages: ChatMessage[];
  currentPage: number;
  zoom: number;
  isUploading: boolean;
  setDocuments: React.Dispatch<React.SetStateAction<PDFDocument[]>>;
  setSelectedDocument: (doc: PDFDocument | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setIsUploading: (uploading: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  uploadDocument: (file: File) => Promise<void>;
  processExternalLink: (link: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialDocuments: PDFDocument[] = [
  {
    id: "1",
    name: "Research Paper - AI in Healthcare.pdf",
    uploadDate: "2024-01-15",
    status: "completed",
    size: "2.4 MB",
    pages: 24
  },
  {
    id: "2", 
    name: "Financial Report Q3 2023.pdf",
    uploadDate: "2024-01-14",
    status: "completed",
    size: "1.8 MB",
    pages: 18
  },
  {
    id: "3",
    name: "Technical Documentation.pdf", 
    uploadDate: "2024-01-13",
    status: "processing",
    size: "5.2 MB",
    pages: 45
  },
  {
    id: "4",
    name: "Business Plan 2024.pdf",
    uploadDate: "2024-01-12", 
    status: "error",
    size: "3.1 MB",
    pages: 32
  },
  {
    id: "5",
    name: "User Manual v2.1.pdf",
    uploadDate: "2024-01-11",
    status: "completed", 
    size: "1.2 MB",
    pages: 12
  }
];

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    type: "assistant",
    content: "Hello! I'm ready to help you analyze your PDF documents. Select a document from the sidebar and ask me anything about it.",
    timestamp: new Date()
  }
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [selectedDocument, setSelectedDocumentState] = useState<PDFDocument | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const setSelectedDocument = (doc: PDFDocument | null) => {
    setSelectedDocumentState(doc);
    setCurrentPage(1);
    // Clear messages when switching documents
    if (doc) {
      setMessages([
        {
          id: Date.now().toString(),
          type: "assistant",
          content: `I'm ready to help you analyze "${doc.name}". Ask me anything about this document.`,
          timestamp: new Date(),
          documentId: doc.id
        }
      ]);
    }
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const uploadDocument = async (file: File): Promise<void> => {
    setIsUploading(true);
    
    try {
      // Create temporary document entry
      const tempDoc: PDFDocument = {
        id: Date.now().toString(),
        name: file.name,
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'processing',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        pages: 0
      };

      setDocuments(prev => [tempDoc, ...prev]);
      
      // Upload to backend
      const response = await uploadPDFs([file]);
      
      // Update document with backend ID and completed status
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === tempDoc.id 
            ? { 
                ...doc, 
                status: 'completed' as const,
                documentId: response.document_ids[0],
                pages: Math.floor(Math.random() * 50) + 10 // Still random for demo
              }
            : doc
        )
      );

      toast({
        title: "Upload successful",
        description: `${file.name} has been processed successfully.`
      });

    } catch (error) {
      console.error('Upload failed:', error);
      
      // Update document status to error
      setDocuments(prev => 
        prev.map(doc => 
          doc.name === file.name && doc.status === 'processing'
            ? { ...doc, status: 'error' as const }
            : doc
        )
      );

      toast({
        title: "Upload failed",
        description: "There was an error processing your document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const processExternalLinkFunc = async (url: string): Promise<void> => {
    setIsUploading(true);
    
    try {
      const response = await processExternalLink(url);
      
      // Create new document entry
      const newDoc: PDFDocument = {
        id: Date.now().toString(),
        name: url.split('/').pop() || 'External PDF',
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'completed',
        size: 'Unknown',
        pages: Math.floor(Math.random() * 50) + 10,
        documentId: response.document_id
      };

      setDocuments(prev => [newDoc, ...prev]);
      
      toast({
        title: "External link processed",
        description: "The PDF from the external link has been processed successfully."
      });

    } catch (error) {
      console.error('External link processing failed:', error);
      
      toast({
        title: "Processing failed",
        description: "There was an error processing the external link. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const value: AppContextType = {
    documents,
    selectedDocument,
    messages,
    currentPage,
    zoom,
    isUploading,
    setDocuments,
    setSelectedDocument,
    setMessages,
    setCurrentPage,
    setZoom,
    setIsUploading,
    addMessage,
    uploadDocument,
    processExternalLink: processExternalLinkFunc
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};