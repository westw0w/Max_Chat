import { useCallback, useEffect, useRef, useState } from 'react';
import type { GreenApiCredentials } from '@/types/auth';
import type { ChatItem } from '@/types/chat';
import type { ChatMessage, IncomingMessage } from '@/types/message';
import {
  checkAccount,
  deleteNotification,
  fetchChatHistory,
  fetchChats,
  parseIncomingMessage,
  receiveNotification,
  sendTextMessage,
} from '@/services/greenApi';
import { playNotificationSound } from '@/services/notificationService';
import { MESSAGE_FALLBACK } from '@/utils/messageFallback';

const POLL_IDLE_DELAY_MS = 500;
const POLL_ERROR_DELAY_MS = 5000;

export interface UseChatsResult {
  chats: ChatItem[];
  isLoading: boolean;
  error: string | null;
  selectedChatId: string | null;
  selectedChat: ChatItem | null;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  messagesError: string | null;
  isSending: boolean;
  sendError: string | null;
  onRetry: () => void;
  onSelectChat: (chat: ChatItem) => void;
  onCreateChat: (chat: ChatItem) => Promise<void>;
  onCloseChat: () => void;
  onSendMessage: (text: string) => Promise<boolean>;
}

export function useChats(credentials: GreenApiCredentials): UseChatsResult {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const selectedChatIdRef = useRef<string | null>(null);

  // Новое входящее сообщение
  const applyIncomingMessage = useCallback((message: IncomingMessage) => {
    playNotificationSound();

    setChats((prev) => {
      const existing = prev.find((c) => c.chatId === message.chatId);

      const base: ChatItem = existing ?? {
        chatId: message.chatId,
        name:
          message.chatName ||
          message.senderName ||
          message.senderContactName ||
          '',
        type: message.chatType || 'user',
        phoneNumber: message.senderPhoneNumber,
      };

      const updated: ChatItem = {
        ...base,
        lastMessage:
          message.downloadUrl && !message.textMessage
            ? MESSAGE_FALLBACK.imageMessage
            : (message.textMessage ?? message.typeMessage),
        lastMessageTimestamp: message.timestamp,
        hasUnread: message.chatId !== selectedChatIdRef.current,
      };

      return [updated, ...prev.filter((c) => c.chatId !== message.chatId)];
    });

    if (message.chatId === selectedChatIdRef.current) {
      setMessages((prev) => {
        if (prev.some((m) => m.idMessage === message.idMessage)) {
          return prev;
        }

        const chatMessage: ChatMessage = {
          idMessage: message.idMessage,
          type: 'incoming',
          timestamp: message.timestamp,
          typeMessage: message.typeMessage,
          textMessage: message.textMessage,
          downloadUrl: message.downloadUrl,
          caption: message.caption,
          senderName: message.senderName,
          senderContactName: message.senderContactName,
        };

        return [...prev, chatMessage].sort(
          (a, b) => a.timestamp - b.timestamp
        );
      });
    }
  }, []);

  const loadChats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchChats(credentials);
      if (!mountedRef.current) return;
      setChats(list);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Не удалось загрузить чаты');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [credentials]);

  // Первичная загрузка списка чатов после авторизации.
  useEffect(() => {
    mountedRef.current = true;
    loadChats();
    return () => {
      mountedRef.current = false;
    };
  }, [loadChats]);

  // Загрузка истории сообщений выбранного чата.
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;

    if (!selectedChatId) {
      setMessages([]);
      setMessagesError(null);
      setIsLoadingMessages(false);
      return;
    }

    let cancelled = false;

    setMessages([]);
    setMessagesError(null);
    setIsLoadingMessages(true);

    fetchChatHistory(credentials, selectedChatId)
      .then((history) => {
        if (cancelled) return;
        setMessages(history);
      })
      .catch((err) => {
        if (cancelled) return;
        setMessagesError(
          err instanceof Error ? err.message : 'Не удалось загрузить историю'
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [credentials, selectedChatId]);

  // Цикл получения входящих уведомлений
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const schedule = (delay: number) => {
      if (cancelled) return;
      timeoutId = window.setTimeout(poll, delay);
    };

    const poll = async () => {
      if (cancelled) return;

      let delay = POLL_IDLE_DELAY_MS;

      try {
        const notification = await receiveNotification(credentials, 5);
        if (cancelled) return;

        if (notification) {
          const incoming = parseIncomingMessage(notification);
          if (incoming) {
            applyIncomingMessage(incoming);
          }

          try {
            await deleteNotification(credentials, notification.receiptId);
          } catch {
          }

          delay = 0;
        }
      } catch {
        delay = POLL_ERROR_DELAY_MS;
      }

      schedule(delay);
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [credentials, applyIncomingMessage]);

  const selectedChat =
    chats.find((c) => c.chatId === selectedChatId) ?? null;

  const handleSelectChat = useCallback((chat: ChatItem) => {
    setSelectedChatId(chat.chatId);
    setChats((prev) =>
      prev.map((c) =>
        c.chatId === chat.chatId ? { ...c, hasUnread: false } : c
      )
    );
  }, []);

  const handleCreateChat = useCallback(
    async (newChat: ChatItem): Promise<void> => {
      let chatId = newChat.chatId;

      // Проверяем, что аккаунт Max с таким номером существует.
      if (newChat.phoneNumber !== undefined) {
        const result = await checkAccount(credentials, newChat.phoneNumber);

        if (!result.exist) {
          throw new Error(
            `Аккаунт Max с номером +${newChat.phoneNumber} не найден`
          );
        }

        if (result.chatId) {
          chatId = result.chatId;
        }
      }

      const existing = chats.find((c) => c.chatId === chatId);

      if (existing) {
        setSelectedChatId(existing.chatId);
        return;
      }

      const chatToAdd: ChatItem = {
        ...newChat,
        chatId,
      };

      setChats((prev) => [
        chatToAdd,
        ...prev.filter((c) => c.chatId !== chatId),
      ]);
      setSelectedChatId(chatId);
    },
    [chats, credentials]
  );

  const handleCloseChat = useCallback(() => {
    setSelectedChatId(null);
  }, []);

  const handleSendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const chatId = selectedChatIdRef.current;
      const trimmed = text.trim();

      if (!chatId || !trimmed) return false;

      setSendError(null);
      setIsSending(true);

      try {
        const result = await sendTextMessage(credentials, chatId, trimmed);
        if (!mountedRef.current) return false;

        const timestamp = Math.floor(Date.now() / 1000);
        const outgoingMessage: ChatMessage = {
          idMessage: result.idMessage || `local-${timestamp}`,
          type: 'outgoing',
          timestamp,
          typeMessage: 'textMessage',
          textMessage: trimmed,
        };

        setMessages((prev) =>
          [...prev, outgoingMessage].sort((a, b) => a.timestamp - b.timestamp)
        );

        setChats((prev) =>
          prev.map((chat) =>
            chat.chatId === chatId
              ? {
                  ...chat,
                  lastMessage: trimmed,
                  lastMessageTimestamp: timestamp,
                }
              : chat
          )
        );

        return true;
      } catch (err) {
        if (mountedRef.current) {
          setSendError(
            err instanceof Error
              ? err.message
              : 'Не удалось отправить сообщение'
          );
        }
        return false;
      } finally {
        if (mountedRef.current) setIsSending(false);
      }
    },
    [credentials]
  );

  return {
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
    onRetry: loadChats,
    onSelectChat: handleSelectChat,
    onCreateChat: handleCreateChat,
    onCloseChat: handleCloseChat,
    onSendMessage: handleSendMessage,
  };
}
