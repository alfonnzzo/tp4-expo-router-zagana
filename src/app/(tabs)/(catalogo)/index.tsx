import { FlatList, StyleSheet } from 'react-native';

import { CabeceraCatalogo } from '@/components/CabeceraCatalogo';
import { EstadoCargando } from '@/components/EstadoCargando';
import { EstadoError } from '@/components/EstadoError';
import { EstadoVacio } from '@/components/EstadoVacio';
import { FilaLibro } from '@/components/FilaLibro';
import { colores, espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useCatalogo } from '@/context/CatalogoContext';

export default function Catalogo() {
  const { libros, cargando, error, reintentar } = useCatalogo();
  const { recientes } = useBiblioteca();

  let estadoVacio = <EstadoVacio mensaje="Todavía no hay libros en el catálogo." />;
  if (cargando) {
    estadoVacio = <EstadoCargando mensaje="Cargando el catálogo..." />;
  } else if (error !== null) {
    estadoVacio = <EstadoError mensaje={error} onReintentar={reintentar} />;
  }

  return (
    <FlatList
      style={estilos.lista}
      contentContainerStyle={estilos.contenido}
      data={libros}
      keyExtractor={(libro) => libro.isbn}
      renderItem={({ item }) => <FilaLibro libro={item} />}
      ListHeaderComponent={<CabeceraCatalogo recientes={recientes} />}
      ListEmptyComponent={estadoVacio}
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
