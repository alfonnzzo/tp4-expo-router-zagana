import { router } from 'expo-router';

export function cerrarPantalla() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
