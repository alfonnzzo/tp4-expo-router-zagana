# Biblioteca IPF

Trabajo Práctico N° 4 de Taller Complementario React Native II. Instituto Politécnico Formosa.

Alumno: Alfonso Zagaña Torancio.

La app permite consultar el catálogo, reservar libros y recibir un recordatorio de devolución. El personal entrega los libros respetando el orden de las reservas.

Las respuestas de las Partes B a E están en [RESPUESTAS.md](./RESPUESTAS.md).

## Versión del SDK

El proyecto usa Expo SDK 58 (expo 58.0.26) con React Native 0.88.1 y Expo Router 58.0.32.

Se creó con `npx create-expo-app@latest` y TypeScript.

Los paquetes se instalaron con `npx expo install`. Los únicos módulos nativos son expo-camera y expo-notifications.

## Cómo ejecutar el proyecto

```
npm install
npx expo start
```

Después se escanea el código QR con Expo Go en un teléfono. También se puede presionar "w" para abrir la versión web.

Las notificaciones y la cámara se prueban en el teléfono. Los textos de propósito y el canal de Android solo se ven completos en una development build.

Para entrar al mostrador se usa el usuario `personal` y la clave `ipf2026`. Están escritos en `src/constants/biblioteca.ts`.

En `src/constants/biblioteca.ts` también está `MODO_DEMOSTRACION`. Con valor `true` el recordatorio llega a los 15 segundos. Con valor `false` llega un día antes de la fecha de devolución.

El catálogo falla a propósito 1 de cada 5 veces. El botón "Reintentar" vuelve a pedirlo.

## Libros para probar el escáner

Dos libros tienen ISBN real:

- 9780307474728, Cien años de soledad.
- 9780451524935, 1984.

Los otros catorce ISBN son inventados, con dígito verificador válido. Se pueden escribir a mano en la pantalla de escaneo.

## Árbol de carpetas de src/app

```
src/app
├── _layout.tsx                  Layout raíz. Providers, anchor en (tabs) y el Stack raíz
├── (tabs)
│   ├── _layout.tsx              Tabs (expo-router/js-tabs)
│   ├── (catalogo)
│   │   ├── _layout.tsx          Stack propio de la tab Catálogo
│   │   ├── index.tsx            /
│   │   └── libro
│   │       └── [isbn].tsx       /libro/[isbn]
│   └── reservas.tsx             /reservas
├── buscar.tsx                   /buscar?q=
├── escanear.tsx                 /escanear
├── reservar
│   └── [isbn].tsx               /reservar/[isbn] (modal)
├── permisos
│   └── [recurso].tsx            /permisos/[recurso] (modal)
├── login.tsx                    /login (modal, solo sin sesión)
├── mostrador.tsx                /mostrador (solo con sesión)
├── reserva.tsx                  /reserva (Redirect a /reservas)
└── +not-found.tsx               Pantalla 404
```

El Stack raíz se declara en `src/components/NavegacionRaiz.tsx` y lo usa `src/app/_layout.tsx`. Ahí están `Stack.Protected` para `/login` y `/mostrador`, y los modales.

Resumen de navegadores:

| Ruta | Navegador |
| --- | --- |
| / | Tab "Catálogo", con Stack propio |
| /libro/[isbn] | Stack de la tab Catálogo |
| /reservas | Tab "Mis reservas" |
| /buscar, /escanear | Stack raíz |
| /reservar/[isbn], /permisos/[recurso] | Stack raíz, presentation modal |
| /login | Stack raíz, modal, solo sin sesión |
| /mostrador | Stack raíz, solo con sesión |

## Estructura del código

```
src
├── app            Solo rutas
├── components     Un componente por archivo
├── constants      tema.ts y biblioteca.ts
├── context        CatalogoContext y BibliotecaContext
├── data           libros.ts
├── estructuras    Pila.ts y Cola.ts
├── hooks          useLibros, useBusqueda y usePermiso
├── lib            api, permisos, notificaciones, reservas y utilidades
└── types          Tipos compartidos
```

## Qué se reutilizó de cada TP

- TP 1: criterios de revisión de código. Todas las listas usan `key` estable, los efectos tienen limpieza y dependencias completas, las listas largas usan FlatList, los componentes están a nivel de módulo y los estilos usan `StyleSheet.create`.
- TP 2: clases `Pila` y `Cola` (`src/estructuras`), Stack protegido con login (`Stack.Protected`), tabs, modales, `Redirect`, pantalla 404, deep links y `useLocalSearchParams` con `router.setParams`.
- TP 3: hook `usePermiso`, permisos de cámara y notificaciones, pantalla previa de permisos, canal de notificaciones de Android y configuración de `app.json` con privilegio mínimo.

## Bloque plugins de app.json

