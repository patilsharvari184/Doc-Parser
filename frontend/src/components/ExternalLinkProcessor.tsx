import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, Loader2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export const ExternalLinkProcessor = () => {
  const { processExternalLink } = useApp();
  const [link, setLink] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessLink = async () => {
    if (!link.trim()) return;
    
    // Basic URL validation
    try {
      new URL(link);
    } catch {
      return;
    }

    setIsProcessing(true);
    try {
      await processExternalLink(link);
      setLink(""); // Clear input on success
    } catch (error) {
      // Error handling is done in the context
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleProcessLink();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link className="w-4 h-4" />
          Process External PDF Link
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="https://example.com/document.pdf"
            disabled={isProcessing}
            className="flex-1"
            type="url"
          />
          <Button
            onClick={handleProcessLink}
            disabled={!link.trim() || isProcessing}
            size="sm"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Process"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};