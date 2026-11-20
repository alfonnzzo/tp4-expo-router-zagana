import { usePathname } from 'expo-router';

import { CajaMensaje } from '@/components/CajaMensaje';
import { EnlaceCatalogo } from '@/components/EnlaceCatalogo';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';

export default function NoEncontrada() {
  const direccion = usePathname();

  return (
    <Pantalla>
      <Texto variante="titulo">Error 404</Texto>
      <CajaMensaje tono="aviso" mensaje={'La dirección ' + direccion + ' no existe en la Biblioteca IPF.'} />
      <EnlaceCatalogo />
    </Pantalla>
  );
}
