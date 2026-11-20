import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { EstadoCargando } from '@/components/EstadoCargando';
import { EstadoError } from '@/components/EstadoError';
import { EstadoVacio } from '@/components/EstadoVacio';
import { FilaLibro } from '@/components/FilaLibro';
import { Pantalla } from '@/components/Pantalla';
import { espaciado } from '@/constants/tema';
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
    <Pantalla>
      <CampoTexto
        etiqueta="Buscar por título o autor"
        valor={texto}
        onCambiar={(nuevo) => router.setParams({ q: nuevo })}
        placeholder="Por ejemplo: Borges"
      />
      <FlatList
        contentContainerStyle={estilos.contenido}
        data={resultados}
        keyExtractor={(libro) => libro.isbn}
        renderItem={({ item }) => <FilaLibro libro={item} />}
        ListEmptyComponent={estadoVacio}
        keyboardShouldPersistTaps="handled"
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    gap: espaciado.s,
  },
});
