import { router } from 'expo-router';
import { useState } from 'react';

import { Boton } from '@/components/Boton';
import { CajaMensaje } from '@/components/CajaMensaje';
import { CampoTexto } from '@/components/CampoTexto';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { credencialesValidas } from '@/lib/autenticacion';

export default function Login() {
  const { iniciarSesion } = useBiblioteca();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);

  function ingresar() {
    if (!credencialesValidas(usuario, clave)) {
      setError('El usuario o la clave no son correctos.');
      return;
    }
    setError(null);
    router.dismiss();
    iniciarSesion();
  }

  return (
    <Pantalla>
      <Texto>Ingreso exclusivo para el personal de la biblioteca.</Texto>
      <CampoTexto etiqueta="Usuario" valor={usuario} onCambiar={setUsuario} />
      <CampoTexto etiqueta="Clave" valor={clave} onCambiar={setClave} oculto />
      {error !== null ? <CajaMensaje tono="peligro" mensaje={error} /> : null}
      <Boton titulo="Ingresar" onPress={ingresar} />
    </Pantalla>
  );
}
