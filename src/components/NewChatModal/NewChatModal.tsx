import React, { useState } from "react";
import type { ChatItem } from "@/types/chat";
import styles from "./NewChatModal.module.css";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: (newChat: ChatItem) => Promise<void>;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onCreateChat,
}) => {
  // Номер телефона для нового чата
  const [targetId, setTargetId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Создание чата
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTarget = targetId.trim();
    if (!trimmedTarget) return;

    const cleanNumber = trimmedTarget.replace(/\D/g, "");
    const isPhone = cleanNumber.length === 11;

    const newChat: ChatItem = {
      chatId: isPhone ? cleanNumber : trimmedTarget,
      name: isPhone ? `+${cleanNumber}` : trimmedTarget,
      type: "user",
      phoneNumber: isPhone ? parseInt(cleanNumber, 10) : undefined,
    };

    setError(null);
    setIsSubmitting(true);

    try {
      await onCreateChat(newChat);
      setTargetId("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать чат");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Новый чат</h3>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Номер телефона *</label>
            <input
              type="tel"
              className={styles.input}
              placeholder="Например: 79991234567"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              pattern="[0-9]{11,11}"
              title="Только цифры, 11 знаков"
              required
              autoFocus
            />
            {error && <p className={styles.error}>{error}</p>}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Проверка..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
