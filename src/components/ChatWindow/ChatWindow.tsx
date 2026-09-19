import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { ChatItem } from "@/types/chat";
import type { ChatMessage } from "@/types/message";
import { getChatDisplayName, getChatInitial } from "@/utils/chatDisplay";
import { MESSAGE_FALLBACK } from "@/utils/messageFallback";
import styles from "./ChatWindow.module.css";

interface ChatWindowProps {
  chat: ChatItem | null;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  messagesError: string | null;
  isSending: boolean;
  sendError: string | null;
  onSendMessage: (text: string) => Promise<boolean>;
  onCloseChat: () => void;
}

// Извлечение текста сообщения с fallback-заглушкой для нетекстовых типов
const getMessageText = (message: ChatMessage): string => {
  if (message.textMessage && message.textMessage.trim()) {
    return message.textMessage;
  }
  return MESSAGE_FALLBACK[message.typeMessage] ?? message.typeMessage;
};

// Форматирование времени сообщения
const formatTime = (timestamp: number): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Ключ для группировки сообщений по дате
const getDateKey = (timestamp: number): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

// Форматирование даты разделителя
const formatDate = (timestamp: number): string => {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
};

// Компонент изображения в сообщении
const ImageMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !message.downloadUrl) {
    return <span className={styles.messageText}>📷 Фото</span>;
  }

  return (
    <>
      <img
        className={styles.messageImage}
        src={message.downloadUrl}
        alt={message.caption || "Изображение"}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {message.caption && (
        <span className={styles.messageImageCaption}>{message.caption}</span>
      )}
    </>
  );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  isLoadingMessages,
  messagesError,
  isSending,
  sendError,
  onSendMessage,
  onCloseChat,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");

  // Сообщения, отсортированные по времени
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.timestamp - b.timestamp),
    [messages],
  );

  // Автопрокрутка вниз при появлении новых сообщений
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Сброс черновика при переключении чата
  useEffect(() => {
    setDraft("");
  }, [chat?.chatId]);

  // Отправка сообщения
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    const sent = await onSendMessage(text);
    if (sent) {
      setDraft("");
    }
  };

  // Пустое состояние: ни один чат не выбран
  if (!chat) {
    return (
      <main className={styles.chatWindow}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>Max Chat Web</h2>
          <p className={styles.emptySubtitle}>
            Выберите чат для начала общения или создайте новый диалог.
          </p>
        </div>
      </main>
    );
  }

  const displayName = getChatDisplayName(chat);
  const avatarLetter = getChatInitial(chat);
  const isBotChat = chat.type === "bot";

  return (
    <main className={styles.chatWindow}>
      <header className={styles.chatHeader}>
        <button
          type="button"
          className={styles.closeChatBtn}
          onClick={onCloseChat}
          aria-label="Закрыть чат"
          title="Закрыть чат"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </button>
        <div className={styles.chatAvatar}>
          {chat.avatar ? (
            <img src={chat.avatar} alt={displayName} />
          ) : (
            <span>{avatarLetter}</span>
          )}
        </div>
        <div className={styles.chatDetails}>
          <span className={styles.chatTitle}>{displayName}</span>
        </div>
      </header>

      <div className={styles.messagesArea}>
        {isLoadingMessages && (
          <div className={styles.messagesStatus}>
            <div className={styles.loadingSpinner} />
            <div>Загрузка сообщений...</div>
          </div>
        )}

        {!isLoadingMessages && messagesError && (
          <div className={styles.messagesStatus}>{messagesError}</div>
        )}

        {!isLoadingMessages &&
          !messagesError &&
          sortedMessages.length === 0 && (
            <div className={styles.emptyMessages}>История сообщений чата</div>
          )}

        {!isLoadingMessages && !messagesError && sortedMessages.length > 0 && (
          <div className={styles.messagesList}>
            {sortedMessages.map((message, index) => {
              const isOutgoing = message.type === "outgoing";
              const isImage =
                message.typeMessage === "imageMessage" &&
                Boolean(message.downloadUrl);

              // Определяем, нужно ли показать разделитель с датой
              const previous = index > 0 ? sortedMessages[index - 1] : null;
              const showDate =
                !previous ||
                getDateKey(previous.timestamp) !==
                  getDateKey(message.timestamp);

              return (
                <Fragment key={message.idMessage}>
                  {showDate && (
                    <div className={styles.messageDate}>
                      {formatDate(message.timestamp)}
                    </div>
                  )}
                  <div
                    className={`${styles.messageRow} ${
                      isOutgoing
                        ? styles.messageRowOutgoing
                        : styles.messageRowIncoming
                    }`}
                  >
                    <div
                      className={`${styles.messageBubble} ${
                        isOutgoing
                          ? styles.messageBubbleOutgoing
                          : styles.messageBubbleIncoming
                      } ${isImage ? styles.messageBubbleImage : ""}`}
                    >
                      {isImage ? (
                        <>
                          <ImageMessage message={message} />
                          <span className={styles.messageTime}>
                            {formatTime(message.timestamp)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={styles.messageText}>
                            {getMessageText(message)}
                          </span>
                          <span className={styles.messageTime}>
                            {formatTime(message.timestamp)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <footer className={styles.composer}>
        {isBotChat ? (
          <div className={styles.composerDisabled}>
            Отправка сообщений в этот чат недоступна
          </div>
        ) : (
          <>
            {sendError && (
              <div className={styles.composerError}>{sendError}</div>
            )}
            <form className={styles.composerForm} onSubmit={handleSubmit}>
              <input
                className={styles.composerInput}
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Введите сообщение"
                disabled={isSending}
                aria-label="Текст сообщения"
              />
              <button
                className={styles.sendButton}
                type="submit"
                disabled={isSending || !draft.trim()}
                aria-label="Отправить сообщение"
                title="Отправить"
              >
                {isSending ? (
                  <span className={styles.sendSpinner} />
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                )}
              </button>
            </form>
          </>
        )}
      </footer>
    </main>
  );
};
