import type { ChatItem } from '@/types/chat';

// Получение отображаемого имени чата
export const getChatDisplayName = (chat: ChatItem): string => {
  if (chat.name && chat.name.trim()) {
    return chat.name;
  }
  if (chat.phoneNumber) {
    return `+${chat.phoneNumber}`;
  }
  return chat.chatId;
};

// Получение первой буквы имени для аватара
export const getChatInitial = (chat: ChatItem): string => {
  const name = getChatDisplayName(chat);
  return name ? name.charAt(0).toUpperCase() : '?';
};