```json
"plugins": [
  "expo-router",
  [
    "expo-splash-screen",
    {
      "backgroundColor": "#208AEF",
      "image": "./assets/images/splash-icon.png",
      "imageWidth": 76
    }
  ],
  [
    "expo-camera",
    {
      "cameraPermission": "Usamos tu cámara para leer el código de barras de la contratapa y abrir el libro en el catálogo.",
      "microphonePermission": false,
      "recordAudioAndroid": false
    }
  ],
  "expo-notifications"
]
```

Explicación de cada entrada:

- expo-router: activa el enrutamiento por archivos y el esquema de links.
- expo-splash-screen: define el color y la imagen de la pantalla de inicio.
- expo-camera, cameraPermission: es el texto que ve la persona en el diálogo de la cámara en iOS. Sigue el molde "Usamos tu [dato] para [beneficio concreto]".
- expo-camera, microphonePermission en false: la app no graba audio, así que no se declara el permiso de micrófono en iOS.
- expo-camera, recordAudioAndroid en false: evita que el plugin agregue RECORD_AUDIO en Android.
- expo-notifications: agrega los permisos de notificaciones locales. No tiene texto de propósito porque iOS no lo pide para notificaciones.

El resto de app.json define el esquema `bibliotecaipf`, rutas tipadas (`typedRoutes`) y los identificadores `ar.edu.ipf.biblioteca`.

## Tabla de permisos

| Recurso | Módulo | Cuándo se pide | Alternativa si se niega |
| --- | --- | --- | --- |
| Cámara | expo-camera | Al abrir /escanear. Antes se muestra /permisos/camara | Escribir el ISBN a mano |
| Notificaciones | expo-notifications | Al activar "Recordarme" en un préstamo. Antes se muestra /permisos/notificaciones | Los avisos aparecen dentro de la app, en /reservas |

La app no pide ningún otro permiso.

## Justificación de blockedPermissions

El bloque `android.blockedPermissions` de app.json quita permisos que la app no necesita:

- android.permission.RECORD_AUDIO: la app solo lee códigos de barras y no graba audio. expo-camera lo puede agregar si no se bloquea.
- android.permission.SYSTEM_ALERT_WINDOW: permite dibujar sobre otras apps. La app no lo usa.
- android.permission.READ_EXTERNAL_STORAGE y android.permission.WRITE_EXTERNAL_STORAGE: la app no lee ni escribe archivos del teléfono.

No se corrió `expo prebuild`, así que el manifiesto final de Android no se revisó. Conviene hacerlo antes de publicar la app.

## Deep links de prueba

En un teléfono con una development build se usa el esquema `bibliotecaipf://`. En Expo Go se usa `exp://IP:8081/--/` y la misma ruta, donde IP es la dirección de la computadora que muestra `npx expo start`.

| Link | Resultado esperado |
| --- | --- |
| bibliotecaipf://libro/9780307474728 | Detalle de Cien años de soledad |
| bibliotecaipf://libro/123 | Detalle con el mensaje de ISBN inválido y el link al Catálogo |
| bibliotecaipf://buscar?q=borges | Buscador con los libros de Borges y las pestañas debajo |
| bibliotecaipf://escanear | Escáner. Muestra el estado del permiso de la cámara |
| bibliotecaipf://permisos/camara | Pantalla previa del permiso de cámara |
| bibliotecaipf://mostrador | Sin sesión lleva al Catálogo. Con sesión abre el mostrador |
| bibliotecaipf://reserva | Redirige a /reservas |
| bibliotecaipf://cualquiera | Pantalla 404 con la URL inexistente |

Estos resultados se comprobaron en la versión web. En el teléfono y en Expo Go quedan por comprobar.

## Resultados de lint y tsc

```
npx tsc --noEmit
(sin salida, código de salida 0)

npx expo lint
(sin salida, código de salida 0)
```

`npx expo-doctor` también pasó las 20 revisiones.

## Capturas

Las capturas se sacaron en un iPhone con Expo Go y están en la carpeta `capturas`.

- 01-catalogo-con-datos.png: Catálogo con la lista cargada.
- 02-buscador.png: búsqueda de "Borges" con dos resultados.
- 03-detalle-libro-con-ejemplares.png: detalle de un libro con ejemplares disponibles.
- 04-mis-reservas-con-prestamo.png: Mis reservas con un préstamo activo.
- 05-escaner-concedido-isbn-invalido.png: escáner con la cámara activa y aviso de ISBN inválido.
- 06-reservar-con-ejemplares.png: confirmación de una reserva con ejemplares.
- 07-reservar-sin-ejemplares.png: confirmación de una reserva en lista de espera.
- 08-permiso-notificaciones-bloqueado.png: pantalla previa con las notificaciones bloqueadas.
- 09-mostrador-entrega-al-siguiente.png: mostrador después de entregar un libro.
- 10-escaner-camara-bloqueada.png: escáner con la cámara bloqueada y opción de abrir Ajustes.

## Desafíos opcionales

No se hicieron los desafíos opcionales: persistencia, pruebas, debounce, modo oscuro y development build.
