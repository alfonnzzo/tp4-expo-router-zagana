import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { CajaMensaje } from '@/components/CajaMensaje';
import { EstadoCargando } from '@/components/EstadoCargando';
import { EstadoError } from '@/components/EstadoError';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { DIAS_PRESTAMO } from '@/constants/biblioteca';
import { espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useCatalogo } from '@/context/CatalogoContext';
import { esIsbnValido } from '@/lib/isbn';
import { cerrarPantalla } from '@/lib/navegacion';
import { leerParametro } from '@/lib/parametros';
import { calcularDisponibles } from '@/lib/reservas';

export default function ConfirmarReserva() {
  const parametros = useLocalSearchParams<{ isbn: string }>();
  const isbn = leerParametro(parametros.isbn);
  const { libros, cargando, error, reintentar } = useCatalogo();
  const { prestamos, esperas, reservar } = useBiblioteca();
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const libro = esIsbnValido(isbn) ? libros.find((item) => item.isbn === isbn) : undefined;

  function confirmar() {
    if (libro === undefined) {
      return;
    }
    const resultado = reservar(libro);
    if (resultado.tipo === 'repetida') {
      setMensajeError('Ya reservaste este libro. No se puede reservar dos veces.');
      return;
    }
    router.dismissTo('/reservas');
  }

  if (cargando) {
    return (
      <Pantalla>
        <EstadoCargando mensaje="Preparando la reserva..." />
      </Pantalla>
    );
  }

  if (error !== null) {
    return (
      <Pantalla>
        <EstadoError mensaje={error} onReintentar={reintentar} />
        <Boton titulo="Cancelar" variante="secundario" onPress={cerrarPantalla} />
      </Pantalla>
    );
  }

  if (libro === undefined) {
    return (
      <Pantalla>
        <CajaMensaje tono="aviso" mensaje="No encontramos el libro que querés reservar." />
        <Boton titulo="Cerrar" variante="secundario" onPress={cerrarPantalla} />
      </Pantalla>
    );
  }

  const yaPrestado = prestamos.some((prestamo) => prestamo.isbn === libro.isbn);
  const yaEnEspera = (esperas[libro.isbn] ?? []).some((persona) => persona.esMia);
  const hayEjemplares = calcularDisponibles(libro, prestamos) > 0;
  const posicion = (esperas[libro.isbn]?.length ?? 0) + 1;

  return (
    <Pantalla>
      <Texto variante="titulo">{libro.titulo}</Texto>
      <Texto variante="suave">{libro.autor}</Texto>
      {yaPrestado || yaEnEspera ? (
        <CajaMensaje tono="aviso" mensaje="Ya reservaste este libro. No se puede reservar dos veces." />
      ) : hayEjemplares ? (
        <CajaMensaje
          tono="exito"
          mensaje={
            'Hay ejemplares disponibles. Te lo prestamos por ' + DIAS_PRESTAMO + ' días a partir de hoy.'
          }
        />
      ) : (
        <CajaMensaje
          tono="aviso"
          mensaje={
            'No quedan ejemplares. Te anotamos en la lista de espera. Vas a ser la persona número ' +
            posicion +
            '.'
          }
        />
      )}
      {mensajeError !== null ? <CajaMensaje tono="peligro" mensaje={mensajeError} /> : null}
      <View style={estilos.acciones}>
        <Boton titulo="Confirmar" onPress={confirmar} deshabilitado={yaPrestado || yaEnEspera} />
        <Boton titulo="Cancelar" variante="secundario" onPress={cerrarPantalla} />
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  acciones: {
    gap: espaciado.s,
  },
});
