import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ChatPanel } from "@/components/ChatPanel";
import { FloatingChat } from "@/components/FloatingChat";
import { AppProvider } from "@/contexts/AppContext";

const Index = () => {
  return (
    <AppProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <DocumentViewer />
          <ChatPanel />
        </div>
        
        <FloatingChat />
      </div>
    </AppProvider>
  );
};

export default Index;
