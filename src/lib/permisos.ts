import { Camera } from 'expo-camera';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications';

import { crearCanalPrestamos } from '@/lib/notificaciones';
import type { EstadoPermiso, Recurso } from '@/types';

type RespuestaSistema = {
  granted: boolean;
  canAskAgain: boolean;
};

type TextosRecurso = {
  titulo: string;
  beneficio: string;
  rutaAjustesAndroid: string;
  rutaAjustesIos: string;
};

export const TEXTOS: Record<Recurso, TextosRecurso> = {
  camara: {
    titulo: 'Cámara',
    beneficio: 'Usamos tu cámara para leer el código de barras del libro y abrirlo en el catálogo.',
    rutaAjustesAndroid:
      'Ajustes > Aplicaciones > Biblioteca IPF > Permisos > Cámara > Permitir solo mientras la app está en uso.',
    rutaAjustesIos: 'Ajustes > Biblioteca IPF > Cámara > activar.',
  },
  notificaciones: {
    titulo: 'Notificaciones',
    beneficio: 'Usamos tus notificaciones para recordarte la fecha de devolución de tus libros.',
    rutaAjustesAndroid:
      'Ajustes > Aplicaciones > Biblioteca IPF > Notificaciones > Permitir notificaciones.',
    rutaAjustesIos: 'Ajustes > Biblioteca IPF > Notificaciones > Permitir notificaciones.',
  },
};

export function calcularEstado(respuesta: RespuestaSistema): EstadoPermiso {
  if (respuesta.granted) {
    return 'concedido';
  }
  if (respuesta.canAskAgain) {
    return 'preguntable';
  }
  return 'bloqueado';
}

export async function consultarPermiso(recurso: Recurso): Promise<EstadoPermiso> {
  try {
    if (recurso === 'camara') {
      return calcularEstado(await Camera.getCameraPermissionsAsync());
    }
    return calcularEstado(await getPermissionsAsync());
  } catch {
    return 'preguntable';
  }
}

export async function solicitarPermiso(recurso: Recurso): Promise<EstadoPermiso> {
  try {
    if (recurso === 'camara') {
      return calcularEstado(await Camera.requestCameraPermissionsAsync());
    }
    await crearCanalPrestamos();
    return calcularEstado(await requestPermissionsAsync());
  } catch {
    return 'preguntable';
  }
}
