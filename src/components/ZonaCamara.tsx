import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { Platform, StyleSheet, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { CajaMensaje } from '@/components/CajaMensaje';
import { EstadoCargando } from '@/components/EstadoCargando';
import { Texto } from '@/components/Texto';
import { colores, espaciado } from '@/constants/tema';
import { TEXTOS } from '@/lib/permisos';
import type { EstadoPermiso } from '@/types';

type ZonaCamaraProps = {
  estado: EstadoPermiso;
  falloCamara: boolean;
  onLeer: (resultado: BarcodeScanningResult) => void;
  onFalloMontaje: () => void;
  onReintentarCamara: () => void;
  onPedirPermiso: () => void;
  onAbrirAjustes: () => void;
};

export function ZonaCamara({
  estado,
  falloCamara,
  onLeer,
  onFalloMontaje,
  onReintentarCamara,
  onPedirPermiso,
  onAbrirAjustes,
}: ZonaCamaraProps) {
  const rutaAjustes =
    Platform.OS === 'ios' ? TEXTOS.camara.rutaAjustesIos : TEXTOS.camara.rutaAjustesAndroid;

  if (estado === 'cargando') {
    return <EstadoCargando mensaje="Revisando el permiso de la cámara..." />;
  }

  if (estado === 'concedido' && !falloCamara) {
    return (
      <View style={estilos.camara}>
        <CameraView
          style={estilos.vista}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
          onBarcodeScanned={onLeer}
          onMountError={onFalloMontaje}
        />
        <Texto style={estilos.ayuda}>Apuntá al código de barras de la contratapa.</Texto>
      </View>
    );
  }

  if (estado === 'concedido') {
    return (
      <View style={estilos.mensaje}>
        <CajaMensaje
          tono="aviso"
          mensaje="No pudimos abrir la cámara. Puede estar en uso por otra app. Cerrala e intentá de nuevo, o escribí el ISBN."
        />
        <Boton titulo="Intentar de nuevo" variante="secundario" onPress={onReintentarCamara} />
      </View>
    );
  }

  if (estado === 'bloqueado') {
    return (
      <View style={estilos.mensaje}>
        <CajaMensaje
          tono="aviso"
          mensaje={'La cámara está bloqueada. Activala en Ajustes o escribí el ISBN. ' + rutaAjustes}
        />
        <Boton titulo="Abrir Ajustes" onPress={onAbrirAjustes} />
      </View>
    );
  }

  return (
    <View style={estilos.mensaje}>
      <CajaMensaje
        tono="info"
        mensaje="Todavía no diste permiso a la cámara. Podés darlo ahora o escribir el ISBN."
      />
      <Boton titulo="Permitir la cámara" onPress={onPedirPermiso} />
    </View>
  );
}

const estilos = StyleSheet.create({
  camara: {
    flex: 1,
    backgroundColor: colores.camara,
  },
  vista: {
    flex: 1,
  },
  ayuda: {
    color: colores.textoCamara,
    textAlign: 'center',
    padding: espaciado.m,
  },
  mensaje: {
    padding: espaciado.l,
    gap: espaciado.s,
  },
});
