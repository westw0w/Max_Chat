import React, { useState } from "react";
import type { GreenApiCredentials } from "@/types/auth";
import styles from "./Auth.module.css";

interface AuthProps {
  onSuccess?: (credentials: GreenApiCredentials) => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  // Поля формы и их значения
  const [idInstance, setIdInstance] = useState<string>(
    () => localStorage.getItem("green_api_id_instance") ?? "",
  );

  const [apiTokenInstance, setApiTokenInstance] = useState<string>(
    () => localStorage.getItem("green_api_token_instance") ?? "",
  );

  // Состояние процесса авторизации
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Ошибки валидации полей и общая ошибка
  const [errors, setErrors] = useState<{
    idInstance?: string;
    apiTokenInstance?: string;
    general?: string;
  }>({});

  // Валидация полей формы
  const validate = (): boolean => {
    const newErrors: {
      idInstance?: string;
      apiTokenInstance?: string;
      general?: string;
    } = {};

    const trimmedId = idInstance.trim();
    const trimmedToken = apiTokenInstance.trim();

    if (!trimmedId) {
      newErrors.idInstance = "Поле idInstance обязательно для заполнения";
    } else if (!/^\d+$/.test(trimmedId)) {
      newErrors.idInstance = "idInstance должен состоять только из цифр";
    }

    if (!trimmedToken) {
      newErrors.apiTokenInstance =
        "Поле apiTokenInstance обязательно для заполнения";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Сохранение учётных данных и переход к основному интерфейсу
  const loginWithCredentials = (trimmedId: string, trimmedToken: string) => {
    localStorage.setItem("green_api_id_instance", trimmedId);
    localStorage.setItem("green_api_token_instance", trimmedToken);

    const credentials: GreenApiCredentials = {
      idInstance: trimmedId,
      apiTokenInstance: trimmedToken,
    };

    if (onSuccess) {
      onSuccess(credentials);
    }
  };

  // Отправка формы: проверка учётных данных
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const trimmedId = idInstance.trim();
    const trimmedToken = apiTokenInstance.trim();

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(
        `https://api.green-api.com/waInstance${trimmedId}/getStateInstance/${trimmedToken}`,
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Неверный apiTokenInstance (401 Unauthorized)");
        } else if (response.status === 403) {
          throw new Error(
            "Доступ запрещен: проверьте idInstance (403 Forbidden)",
          );
        } else {
          const errData = await response.json().catch(() => null);
          throw new Error(
            errData?.message || `Ошибка авторизации (HTTP ${response.status})`,
          );
        }
      }

      await response.json();
      loginWithCredentials(trimmedId, trimmedToken);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Не удалось подключиться к серверу";
      setErrors({
        general: `${message}. Проверьте введенные данные.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Max Chat</h1>
          <p className={styles.subtitle}>Введите ваши учетные данные</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {errors.general && (
            <div className={styles.generalError}>{errors.general}</div>
          )}

          <div className={styles.field}>
            <label htmlFor="idInstance" className={styles.label}>
              idInstance
            </label>
            <input
              id="idInstance"
              type="number"
              className={`${styles.input} ${errors.idInstance ? styles.inputError : ""}`}
              placeholder="Введите idInstance"
              value={idInstance}
              onChange={(e) => {
                setIdInstance(e.target.value);
                if (errors.idInstance) {
                  setErrors((prev) => ({ ...prev, idInstance: undefined }));
                }
              }}
              disabled={isLoading}
              autoComplete="off"
            />
            {errors.idInstance && (
              <span className={styles.errorText}>{errors.idInstance}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="apiTokenInstance" className={styles.label}>
              apiTokenInstance
            </label>
            <input
              id="apiTokenInstance"
              type="password"
              className={`${styles.input} ${errors.apiTokenInstance ? styles.inputError : ""}`}
              placeholder="Введите apiTokenInstance"
              value={apiTokenInstance}
              onChange={(e) => {
                setApiTokenInstance(e.target.value);
                if (errors.apiTokenInstance) {
                  setErrors((prev) => ({
                    ...prev,
                    apiTokenInstance: undefined,
                  }));
                }
              }}
              disabled={isLoading}
              autoComplete="off"
            />
            {errors.apiTokenInstance && (
              <span className={styles.errorText}>
                {errors.apiTokenInstance}
              </span>
            )}
          </div>

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? "Проверка..." : "Продолжить"}
          </button>
        </form>
      </div>
    </div>
  );
};
