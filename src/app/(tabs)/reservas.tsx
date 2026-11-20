import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { CajaMensaje } from '@/components/CajaMensaje';
import { ItemReservas } from '@/components/ItemReservas';
import { colores, espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useCatalogo } from '@/context/CatalogoContext';
import { usePermiso } from '@/hooks/usePermiso';
import { obtenerReservasEnEspera } from '@/lib/reservas';
import type { Aviso, EstadoPermiso, ItemReservas as TipoItemReservas, Prestamo, ReservaEnEspera } from '@/types';

function armarItems(
  prestamos: Prestamo[],
  reservas: ReservaEnEspera[],
  avisos: Aviso[],
): TipoItemReservas[] {
  const items: TipoItemReservas[] = [{ clave: 'titulo-prestamos', tipo: 'titulo', texto: 'Mis préstamos' }];
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
      renderItem={({ item }) => (
        <ItemReservas
          item={item}
          onCambiarRecordatorio={cambiarRecordatorio}
          onDevolver={devolver}
        />
      )}
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
