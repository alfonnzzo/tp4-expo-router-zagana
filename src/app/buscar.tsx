import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { EstadoCargando } from '@/components/EstadoCargando';
import { EstadoError } from '@/components/EstadoError';
import { EstadoVacio } from '@/components/EstadoVacio';
import { FilaLibro } from '@/components/FilaLibro';
import { colores, espaciado } from '@/constants/tema';
import { useBusqueda } from '@/hooks/useBusqueda';
import { leerParametro } from '@/lib/parametros';

export default function Buscar() {
  const parametros = useLocalSearchParams<{ q?: string }>();
  const texto = leerParametro(parametros.q);
  const { consulta, resultados, cargando, error, reintentar } = useBusqueda(texto);

  let estadoVacio = <EstadoVacio mensaje={'No encontramos libros para "' + consulta + '".'} />;
  if (consulta === '') {
    estadoVacio = <EstadoVacio mensaje="Escribí un título o un autor para empezar a buscar." />;
  } else if (cargando) {
    estadoVacio = <EstadoCargando mensaje="Buscando..." />;
  } else if (error !== null) {
    estadoVacio = <EstadoError mensaje={error} onReintentar={reintentar} />;
  }

  return (
    <FlatList
      style={estilos.lista}
      contentContainerStyle={estilos.contenido}
      contentInsetAdjustmentBehavior="automatic"
      data={resultados}
      keyExtractor={(libro) => libro.isbn}
      renderItem={({ item }) => <FilaLibro libro={item} />}
      ListHeaderComponent={
        <CampoTexto
          etiqueta="Buscar por título o autor"
          valor={texto}
          onCambiar={(nuevo) => router.setParams({ q: nuevo })}
          placeholder="Por ejemplo: Borges"
        />
      }
      ListEmptyComponent={estadoVacio}
      keyboardShouldPersistTaps="handled"
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
