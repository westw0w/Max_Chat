import type { GreenApiCredentials } from '@/types/auth';
import type { ChatItem } from '@/types/chat';
import type {
  ChatMessage,
  IncomingMessage,
  IncomingNotification,
} from '@/types/message';
import { MESSAGE_FALLBACK } from '@/utils/messageFallback';

const getBaseUrl = (credentials: GreenApiCredentials): string => {
  return credentials.apiUrl || 'https://api.green-api.com';
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const fetchWithRetry = async (
  input: string,
  init?: RequestInit,
  maxRetries: number = 4
): Promise<Response> => {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(input, init);
    lastResponse = response;

    if (!RETRYABLE_STATUSES.has(response.status)) {
      return response;
    }

    const backoffMs = Math.min(15000, 1000 * 2 ** attempt);
    await sleep(backoffMs);
  }

  return lastResponse as Response;
};

const createThrottle = (minIntervalMs: number) => {
  let lastCallAt = 0;
  return async (): Promise<void> => {
    const now = Date.now();
    const wait = Math.max(0, minIntervalMs - (now - lastCallAt));
    if (wait > 0) {
      await sleep(wait);
    }
    lastCallAt = Date.now();
  };
};

const throttleGetChats = createThrottle(1100);
const throttleGetChatHistory = createThrottle(1100);

const CHATS_CACHE_TTL_MS = 30_000;

let chatsCache: { key: string; data: ChatItem[]; at: number } | null = null;
let chatsInFlight: { key: string; promise: Promise<ChatItem[]> } | null = null;

const doFetchChats = async (
  credentials: GreenApiCredentials
): Promise<ChatItem[]> => {
  const baseUrl = getBaseUrl(credentials);

  // GetChats имеет лимит 1 запрос/сек.
  await throttleGetChats();

  const response = await fetchWithRetry(
    `${baseUrl}/waInstance${credentials.idInstance}/getChats/${credentials.apiTokenInstance}`
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Ошибка авторизации: недействительный токен');
    }
    throw new Error(`Не удалось загрузить чаты (код ${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// Единый запрос для параллельных вызовов
export const fetchChats = (
  credentials: GreenApiCredentials
): Promise<ChatItem[]> => {
  const key = `${credentials.idInstance}:${credentials.apiTokenInstance}`;

  const cached = chatsCache;
  if (
    cached &&
    cached.key === key &&
    Date.now() - cached.at < CHATS_CACHE_TTL_MS
  ) {
    return Promise.resolve(cached.data);
  }

  const existing = chatsInFlight;
  if (existing && existing.key === key) {
    return existing.promise;
  }

  const promise = doFetchChats(credentials)
    .then((data) => {
      chatsCache = { key, data, at: Date.now() };
      return data;
    })
    .finally(() => {
      if (chatsInFlight?.key === key) {
        chatsInFlight = null;
      }
    });

  chatsInFlight = { key, promise };
  return promise;
};

export const fetchChatHistory = async (
  credentials: GreenApiCredentials,
  chatId: string,
  count: number = 100
): Promise<ChatMessage[]> => {
  const baseUrl = getBaseUrl(credentials);

  await throttleGetChatHistory();

  const response = await fetchWithRetry(
    `${baseUrl}/waInstance${credentials.idInstance}/getChatHistory/${credentials.apiTokenInstance}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, count }),
    }
  );

  if (!response.ok) {
    throw new Error(`Не удалось загрузить историю чата (код ${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return (data as Record<string, unknown>[])
    .filter((m) => m.type === 'incoming' || m.type === 'outgoing')
    .map((item) => {
      const fileData = item.fileMessageData as
        | { downloadUrl?: string; caption?: string }
        | undefined;

      const downloadUrl =
        (item.downloadUrl as string | undefined) || fileData?.downloadUrl;
      const caption =
        (item.caption as string | undefined) || fileData?.caption;

      return {
        ...item,
        downloadUrl,
        caption,
      } as unknown as ChatMessage;
    })
    .sort((a, b) => a.timestamp - b.timestamp);
};

export interface SendMessageResult {
  idMessage: string;
}

export const sendTextMessage = async (
  credentials: GreenApiCredentials,
  chatId: string,
  message: string
): Promise<SendMessageResult> => {
  const baseUrl = getBaseUrl(credentials);

  const response = await fetchWithRetry(
    `${baseUrl}/waInstance${credentials.idInstance}/sendMessage/${credentials.apiTokenInstance}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    }
  );

  if (!response.ok) {
    throw new Error(`Не удалось отправить сообщение (код ${response.status})`);
  }

  return (await response.json()) as SendMessageResult;
};

