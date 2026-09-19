// Входящее сообщение после парсинга уведомления
export interface IncomingMessage {
  idMessage: string;
  chatId: string;
  chatName?: string;
  chatType?: string;
  timestamp: number;
  typeMessage: string;
  textMessage?: string;
  downloadUrl?: string;
  caption?: string;
  senderName?: string;
  senderContactName?: string;
  senderPhoneNumber?: number;
}

// Данные отправителя из тела уведомления
export interface IncomingSenderData {
  chatId: string;
  chatName?: string;
  chatType?: string;
  sender?: string;
  senderName?: string;
  senderType?: string;
  senderContactName?: string;
  senderPhoneNumber?: number;
}

// Данные файла 
export interface IncomingFileMessageData {
  downloadUrl?: string;
  caption?: string;
  mimeType?: string;
  fileName?: string;
}

// Данные сообщения из тела уведомления
export interface IncomingMessageData {
  typeMessage: string;
  textMessageData?: { textMessage: string };
  extendedTextMessageData?: { text: string };
  fileMessageData?: IncomingFileMessageData;
}

// Тело входящего уведомления
export interface IncomingNotificationBody {
  typeWebhook: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: IncomingSenderData;
  messageData?: IncomingMessageData;
}

// Полная структура входящего уведомления из очереди
export interface IncomingNotification {
  receiptId: number;
  body: IncomingNotificationBody;
}

// Направление сообщения
export type MessageDirection = 'incoming' | 'outgoing';

// Сообщение чата для отображения в истории
export interface ChatMessage {
  idMessage: string;
  type: MessageDirection;
  timestamp: number;
  typeMessage: string;
  textMessage?: string;
  downloadUrl?: string;
  caption?: string;
  senderName?: string;
  senderContactName?: string;
  statusMessage?: string;
}
