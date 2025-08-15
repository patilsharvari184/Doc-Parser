import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReactNode, useEffect, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Share,
  ChevronLeft,
  ChevronRight,
  Maximize,
  FileText,
  Calendar
} from "lucide-react";
import { ChatMessage, PDFDocument, useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import sampleDocument from "@/assets/sample-document.jpg";
import axios from "axios";
import { Document, Page, pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export const DocumentViewer = () => {
  const { selectedDocument, currentPage, setCurrentPage, zoom, setZoom } = useApp();
  const { toast } = useToast();
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);

  const handleZoomIn = () => setZoom(Math.min(zoom + 25, 200));
  const handleZoomOut = () => setZoom(Math.max(zoom - 25, 50));
  const handlePrevPage = () => setCurrentPage(Math.max(currentPage - 1, 1));
  const handleNextPage = () => setCurrentPage(Math.min(currentPage + 1, selectedDocument?.pages || 1));

  const handleDownload = () => {
    toast({
      title: "Download started",
      description: `Downloading ${selectedDocument?.name}...`,
    });
  };

  useEffect(() => {
  if (selectedDocument) {
    axios.get(`http://127.0.0.1:8000/document/get/${selectedDocument.id}`, {
      responseType: "arraybuffer",
    })
      .then((res) => {
        setPdfData(res.data);
      })
      .catch((error) => {
        console.error("Error fetching PDF:", error);
        toast({
          title: "Error",
          description: "Failed to load PDF file.",
          variant: "destructive",
        });
      });
  }
}, [selectedDocument, toast]);


  const handleShare = () => {
    toast({
      title: "Share link copied",
      description: "Document share link copied to clipboard.",
    });
  };

  if (!selectedDocument) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-100">
        <div className="text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No document selected</h3>
          <p className="text-muted-foreground">Select a document from the sidebar to view it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-neutral-100">
      {/* Document header */}
      <div className="bg-card border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-600" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {selectedDocument.name}
              </h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Uploaded {new Date(selectedDocument.uploadDate).toLocaleDateString()}
                </div>
                <Badge
                  variant="secondary"
                  className={
                    selectedDocument.status === 'completed'
                      ? "bg-green-50 text-green-700 border-green-200"
                      : selectedDocument.status === 'processing'
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }
                >
                  {selectedDocument.status === 'completed' ? 'Ready' :
                   selectedDocument.status === 'processing' ? 'Processing' : 'Error'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-card border-b border-neutral-200 p-3">
        <div className="flex items-center justify-between">
          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {zoom}%
            </span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Maximize className="w-4 h-4" />
            </Button>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 px-3">
              <span className="text-sm font-medium">
                Page {currentPage} of {selectedDocument.pages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === selectedDocument.pages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Document viewer */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Page container */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
            <div
              className="relative"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            >
              {pdfData && (
                <Document file={{ data: pdfData }}>
                  <Page pageNumber={currentPage} scale={zoom / 100} />
                </Document> 
              )}

              {/* Highlight overlay example */}
              <div
                className="absolute bg-yellow-200 bg-opacity-50 border-2 border-yellow-400 cursor-pointer hover:bg-opacity-70"
                style={{
                  top: '20%',
                  left: '10%',
                  width: '40%',
                  height: '8%'
                }}
                title="Highlighted text about AI applications"
              />
            </div>
          </div>

          {/* Show second page in 2-page view */}
          {currentPage < selectedDocument.pages && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div
                className="relative"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                <img
                  src={`http://127.0.0.1:8080/uploaded_docs/${selectedDocument.name}`}
                  alt={`Page ${currentPage + 1}`}
                  className="w-full h-auto block opacity-90"
                  style={{ maxWidth: '800px', margin: '0 auto' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
