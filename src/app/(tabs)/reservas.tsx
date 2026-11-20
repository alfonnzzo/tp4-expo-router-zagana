import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { CajaMensaje } from '@/components/CajaMensaje';
import { EstadoVacio } from '@/components/EstadoVacio';
import { FilaPrestamo } from '@/components/FilaPrestamo';
import { FilaReservaEspera } from '@/components/FilaReservaEspera';
import { TituloSeccion } from '@/components/TituloSeccion';
import { colores, espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useCatalogo } from '@/context/CatalogoContext';
import { usePermiso } from '@/hooks/usePermiso';
import { obtenerReservasEnEspera } from '@/lib/reservas';
import type { Aviso, EstadoPermiso, Prestamo, ReservaEnEspera } from '@/types';

type ItemLista =
  | { clave: string; tipo: 'titulo'; texto: string }
  | { clave: string; tipo: 'vacio'; mensaje: string }
  | { clave: string; tipo: 'prestamo'; prestamo: Prestamo }
  | { clave: string; tipo: 'espera'; reserva: ReservaEnEspera }
  | { clave: string; tipo: 'aviso'; aviso: Aviso };

function armarItems(
  prestamos: Prestamo[],
  reservas: ReservaEnEspera[],
  avisos: Aviso[],
): ItemLista[] {
  const items: ItemLista[] = [{ clave: 'titulo-prestamos', tipo: 'titulo', texto: 'Mis préstamos' }];
  if (prestamos.length === 0) {
    items.push({ clave: 'vacio-prestamos', tipo: 'vacio', mensaje: 'No tenés préstamos activos.' });
  }
  for (const prestamo of prestamos) {
    items.push({ clave: 'prestamo-' + prestamo.isbn, tipo: 'prestamo', prestamo });
  }
  items.push({ clave: 'titulo-espera', tipo: 'titulo', texto: 'Mis reservas en espera' });
  if (reservas.length === 0) {
    items.push({ clave: 'vacio-espera', tipo: 'vacio', mensaje: 'No estás en ninguna lista de espera.' });
  }
  for (const reserva of reservas) {
    items.push({ clave: 'espera-' + reserva.isbn, tipo: 'espera', reserva });
  }
  items.push({ clave: 'titulo-avisos', tipo: 'titulo', texto: 'Avisos' });
  if (avisos.length === 0) {
    items.push({ clave: 'vacio-avisos', tipo: 'vacio', mensaje: 'No tenés avisos nuevos.' });
  }
  for (const aviso of avisos) {
    items.push({ clave: aviso.id, tipo: 'aviso', aviso });
  }
  return items;
}

function describirNotificaciones(estado: EstadoPermiso): string {
  if (estado === 'concedido') {
    return 'Las notificaciones están permitidas.';
  }
  if (estado === 'bloqueado') {
    return 'Las notificaciones están bloqueadas. Los avisos aparecen acá, dentro de la app.';
  }
  return 'Las notificaciones no están activadas. Se piden al activar "Recordarme".';
}

export default function MisReservas() {
  const { prestamos, esperas, avisos, devolver, activarRecordatorio, desactivarRecordatorio } =
    useBiblioteca();
  const { libros } = useCatalogo();
  const { estado, revisar } = usePermiso('notificaciones');
  const pendiente = useRef<string | null>(null);

  const reservas = obtenerReservasEnEspera(esperas, libros);
  const items = armarItems(prestamos, reservas, avisos);

  useEffect(() => {
    const isbn = pendiente.current;
    if (estado === 'concedido' && isbn !== null) {
      pendiente.current = null;
      activarRecordatorio(isbn);
    }
  }, [estado, activarRecordatorio]);

  useFocusEffect(
    useCallback(() => {
      revisar();
      if (estado !== 'concedido') {
        pendiente.current = null;
      }
    }, [revisar, estado]),
  );

  async function cambiarRecordatorio(isbn: string, activar: boolean) {
    if (!activar) {
      await desactivarRecordatorio(isbn);
      return;
    }
    if (estado === 'concedido') {
      await activarRecordatorio(isbn);
      return;
    }
    pendiente.current = isbn;
    router.push('/permisos/notificaciones');
  }

  return (
    <FlatList
      style={estilos.lista}
      contentContainerStyle={estilos.contenido}
      data={items}
      keyExtractor={(item) => item.clave}
      ListHeaderComponent={<CajaMensaje mensaje={describirNotificaciones(estado)} />}
      renderItem={({ item }) => {
        if (item.tipo === 'titulo') {
          return <TituloSeccion texto={item.texto} />;
        }
        if (item.tipo === 'vacio') {
          return <EstadoVacio mensaje={item.mensaje} />;
        }
        if (item.tipo === 'prestamo') {
          return (
            <FilaPrestamo
              prestamo={item.prestamo}
              onCambiarRecordatorio={cambiarRecordatorio}
              onDevolver={devolver}
            />
          );
        }
        if (item.tipo === 'espera') {
          return <FilaReservaEspera reserva={item.reserva} />;
        }
        return <CajaMensaje tono="aviso" mensaje={item.aviso.mensaje} />;
      }}
    />
  );
}

const estilos = StyleSheet.create({
  lista: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    padding: espaciado.l,
    gap: espaciado.s,
  },
});
