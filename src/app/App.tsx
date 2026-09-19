import { useState, useEffect } from "react";
import { Auth } from "@/components/Auth";
import { MainLayout } from "@/components/MainLayout";
import type { GreenApiCredentials } from "@/types/auth";

export function App() {
  // Учётные данные GREEN-API, полученные после успешной авторизации
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(
    null,
  );

  // При монтировании пытаемся восстановить сессию из localStorage
  useEffect(() => {
    const savedId = localStorage.getItem("green_api_id_instance");
    const savedToken = localStorage.getItem("green_api_token_instance");

    if (savedId && savedToken) {
      setCredentials({
        idInstance: savedId,
        apiTokenInstance: savedToken,
      });
    }
  }, []);

  // Обработчик успешной авторизации
  const handleLogin = (newCredentials: GreenApiCredentials) => {
    setCredentials(newCredentials);
  };

  // Обработчик выхода из аккаунта: очищает localStorage и сбрасывает состояние
  const handleLogout = () => {
    localStorage.removeItem("green_api_id_instance");
    localStorage.removeItem("green_api_token_instance");
    setCredentials(null);
  };

  // Если нет учётных данных — показываем форму авторизации
  if (!credentials) {
    return <Auth onSuccess={handleLogin} />;
  }

  // Иначе — основной интерфейс мессенджера
  return <MainLayout credentials={credentials} onLogout={handleLogout} />;
}
