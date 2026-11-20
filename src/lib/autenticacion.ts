import { CLAVE_PERSONAL, USUARIO_PERSONAL } from '@/constants/biblioteca';

export function credencialesValidas(usuario: string, clave: string): boolean {
  return usuario.trim() === USUARIO_PERSONAL && clave === CLAVE_PERSONAL;
}
