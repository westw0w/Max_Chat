export interface ChatItem {
  chatId: string;
  name: string;
  type: 'user' | 'group' | 'channel' | 'bot' | string;
  phoneNumber?: number;
  lastMessage?: string;
  lastMessageTimestamp?: number;
  avatar?: string;
  hasUnread?: boolean;
}
