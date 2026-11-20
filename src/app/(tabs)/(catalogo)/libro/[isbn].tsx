import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { CajaMensaje } from '@/components/CajaMensaje';
import { EnlaceCatalogo } from '@/components/EnlaceCatalogo';
import { EstadoCargando } from '@/components/EstadoCargando';
import { EstadoError } from '@/components/EstadoError';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useCatalogo } from '@/context/CatalogoContext';
import { esIsbnValido } from '@/lib/isbn';
import { leerParametro } from '@/lib/parametros';
import { calcularDisponibles } from '@/lib/reservas';

export default function DetalleLibro() {
  const parametros = useLocalSearchParams<{ isbn: string }>();
  const isbn = leerParametro(parametros.isbn);
  const { libros, cargando, error, reintentar } = useCatalogo();
  const { prestamos, esperas, registrarVisto } = useBiblioteca();

  const libro = esIsbnValido(isbn) ? libros.find((item) => item.isbn === isbn) : undefined;

  useEffect(() => {
    if (libro !== undefined) {
      registrarVisto(libro);
    }
  }, [libro, registrarVisto]);

  function reservar() {
    router.push({ pathname: '/reservar/[isbn]', params: { isbn } });
  }

  if (!esIsbnValido(isbn)) {
    return (
      <Pantalla>
        <CajaMensaje
          tono="peligro"
          mensaje="El ISBN no es válido. Tiene que tener 13 números, sin guiones."
        />
        <EnlaceCatalogo />
      </Pantalla>
    );
  }

  if (cargando) {
    return (
      <Pantalla>
        <EstadoCargando mensaje="Buscando el libro..." />
      </Pantalla>
    );
  }

  if (error !== null) {
    return (
      <Pantalla>
        <EstadoError mensaje={error} onReintentar={reintentar} />
        <EnlaceCatalogo />
      </Pantalla>
    );
  }

  if (libro === undefined) {
    return (
      <Pantalla>
        <CajaMensaje tono="aviso" mensaje={'No encontramos ningún libro con el ISBN ' + isbn + '.'} />
        <EnlaceCatalogo />
      </Pantalla>
    );
  }

  const disponibles = calcularDisponibles(libro, prestamos);
  const enEspera = esperas[libro.isbn]?.length ?? 0;

  return (
    <Pantalla>
      <Stack.Screen options={{ title: libro.titulo }} />
      <Texto variante="titulo">{libro.titulo}</Texto>
      <View style={estilos.datos}>
        <Texto>Autor: {libro.autor}</Texto>
        <Texto>Año: {libro.anio}</Texto>
        <Texto>Ejemplares disponibles: {disponibles}</Texto>
        <Texto>Personas en lista de espera: {enEspera}</Texto>
        <Texto variante="pequeno">ISBN {libro.isbn}</Texto>
      </View>
      <Boton titulo="Reservar" onPress={reservar} />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  datos: {
    gap: espaciado.s,
  },
});
