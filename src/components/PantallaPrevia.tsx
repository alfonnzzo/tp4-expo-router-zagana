import { Platform, StyleSheet, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { EstadoCargando } from '@/components/EstadoCargando';
import { Texto } from '@/components/Texto';
import { colores, espaciado } from '@/constants/tema';
import { usePermiso } from '@/hooks/usePermiso';
import { TEXTOS } from '@/lib/permisos';
import type { Recurso } from '@/types';

type PantallaPreviaProps = {
  recurso: Recurso;
  onContinuar: () => void;
};

export function PantallaPrevia({ recurso, onContinuar }: PantallaPreviaProps) {
  const { estado, pedir, abrirAjustes } = usePermiso(recurso);
  const textos = TEXTOS[recurso];
  const rutaAjustes = Platform.OS === 'ios' ? textos.rutaAjustesIos : textos.rutaAjustesAndroid;

  async function continuar() {
    if (estado === 'preguntable') {
      await pedir();
    }
    onContinuar();
  }

  if (estado === 'cargando') {
    return <EstadoCargando />;
  }

  if (estado === 'bloqueado') {
    return (
      <View style={estilos.contenedor}>
        <Texto variante="titulo">{textos.titulo}</Texto>
        <Texto>El sistema ya no muestra el pedido de permiso. Activalo desde Ajustes.</Texto>
        <Texto variante="pequeno">{rutaAjustes}</Texto>
        <Boton titulo="Abrir Ajustes" onPress={abrirAjustes} />
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Texto variante="titulo">{textos.titulo}</Texto>
      <Texto>{textos.beneficio}</Texto>
      {estado === 'concedido' ? (
        <Texto variante="exito">Este permiso ya está concedido.</Texto>
      ) : null}
      <Boton titulo="Continuar" onPress={continuar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    padding: espaciado.xl,
    gap: espaciado.l,
  },
});
