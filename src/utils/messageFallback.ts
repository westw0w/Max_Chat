// Заглушки для нетекстовых типов сообщений (стикеры, геолокация, контакты и т.д.)
export const MESSAGE_FALLBACK: Record<string, string> = {
  imageMessage: '📷 Фото',
  videoMessage: '🎬 Видео',
  documentMessage: '📄 Документ',
  audioMessage: '🎵 Аудио',
  stickerMessage: '🙂 Стикер',
  locationMessage: '📍 Геолокация',
  contactMessage: '👤 Контакт',
  pollMessage: '📊 Опрос',
  reactionMessage: '👍 Реакция',
};
