import { useEffect } from 'react';

const STORAGE_KEY = 'felcin_welcome_notif_v1';

export function useWelcomeNotification() {
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    scheduleWelcomeNotification();
  }, []);
}

async function scheduleWelcomeNotification() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const { LocalNotifications } = await import('@capacitor/local-notifications');

    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1001,
          title: 'Welcome to Felcin 👋',
          body: 'Your fitness community is waiting. Come say hello!',
          schedule: { at: new Date(Date.now() + 60 * 60 * 1000) },
        },
      ],
    });

    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Plugin not available (web context) — silently skip
  }
}