export interface CheckAccountResult {
  exist: boolean;
  chatId: string;
  fromCache: boolean;
  status?: boolean;
  reason?: string;
}

export const checkAccount = async (
  credentials: GreenApiCredentials,
  phoneNumber: number
): Promise<CheckAccountResult> => {
  const baseUrl = getBaseUrl(credentials);

  const response = await fetchWithRetry(
    `${baseUrl}/waInstance${credentials.idInstance}/checkAccount/${credentials.apiTokenInstance}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Не удалось проверить номер телефона (код ${response.status})`
    );
  }

  const data = (await response.json()) as CheckAccountResult;

  if (data.status === false) {
    throw new Error(data.reason || 'Не удалось проверить номер телефона');
  }

  return data;
};

export const receiveNotification = async (
  credentials: GreenApiCredentials,
  timeout: number = 5
): Promise<IncomingNotification | null> => {
  const baseUrl = getBaseUrl(credentials);
  const response = await fetchWithRetry(
    `${baseUrl}/waInstance${credentials.idInstance}/receiveNotification/${credentials.apiTokenInstance}?receiveTimeout=${timeout}`
  );

  const text = await response.text().catch(() => '');

  if (!response.ok) {
    if (!text.trim()) {
      return null;
    }
    throw new Error(`Ошибка получения уведомления (${response.status})`);
  }

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as IncomingNotification;
  } catch {
    return null;
  }
};

export const deleteNotification = async (
  credentials: GreenApiCredentials,
  receiptId: number
): Promise<boolean> => {
  const baseUrl = getBaseUrl(credentials);
  const response = await fetchWithRetry(
    `${baseUrl}/waInstance${credentials.idInstance}/deleteNotification/${credentials.apiTokenInstance}/${receiptId}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error(`Ошибка удаления уведомления (${response.status})`);
  }

  const data = await response.json();
  return data.result === true;
};

export const parseIncomingMessage = (
  notification: IncomingNotification | null
): IncomingMessage | null => {
  if (!notification?.body) return null;

  const { body } = notification;

  if (body.typeWebhook !== 'incomingMessageReceived') return null;

  const senderData = body.senderData;
  const messageData = body.messageData;

  if (!senderData || !messageData) return null;

  let textMessage: string | undefined;
  let downloadUrl: string | undefined;
  let caption: string | undefined;

  if (messageData.typeMessage === 'textMessage') {
    textMessage = messageData.textMessageData?.textMessage;
  } else if (messageData.typeMessage === 'extendedTextMessage') {
    textMessage = messageData.extendedTextMessageData?.text;
  } else if (messageData.typeMessage === 'imageMessage') {
    downloadUrl = messageData.fileMessageData?.downloadUrl;
    caption = messageData.fileMessageData?.caption;
    textMessage = caption;
  } else {
    textMessage = MESSAGE_FALLBACK[messageData.typeMessage];
  }

  return {
    idMessage: body.idMessage ?? '',
    chatId: senderData.chatId,
    chatName: senderData.chatName,
    chatType: senderData.chatType,
    timestamp: body.timestamp ?? 0,
    typeMessage: messageData.typeMessage,
    textMessage,
    downloadUrl,
    caption,
    senderName: senderData.senderName,
    senderContactName: senderData.senderContactName,
    senderPhoneNumber: senderData.senderPhoneNumber,
  };
};
