export function leerParametro(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) {
    return valor[0] ?? '';
  }
  return valor ?? '';
}
