import { Platform } from 'react-native';

import { Boton } from '@/components/Boton';
import { EstadoCargando } from '@/components/EstadoCargando';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
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
    return (
      <Pantalla>
        <EstadoCargando />
      </Pantalla>
    );
  }

  if (estado === 'bloqueado') {
    return (
      <Pantalla>
        <Texto variante="titulo">{textos.titulo}</Texto>
        <Texto>El sistema ya no muestra el pedido de permiso. Activalo desde Ajustes.</Texto>
        <Texto variante="pequeno">{rutaAjustes}</Texto>
        <Boton titulo="Abrir Ajustes" onPress={abrirAjustes} />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Texto variante="titulo">{textos.titulo}</Texto>
      <Texto>{textos.beneficio}</Texto>
      {estado === 'concedido' ? (
        <Texto variante="exito">Este permiso ya está concedido.</Texto>
      ) : null}
      <Boton titulo="Continuar" onPress={continuar} />
    </Pantalla>
  );
}
