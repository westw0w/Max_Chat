// Звуковое уведомление о новом входящем сообщении.
let audioContext: AudioContext | null = null;

export const playNotificationSound = (): void => {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) return;

    if (!audioContext) {
      audioContext = new AudioContextCtor();
    }

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const now = audioContext.currentTime;

    const playBeep = (startTime: number, frequency: number) => {
      const oscillator = audioContext!.createOscillator();
      const gain = audioContext!.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

      oscillator.connect(gain);
      gain.connect(audioContext!.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    };

    playBeep(now, 880);
    playBeep(now + 0.22, 1174.66);
  } catch {
  }
};
