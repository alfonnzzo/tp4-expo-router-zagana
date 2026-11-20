import type { BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { CajaMensaje } from '@/components/CajaMensaje';
import { FormularioIsbn } from '@/components/FormularioIsbn';
import { ZonaCamara } from '@/components/ZonaCamara';
import { colores, espaciado } from '@/constants/tema';
import { useCatalogo } from '@/context/CatalogoContext';
import { usePermiso } from '@/hooks/usePermiso';

export default function Escanear() {
  const { estado, abrirAjustes } = usePermiso('camara');
  const { libros, cargando, error } = useCatalogo();
  const [aviso, setAviso] = useState<string | null>(null);
  const [falloCamara, setFalloCamara] = useState(false);
  const yaNavego = useRef(false);
  const ultimoCodigo = useRef<string | null>(null);
  const previaMostrada = useRef(false);

  useEffect(() => {
    if (estado === 'preguntable' && !previaMostrada.current) {
      previaMostrada.current = true;
      router.push('/permisos/camara');
    }
  }, [estado]);

  function abrirLibro(isbn: string) {
    if (yaNavego.current) {
      return;
    }
    if (cargando || error !== null) {
      setAviso('El catálogo todavía no está disponible. Esperá unos segundos e intentá de nuevo.');
      return;
    }
    const libro = libros.find((item) => item.isbn === isbn);
    if (libro === undefined) {
      setAviso('El libro con ISBN ' + isbn + ' no está en el catálogo. Podés seguir escaneando.');
      return;
    }
    yaNavego.current = true;
    router.replace({ pathname: '/libro/[isbn]', params: { isbn: libro.isbn } });
  }

  function alLeer(resultado: BarcodeScanningResult) {
    if (yaNavego.current || resultado.data === ultimoCodigo.current) {
      return;
    }
    ultimoCodigo.current = resultado.data;
    abrirLibro(resultado.data);
  }

  function seguirEscaneando() {
    ultimoCodigo.current = null;
    setAviso(null);
  }

  return (
    <View style={estilos.pantalla}>
      <ZonaCamara
        estado={estado}
        falloCamara={falloCamara}
        onLeer={alLeer}
        onFalloMontaje={() => setFalloCamara(true)}
        onReintentarCamara={() => setFalloCamara(false)}
        onPedirPermiso={() => router.push('/permisos/camara')}
        onAbrirAjustes={abrirAjustes}
      />
      <ScrollView
        style={estilos.panel}
        contentContainerStyle={estilos.contenidoPanel}
        keyboardShouldPersistTaps="handled">
        {aviso !== null ? (
          <View style={estilos.aviso}>
            <CajaMensaje tono="aviso" mensaje={aviso} />
            <Boton titulo="Seguir escaneando" variante="secundario" onPress={seguirEscaneando} />
          </View>
        ) : null}
        <FormularioIsbn onBuscar={abrirLibro} />
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  panel: {
    flexGrow: 0,
  },
  contenidoPanel: {
    padding: espaciado.l,
    gap: espaciado.m,
  },
  aviso: {
    gap: espaciado.s,
  },
});
