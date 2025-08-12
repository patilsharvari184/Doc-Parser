import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Bot,
  User,
  FileText,
  Table,
  ChevronDown,
  Paperclip,
  MoreVertical
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import type { ChatMessage } from "@/contexts/AppContext";
import { askQuestion } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const ChatPanel = () => {
  const { selectedDocument, messages, addMessage, documents } = useApp();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [model, setModel] = useState("gpt-4o-mini");
  const [language, setLanguage] = useState("en");
  const [stickToFile, setStickToFile] = useState(true);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedDocument) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: new Date(),
      documentId: selectedDocument.id
    };

    addMessage(userMessage);
    setMessage("");
    setIsTyping(true);

    try {
      // Get document IDs for the query
      const documentIds = stickToFile && selectedDocument.documentId 
        ? [selectedDocument.documentId]
        : documents.filter(doc => doc.documentId && doc.status === 'completed').map(doc => doc.documentId!);

      if (documentIds.length === 0) {
        throw new Error('No processed documents available');
      }

      // Call the backend API
      const response = await askQuestion(userMessage.content, documentIds);
      
      // Format citations for display
      const citations = response.citations.map(citation => citation.source);
      const hasTableReference = response.citations.some(citation => 
        citation.text?.toLowerCase().includes('table') || citation.source?.toLowerCase().includes('table')
      );
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response.answer,
        citations: citations,
        tableReference: hasTableReference,
        timestamp: new Date(),
        documentId: selectedDocument.id
      };
      
      addMessage(aiResponse);

    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "I'm sorry, I encountered an error while processing your question. Please make sure the document has been successfully processed and try again.",
        timestamp: new Date(),
        documentId: selectedDocument.id
      };
      
      addMessage(errorResponse);
      
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-96 border-l border-neutral-200 bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={`w-2 h-2 rounded-full ${selectedDocument ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span>{selectedDocument ? `Ready to analyze "${selectedDocument.name}"` : 'Select a document to start'}</span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : ''}`}>
            {msg.type === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-purple rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className={`max-w-[85%] ${msg.type === 'user' ? 'order-first' : ''}`}>
              <Card className={`${
                msg.type === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background border-neutral-200'
              }`}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.citations && (
                    <div className="mt-3 pt-3 border-t border-neutral-200">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Sources:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.citations.map((citation, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            📄 {citation}
                          </Badge>
                        ))}
                        {msg.tableReference && (
                          <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            📊 Table Reference
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {msg.type === 'user' && (
              <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-neutral-600" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-purple rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <Card className="bg-background border-neutral-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Chat input */}
      <div className="p-4 border-t border-neutral-200 space-y-3">
        {/* Settings */}
        <div className="flex gap-2 text-xs">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="claude-3">Claude 3</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-7 text-xs w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="es">ES</SelectItem>
              <SelectItem value="fr">FR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stick to file toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="stickToFile"
            checked={stickToFile}
            onChange={(e) => setStickToFile(e.target.checked)}
            className="w-3 h-3"
          />
          <label htmlFor="stickToFile" className="text-xs text-muted-foreground cursor-pointer">
            Stick to file
          </label>
        </div>

        {/* Message input */}
        <div className="relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedDocument ? `Ask about ${selectedDocument.name}...` : "Select a document first..."}
            className="pr-20"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
              <Paperclip className="w-3 h-3" />
            </Button>
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim() || !selectedDocument}
              size="sm" 
              className="w-6 h-6 p-0"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};