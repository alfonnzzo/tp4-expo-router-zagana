import {
  AndroidImportance,
  SchedulableTriggerInputTypes,
  cancelScheduledNotificationAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import {
  CANAL_PRESTAMOS,
  MODO_DEMOSTRACION,
  SEGUNDOS_ANTICIPO_RECORDATORIO,
  SEGUNDOS_RECORDATORIO_DEMO,
} from '@/constants/biblioteca';
import type { Prestamo } from '@/types';

export function configurarNotificaciones() {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function crearCanalPrestamos() {
  if (Platform.OS !== 'android') {
    return;
  }
  await setNotificationChannelAsync(CANAL_PRESTAMOS, {
    name: 'Préstamos',
    importance: AndroidImportance.DEFAULT,
  });
}

function calcularSegundos(devolucion: number): number {
  if (MODO_DEMOSTRACION) {
    return SEGUNDOS_RECORDATORIO_DEMO;
  }
  const segundosHastaDevolucion = Math.floor((devolucion - Date.now()) / 1000);
  return Math.max(1, segundosHastaDevolucion - SEGUNDOS_ANTICIPO_RECORDATORIO);
}

export async function programarRecordatorio(prestamo: Prestamo): Promise<string> {
  await crearCanalPrestamos();
  return scheduleNotificationAsync({
    content: {
      title: 'Devolución de un libro',
      body: 'Recordá devolver ' + prestamo.titulo + ' a la biblioteca.',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: calcularSegundos(prestamo.devolucion),
      channelId: CANAL_PRESTAMOS,
    },
  });
}

export async function cancelarRecordatorio(identificador: string): Promise<void> {
  try {
    await cancelScheduledNotificationAsync(identificador);
  } catch {
    return;
  }
}

export async function notificarLibroListo(titulo: string): Promise<void> {
  await crearCanalPrestamos();
  await scheduleNotificationAsync({
    content: {
      title: 'Tu reserva está lista',
      body: 'Ya podés retirar ' + titulo + ' en el mostrador.',
    },
    trigger: { channelId: CANAL_PRESTAMOS },
  });
}
