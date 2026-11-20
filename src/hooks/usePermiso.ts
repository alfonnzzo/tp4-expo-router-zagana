import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState, Linking } from 'react-native';

import { consultarPermiso, solicitarPermiso } from '@/lib/permisos';
import type { EstadoPermiso, Recurso } from '@/types';

const almacen: Record<Recurso, EstadoPermiso> = {
  camara: 'cargando',
  notificaciones: 'cargando',
};

const oyentes = new Set<() => void>();

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function guardar(recurso: Recurso, estado: EstadoPermiso) {
  if (almacen[recurso] === estado) {
    return;
  }
  almacen[recurso] = estado;
  oyentes.forEach((oyente) => oyente());
}

export function usePermiso(recurso: Recurso) {
  const estado = useSyncExternalStore(
    suscribir,
    () => almacen[recurso],
    () => almacen[recurso],
  );
  const anterior = useRef(AppState.currentState);

  const revisar = useCallback(async () => {
    guardar(recurso, await consultarPermiso(recurso));
  }, [recurso]);

  const pedir = useCallback(async (): Promise<EstadoPermiso> => {
    const nuevoEstado = await solicitarPermiso(recurso);
    guardar(recurso, nuevoEstado);
    return nuevoEstado;
  }, [recurso]);

  const abrirAjustes = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  useEffect(() => {
    revisar();
  }, [revisar]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (nuevo) => {
      const estabaAfuera = anterior.current === 'background' || anterior.current === 'inactive';
      if (estabaAfuera && nuevo === 'active') {
        revisar();
      }
      anterior.current = nuevo;
    });
    return () => suscripcion.remove();
  }, [revisar]);

  return { estado, pedir, abrirAjustes, revisar };
}
