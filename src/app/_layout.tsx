import { NavegacionRaiz } from '@/components/NavegacionRaiz';
import { ProveedorBiblioteca } from '@/context/BibliotecaContext';
import { ProveedorCatalogo } from '@/context/CatalogoContext';
import { configurarNotificaciones } from '@/lib/notificaciones';

configurarNotificaciones();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function LayoutRaiz() {
  return (
    <ProveedorCatalogo>
      <ProveedorBiblioteca>
        <NavegacionRaiz />
      </ProveedorBiblioteca>
    </ProveedorCatalogo>
  );
}
