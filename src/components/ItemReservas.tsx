import { CajaMensaje } from '@/components/CajaMensaje';
import { EstadoVacio } from '@/components/EstadoVacio';
import { FilaPrestamo } from '@/components/FilaPrestamo';
import { FilaReservaEspera } from '@/components/FilaReservaEspera';
import { TituloSeccion } from '@/components/TituloSeccion';
import type { ItemReservas as TipoItemReservas } from '@/types';

type ItemReservasProps = {
  item: TipoItemReservas;
  onCambiarRecordatorio: (isbn: string, activar: boolean) => void;
  onDevolver: (isbn: string) => void;
};

export function ItemReservas({ item, onCambiarRecordatorio, onDevolver }: ItemReservasProps) {
  if (item.tipo === 'titulo') {
    return <TituloSeccion texto={item.texto} />;
  }
  if (item.tipo === 'vacio') {
    return <EstadoVacio mensaje={item.mensaje} />;
  }
  if (item.tipo === 'prestamo') {
    return (
      <FilaPrestamo
        prestamo={item.prestamo}
        onCambiarRecordatorio={onCambiarRecordatorio}
        onDevolver={onDevolver}
      />
    );
  }
  if (item.tipo === 'espera') {
    return <FilaReservaEspera reserva={item.reserva} />;
  }
  return <CajaMensaje tono="aviso" mensaje={item.aviso.mensaje} />;
}
