import React, { useState, useMemo } from "react";
import type { ChatItem } from "@/types/chat";
import { getChatDisplayName, getChatInitial } from "@/utils/chatDisplay";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  chats: ChatItem[];
  selectedChatId: string | null;
  onSelectChat: (chat: ChatItem) => void;
  onNewChat?: () => void;
  onLogout?: () => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onNewChat,
  onLogout,
  isLoading,
  error,
  onRetry,
}) => {
  // Строка поиска по чатам
  const [searchQuery, setSearchQuery] = useState("");

  // Фильтрация чатов по поисковому запросу
  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;

    return chats.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(q);
      const phoneMatch = c.phoneNumber?.toString().includes(q);
      const idMatch = c.chatId?.toLowerCase().includes(q);
      return nameMatch || phoneMatch || idMatch;
    });
  }, [chats, searchQuery]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <p className={styles.title}>Чаты</p>

        <div className={styles.actions}>
          {onNewChat && (
            <button
              type="button"
              className={styles.newChatBtn}
              onClick={onNewChat}
              title="Создать новый чат"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span>Новый чат</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={onLogout}
              title="Выйти"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Поиск или новый чат"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.chatList}>
        {isLoading && chats.length === 0 && (
          <div className={styles.statusMessage}>
            <div className={styles.loadingSpinner} />
            <div>Загрузка чатов...</div>
          </div>
        )}

        {error && chats.length === 0 && (
          <div className={styles.statusMessage}>
            <div>{error}</div>
            <button type="button" className={styles.retryBtn} onClick={onRetry}>
              Повторить
            </button>
          </div>
        )}

        {!isLoading && !error && filteredChats.length === 0 && (
          <div className={styles.statusMessage}>
            {searchQuery ? "Ничего не найдено" : "Список чатов пуст"}
          </div>
        )}

        {filteredChats.map((chat) => {
          const isSelected = selectedChatId === chat.chatId;
          const displayName = getChatDisplayName(chat);

          return (
            <div
              key={chat.chatId}
              className={`${styles.chatItem} ${isSelected ? styles.chatItemActive : ""}`}
              onClick={() => onSelectChat(chat)}
            >
              <div className={styles.avatar}>
                {chat.avatar ? (
                  <img src={chat.avatar} alt={displayName} />
                ) : (
                  <span>{getChatInitial(chat)}</span>
                )}
              </div>
              <div className={styles.chatContent}>
                <p className={styles.chatName}>{displayName}</p>
                {chat.hasUnread && <span className={styles.unreadBadge} />}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
