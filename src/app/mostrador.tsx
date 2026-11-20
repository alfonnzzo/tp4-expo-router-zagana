import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { Boton } from '@/components/Boton';
import { CajaMensaje } from '@/components/CajaMensaje';
import { EstadoCargando } from '@/components/EstadoCargando';
import { EstadoError } from '@/components/EstadoError';
import { EstadoVacio } from '@/components/EstadoVacio';
import { FilaMostrador } from '@/components/FilaMostrador';
import { Pantalla } from '@/components/Pantalla';
import { espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useCatalogo } from '@/context/CatalogoContext';
import type { Libro } from '@/types';

type Resultado = {
  mensaje: string;
  tono: 'exito' | 'aviso';
};

export default function Mostrador() {
  const { libros, cargando, error, reintentar } = useCatalogo();
  const { esperas, entregarSiguiente, cerrarSesion } = useBiblioteca();
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const librosConEspera = libros.filter((libro) => (esperas[libro.isbn]?.length ?? 0) > 0);

  async function entregar(libro: Libro) {
    const persona = await entregarSiguiente(libro);
    if (persona === undefined) {
      setResultado({
        mensaje: 'No hay nadie en la lista de espera de ' + libro.titulo + '.',
        tono: 'aviso',
      });
      return;
    }
    setResultado({
      mensaje: 'Entregamos ' + libro.titulo + ' a ' + persona.nombre + '.',
      tono: 'exito',
    });
  }

  let estadoVacio = <EstadoVacio mensaje="No hay libros con lista de espera." />;
  if (cargando) {
    estadoVacio = <EstadoCargando mensaje="Cargando el catálogo..." />;
  } else if (error !== null) {
    estadoVacio = <EstadoError mensaje={error} onReintentar={reintentar} />;
  }

  return (
    <Pantalla>
      {resultado !== null ? <CajaMensaje tono={resultado.tono} mensaje={resultado.mensaje} /> : null}
      <FlatList
        style={estilos.lista}
        contentContainerStyle={estilos.contenido}
        data={librosConEspera}
        keyExtractor={(libro) => libro.isbn}
        renderItem={({ item }) => (
          <FilaMostrador libro={item} personas={esperas[item.isbn] ?? []} onEntregar={entregar} />
        )}
        ListEmptyComponent={estadoVacio}
      />
      <Boton titulo="Cerrar sesión" variante="peligro" onPress={cerrarSesion} />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  lista: {
    flex: 1,
  },
  contenido: {
    gap: espaciado.s,
  },
});
