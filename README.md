# Biblioteca IPF

## Versión del SDK

Expo SDK 58 (expo 58.0.26).

## Cómo ejecutar el proyecto

```
npm install
npx expo start
```

Después se escanea el código QR con Expo Go.

## Árbol de carpetas de src/app

```
src/app
├── _layout.tsx                  Layout raíz. Stack raíz (se declara en src/components/NavegacionRaiz.tsx)
├── (tabs)
│   ├── _layout.tsx              Tabs (expo-router/js-tabs)
│   ├── (catalogo)
│   │   ├── _layout.tsx          Stack de la tab Catálogo
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

- expo-router: activa el enrutamiento por archivos y el esquema de links.
- expo-splash-screen: define el color y la imagen de la pantalla de inicio.
- expo-camera, cameraPermission: es el texto que ve la persona en el diálogo de la cámara en iOS. Sigue el molde "Usamos tu [dato] para [beneficio concreto]".
- expo-camera, microphonePermission en false: la app no graba audio, así que no se declara el permiso de micrófono en iOS.
- expo-camera, recordAudioAndroid en false: evita que el plugin agregue RECORD_AUDIO en Android.
- expo-notifications: agrega los permisos de notificaciones locales.

## Tabla de permisos

| Recurso | Módulo | Cuándo se pide | Alternativa si se niega |
| --- | --- | --- | --- |
| Cámara | expo-camera | Al abrir /escanear. Antes se muestra /permisos/camara | Escribir el ISBN a mano |
| Notificaciones | expo-notifications | Al activar "Recordarme" en un préstamo. Antes se muestra /permisos/notificaciones | Los avisos aparecen dentro de la app, en /reservas |

## Justificación de blockedPermissions

El bloque `android.blockedPermissions` de app.json quita permisos que la app no usa:

- android.permission.RECORD_AUDIO: la app solo lee códigos de barras y no graba audio. expo-camera lo puede agregar si no se bloquea.
- android.permission.SYSTEM_ALERT_WINDOW: permite dibujar sobre otras apps. La app no lo usa.
- android.permission.READ_EXTERNAL_STORAGE y android.permission.WRITE_EXTERNAL_STORAGE: la app no lee ni escribe archivos del teléfono.

## Deep links de prueba

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

## Salida de lint y tsc

```
npx expo lint
(sin salida, código de salida 0)

npx tsc --noEmit
(sin salida, código de salida 0)
```
