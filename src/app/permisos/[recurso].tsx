import { router, useLocalSearchParams } from 'expo-router';

import { Boton } from '@/components/Boton';
import { CajaMensaje } from '@/components/CajaMensaje';
import { Pantalla } from '@/components/Pantalla';
import { PantallaPrevia } from '@/components/PantallaPrevia';
import { esRecurso } from '@/lib/permisos';
import { leerParametro } from '@/lib/parametros';

function cerrar() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

export default function PermisoPrevio() {
  const parametros = useLocalSearchParams<{ recurso: string }>();
  const recurso = leerParametro(parametros.recurso);

  if (!esRecurso(recurso)) {
    return (
      <Pantalla>
        <CajaMensaje tono="aviso" mensaje="Ese permiso no existe. Los permisos son cámara y notificaciones." />
        <Boton titulo="Cerrar" variante="secundario" onPress={cerrar} />
      </Pantalla>
    );
  }

  return <PantallaPrevia recurso={recurso} onContinuar={cerrar} />;
}
