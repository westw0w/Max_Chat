import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { NewChatModal } from "@/components/NewChatModal";
import { useChats } from "@/hooks/useChats";
import type { GreenApiCredentials } from "@/types/auth";
import styles from "./MainLayout.module.css";

interface MainLayoutProps {
  credentials: GreenApiCredentials;
  onLogout: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  credentials,
  onLogout,
}) => {
  // Состояние модального окна создания нового чата
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  // Хук управления чатами
  const {
    chats,
    isLoading,
    error,
    selectedChatId,
    selectedChat,
    messages,
    isLoadingMessages,
    messagesError,
    isSending,
    sendError,
    onRetry,
    onSelectChat,
    onCreateChat,
    onCloseChat,
    onSendMessage,
  } = useChats(credentials);

  return (
    <div className={styles.layout}>
      <Sidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={onSelectChat}
        onNewChat={() => setIsNewChatOpen(true)}
        onLogout={onLogout}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
      />

      <ChatWindow
        chat={selectedChat}
        messages={messages}
        isLoadingMessages={isLoadingMessages}
        messagesError={messagesError}
        isSending={isSending}
        sendError={sendError}
        onSendMessage={onSendMessage}
        onCloseChat={onCloseChat}
      />

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onCreateChat={onCreateChat}
      />
    </div>
  );
};
