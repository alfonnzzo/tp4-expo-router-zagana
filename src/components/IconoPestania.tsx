import Ionicons from '@expo/vector-icons/Ionicons';

import { colores, tamanios } from '@/constants/tema';

type IconoPestaniaProps = {
  nombre: 'library' | 'bookmarks';
  activo: boolean;
};

export function IconoPestania({ nombre, activo }: IconoPestaniaProps) {
  return (
    <Ionicons
      name={nombre}
      size={tamanios.icono}
      color={activo ? colores.primario : colores.textoSuave}
    />
  );
}
