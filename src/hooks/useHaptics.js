import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export function useHaptics() {
  const isAvailable = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();

  const triggerLight = async () => {
    if (!isAvailable) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      // Gracefully do nothing
    }
  };

  const triggerMedium = async () => {
    if (!isAvailable) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      // Gracefully do nothing
    }
  };

  const triggerSuccess = async () => {
    if (!isAvailable) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      // Gracefully do nothing
    }
  };

  return { triggerLight, triggerMedium, triggerSuccess };
}
