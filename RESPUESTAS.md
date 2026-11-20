# Respuestas del TP4 Biblioteca IPF

## Parte B

### B1. El ciclo de vida de useLibros

a) Render por render

`useLibros()` no corre dentro del Catálogo. Lo ejecuta `ProveedorCatalogo` en el layout raíz (src/context/CatalogoContext.tsx:16 y src/app/_layout.tsx:14). El Catálogo solo lee el resultado con `useCatalogo()` (src/app/(tabs)/(catalogo)/index.tsx:13).

`cargando`, `libros` y `error` no son estados. Se calculan en cada render a partir de `intento` y `respuesta` (src/hooks/useLibros.ts:40-42):

```ts
const cargando = respuesta === null || respuesta.intento !== intento;
const libros = cargando || respuesta.huboError ? [] : respuesta.libros;
const error = !cargando && respuesta.huboError ? MENSAJE_ERROR : null;
```

Camino sin error (80 % de las veces, src/lib/api.ts:9):

| Render | Qué lo provoca | intento | respuesta | cargando | libros | error |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Montaje de la app | 0 | null | true | [] | null |
| 2 | `setRespuesta` cuando `obtenerLibros()` resuelve, a los 800 ms (src/lib/api.ts:8, src/hooks/useLibros.ts:23) | 0 | intento 0, 16 libros, huboError false | false | los 16 libros | null |

El efecto (src/hooks/useLibros.ts:18-34) corre después del render 1 y no vuelve a correr, porque `intento` sigue valiendo 0. No hay un render extra para poner `cargando` en true, porque el efecto no llama a ningún setState antes de la respuesta.

Camino con error y reintento:

| Render | Qué lo provoca | intento | respuesta | cargando | libros | error |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Montaje de la app | 0 | null | true | [] | null |
| 2 | `setRespuesta` desde el `catch` (src/hooks/useLibros.ts:28) | 0 | intento 0, libros vacíos, huboError true | false | [] | "No pudimos cargar el catálogo..." |
| 3 | La persona toca "Reintentar" y se ejecuta `setIntento` (src/hooks/useLibros.ts:37) | 1 | la misma de antes, con intento 0 | true | [] | null |
| 4a | `obtenerLibros()` resuelve en el segundo intento | 1 | intento 1, 16 libros, huboError false | false | los 16 libros | null |
| 4b | `obtenerLibros()` vuelve a fallar | 1 | intento 1, libros vacíos, huboError true | false | [] | "No pudimos cargar el catálogo..." |

En el render 3, `respuesta.intento` vale 0 e `intento` vale 1. Por eso `cargando` vuelve a ser true sin un `setCargando(true)`.

b) Desmontaje del Catálogo y limpieza

No se desmonta en ninguna de las dos situaciones.

- Al cambiar a "Mis reservas": las pestañas vienen de `expo-router/js-tabs` (src/app/(tabs)/_layout.tsx:1). La pantalla inactiva queda montada y solo se oculta.
- Al abrir un detalle: `FilaLibro` hace `router.push` dentro del Stack de la pestaña (src/components/FilaLibro.tsx:14). El `index` queda debajo del detalle y sigue montado.

La limpieza no está en el Catálogo. Está en el efecto de `useLibros` (src/hooks/useLibros.ts:31-33), que vive en el proveedor del layout raíz. Ese proveedor no se desmonta mientras la app está abierta.

La limpieza se ejecuta en dos situaciones reales:

- Cuando cambia `intento` (al tocar "Reintentar"), justo antes de que corra el efecto nuevo. El pedido anterior ya había terminado, porque el botón solo aparece con `cargando` en false. Entonces no descarta nada.
- Cuando el proveedor se desmonta, al cerrar la app o al recargar el layout raíz en desarrollo. Si el pedido seguía en curso, evita llamar a `setRespuesta` sobre un componente que ya no existe.

c) Por qué el efecto no puede ser async

`useEffect` espera que la función devuelva nada o una función de limpieza. Una función `async` siempre devuelve una promesa. React recibiría esa promesa como si fuera la limpieza, y la limpieza real nunca se ejecutaría.

Lo resolví con un efecto normal que usa `.then` y `.catch`. El efecto devuelve la limpieza directamente (src/hooks/useLibros.ts:18-34):

```ts
useEffect(() => {
  let vigente = true;
  obtenerLibros()
    .then((libros) => {
      if (vigente) {
        setRespuesta({ intento, libros, huboError: false });
      }
    })
    .catch(() => {
      if (vigente) {
        setRespuesta({ intento, libros: [], huboError: true });
      }
    });
  return () => {
    vigente = false;
  };
}, [intento]);
```

d) Cómo funciona reintentar

`reintentar` suma 1 al estado `intento` (src/hooks/useLibros.ts:36-38):

```ts
function reintentar() {
  setIntento((actual) => actual + 1);
}
```

`intento` está en el array de dependencias del efecto (src/hooks/useLibros.ts:34). Cuando cambia, React ejecuta la limpieza anterior y vuelve a ejecutar el efecto, que llama otra vez a `obtenerLibros()`.

Usé `intento` por estas razones:

- `obtenerLibros()` no recibe parámetros. El único motivo para repetir el pedido es que la persona pidió otro intento.
- Es un contador y no un booleano. Cambia en cada toque, aunque el intento anterior también haya fallado.
- Cada respuesta guarda el `intento` que la pidió. Con eso `cargando` se calcula como `respuesta.intento !== intento` (línea 40).
- `libros`, `error` y `cargando` no pueden ser dependencias. Son el resultado del efecto, y el efecto se repetiría sin parar.

### B2. La condición de carrera del buscador

El escenario es el del enunciado. En t = 0 ms escribe "bor" y se pide `buscarLibros("bor")`, que tarda 1.400 ms. En t = 200 ms escribe "borges" y se pide `buscarLibros("borges")`, que tarda 300 ms.

Mi código es src/hooks/useBusqueda.ts:20-39. La columna "sin limpieza" es el mismo efecto sin `vigente`:

```ts
useEffect(() => {
  buscarLibros(consulta).then((datos) => {
    setResultados(datos);
  });
}, [consulta]);
```

| Momento | Qué pasa | Sin limpieza: qué se ve | Con tu código: qué se ve |
| --- | --- | --- | --- |
| t = 0 ms | Escribe "bor". Se pide `buscarLibros("bor")`, que tarda 1.400 ms. | La lista vacía. Todavía no hay respuesta. | "Buscando...". `consulta` vale "bor" y `respuesta` es null, entonces `cargando` es true (src/hooks/useBusqueda.ts:45-47). |
| t = 200 ms | Escribe "borges". Se pide `buscarLibros("borges")`, que tarda 300 ms. | La lista vacía. Hay dos pedidos en vuelo. | "Buscando...". Antes del efecto nuevo, React ejecuta la limpieza del anterior y pone en false el `vigente` del pedido de "bor". |
| t = 500 ms | Llega la respuesta de "borges". | La lista de "borges": El Aleph y Ficciones. | La lista de "borges": El Aleph y Ficciones. Su `vigente` es true, entonces se guarda con `setRespuesta`. |
| t = 1.400 ms | Llega la respuesta de "bor". | `setResultados` pisa la lista de "borges" con la de "bor". El campo dice "borges" y la lista es la de otra búsqueda. | No cambia nada. El `vigente` de este pedido es false (línea 27), no se llama a `setRespuesta` y no hay render. Sigue la lista de "borges". |

Con los datos de esta app, "bor" y "borges" devuelven los mismos dos libros (src/data/libros.ts:7-8), y el error de la columna del medio no se nota con esas palabras. Se nota con "sab" (tres libros) y "sabato" (dos).

a) Qué hace la limpieza y cuándo se ejecuta

La limpieza es `return () => { vigente = false; }` (src/hooks/useBusqueda.ts:36-38). Cada ejecución del efecto crea una variable `vigente` propia. El `.then` de ese pedido solo ve su variable. Cuando la limpieza la pone en false, ese `.then` descarta la respuesta cuando llegue.

Se ejecuta en dos momentos:

- Justo antes de que corra el efecto siguiente, cuando cambia `consulta` o `intento` (array de dependencias, línea 39).
- Cuando la pantalla /buscar se desmonta.

La limpieza no cancela el pedido. `buscarLibros` sigue esperando y resuelve igual. Solo se ignora el resultado.

b) La propuesta de comparar `texto === q`

No funciona. La función del `.then` es una clausura: recuerda las variables del render en que se creó el efecto. En el pedido de "bor", el `q` que ve esa función es "bor", aunque la persona ya haya escrito "borges". Cuando llega la respuesta, la comparación es `"bor" === "bor"`. Da true siempre y la respuesta vieja se guarda.

Mi solución usa la clausura a favor. `vigente` es una variable que el `.then` comparte con la limpieza de ese mismo efecto. Cuando la limpieza la modifica, el `.then` ve el cambio.

c) La URL, el botón atrás y `router.push`

Cada letra llama a `router.setParams({ q: nuevo })` (src/app/buscar.tsx:39). Eso cambia los parámetros de la pantalla actual y no apila otra pantalla. La URL muestra el texto, por ejemplo /buscar?q=borges, y el campo lee su valor de la URL (buscar.tsx:15 y 38). Un toque en atrás sale de /buscar, sin importar cuántas letras se escribieron.

Con `router.push` pasaría esto:

- Cada letra apilaría otra copia de /buscar. Escribir "borges" dejaría seis pantallas en la pila.
- El botón atrás borraría una letra por toque en lugar de salir de la búsqueda.

### B3. Mutar o reemplazar

a) Qué muestra el texto

Muestra "Personas en espera: 0" después de los tres toques. `espera.encolar('Ana')` modifica el array interno de la misma instancia. `useState` sigue guardando esa instancia, con la misma referencia. `anotarme` nunca llama a un `setState`, entonces React no vuelve a renderizar y el texto no se recalcula. La cola tiene tres personas, pero la pantalla muestra el valor del último render.

b) Por qué el número salta a 3

Cada letra escrita en el `TextInput` controlado llama al `setState` del texto. Ese `setState` provoca un render. En ese render se vuelve a evaluar `espera.tamanio`, que ahora lee 3. El número se actualiza por un render que no tiene relación con la cola.

Un error que aparece "a veces" es peor que uno que aparece siempre por estas razones:

- Un error constante se ve en la primera prueba y se corrige. Uno intermitente puede pasar las pruebas si por casualidad hubo otro render.
- La causa (falta un `setState`) y el síntoma (el número cambia al escribir en otro campo) están lejos uno del otro.

c) Cómo lo resolví en el Context y alternativas

Mi solución está en src/context/BibliotecaContext.tsx. Tengo dos cosas separadas:

- La instancia mutable, para operar. Las colas están en un `Map` dentro de un `useState` con inicializador (línea 66). La pila de vistos está en otro (línea 67).
- Una copia en estado normal, para que React vea el cambio. `esperas` tiene un array por ISBN (línea 76) y `recientes` es un array (línea 74).

Después de cada mutación copio la instancia a un array nuevo. `aArray()` siempre devuelve un array nuevo (src/estructuras/Cola.ts:37-39 y src/estructuras/Pila.ts:27-29). Ese array nuevo cambia la referencia y provoca el render. En `reservar` (líneas 127-129):

```ts
cola.encolar({ id: 'propia-' + libro.isbn, nombre: NOMBRE_PROPIO, esMia: true });
colas.set(libro.isbn, cola);
setEsperas(copiarEsperas(colas));
```

Lo mismo pasa en `entregarSiguiente` (línea 200) y en `registrarVisto` (líneas 96-97). La mutación está en la función del evento y no dentro de la función de actualización de `setState`, porque esa función debe ser pura y React puede ejecutarla más de una vez.

| Alternativa | Ventaja | Costo |
| --- | --- | --- |
| Mi solución: instancia más copia en array | Conservo la clase `Cola` con `#items` privado. Las pantallas reciben arrays nuevos, que funcionan con `useMemo` y componentes memorizados. | El mismo dato vive en dos lugares. Si me olvido de llamar a `setEsperas(copiarEsperas(colas))` después de mutar, vuelve el error de B3. |
| Crear una cola nueva a partir de la anterior | El estado es la cola y no hay un segundo dato. | `Cola` no tiene un constructor desde un array y habría que agregarlo. Cada `encolar` copiaría toda la cola. |
| Contador de versión | Es lo más corto: `espera.encolar('Ana'); setVersion((v) => v + 1)`. No copia nada. | La referencia de la cola nunca cambia. Un `useMemo` o un componente memorizado que dependa de la cola no se entera. Si me olvido de sumar al contador, falla igual que en B3. |
| `useReducer` | La lógica queda en un lugar, con acciones con nombre. | El reducer debe ser puro y no puede mutar una instancia de `Cola`. Tendría que copiar la cola en cada acción, como la alternativa anterior pero con más código. |

### B4. ¿Dónde vive cada dato?

| Dato | Dónde vive en tu app | Por qué ahí y no en otro lugar |
| --- | --- | --- |
| Texto del buscador | URL, parámetro `q` (src/app/buscar.tsx:14-15 y 39) | Permite abrir `bibliotecaipf://buscar?q=borges`. Hay una sola fuente, porque el campo lee `texto` de la URL (línea 38). Con `useState` habría dos copias que podrían diferir. No va al Context porque solo lo usa esta pantalla. |
| Préstamos y reservas | Context. Los préstamos son el estado `prestamos` (src/context/BibliotecaContext.tsx:75). Las reservas en espera se calculan con `obtenerReservasEnEspera` (src/lib/reservas.ts:21-38 y src/app/(tabs)/reservas.tsx:60). | Los leen el detalle, la confirmación y "Mis reservas", que están en navegadores distintos. Un estado local se perdería al cerrar un modal. No va a la URL porque no es algo que se comparta. |
| Listas de espera | Context. `Map` de instancias de `Cola` (línea 66) más la copia `esperas` (línea 76). | Las usan el detalle, la confirmación, "Mis reservas" y el mostrador. La `Cola` mantiene el orden de llegada y la copia es lo que ven las pantallas. |
| Vistos recientemente | Context. `Pila` (línea 67) más la copia `recientes` (línea 74). | El detalle escribe con `registrarVisto` y el Catálogo lee. Son pantallas distintas y el detalle se desmonta al volver, así que el dato tiene que vivir fuera de él. |
| Sesión del personal | Context, `sesionIniciada` (línea 73) | La necesita el layout raíz para `Stack.Protected` (src/components/NavegacionRaiz.tsx:22-27) y el link "Personal" (src/components/EnlacePersonal.tsx:12). Esa decisión no puede depender del estado de una pantalla. |
| Ejemplares disponibles de un libro | Se calcula, con `calcularDisponibles(libro, prestamos)` (src/lib/reservas.ts:8-11) | Es `libro.ejemplares` menos los préstamos de ese ISBN. Si lo guardara, habría dos datos que mantener iguales. Se usa en el detalle (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:75), en la confirmación (src/app/reservar/[isbn].tsx:69) y en `reservar` (línea 116). |
| Estado del permiso de cámara | Sistema operativo. La app guarda solo un reflejo en un almacén de módulo (src/hooks/usePermiso.ts:7-10), leído con `useSyncExternalStore` (líneas 30-34). | La persona puede cambiar el permiso en Ajustes sin que la app se entere, entonces el dato verdadero es el del sistema. El reflejo permite que varias pantallas vean el mismo valor sin pasar por el Context. |
| Identificador de la notificación programada | Context, dentro de cada préstamo, campo `recordatorioId` (src/types/index.ts:23 y src/context/BibliotecaContext.tsx:164-168). La notificación misma vive en el sistema operativo. | Hay un identificador por préstamo. Se necesita en `devolver` y en `desactivarRecordatorio` para cancelar la notificación (líneas 142-144 y 192). |

Cuando cambia el `value` del Context, se vuelven a renderizar todos los componentes que llaman a `useBiblioteca()`, sin importar qué campo usan. Los montados en la app son:

- `NavegacionRaiz` (src/components/NavegacionRaiz.tsx:8).
- `EnlacePersonal`, en el header del Catálogo (src/components/EnlacePersonal.tsx:9).
- El Catálogo (src/app/(tabs)/(catalogo)/index.tsx:14).
- "Mis reservas" (src/app/(tabs)/reservas.tsx:55).
- El detalle, si hay uno en la pila (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:23).

`login`, `mostrador` y la confirmación solo se renderizan mientras están abiertos.

Sí, el Catálogo se vuelve a renderizar al activar un recordatorio en otra pestaña, aunque solo use `recientes`. Las pestañas siguen montadas (B1b), y activar el recordatorio cambia `prestamos`, lo que crea un `value` nuevo.

Para evitarlo se podría:

- Separar el Context en dos, por ejemplo uno para préstamos y esperas y otro para recientes y sesión.
- Usar una biblioteca con selectores, que renderice cada componente solo cuando cambia el campo que lee.

No vale la pena en una app de este tamaño. Hay cinco pantallas, 16 libros y listas cortas. Un render extra del Catálogo cuesta muy poco, y separar el Context agrega archivos y lugares donde equivocarse. Lo haría solo si el Profiler de React DevTools mostrara que el render del Catálogo es lento.

## Parte C

### C1. La pila en la app

La app tiene tres navegadores:

- Stack raíz: src/components/NavegacionRaiz.tsx. Contiene `(tabs)`, `buscar`, `escanear`, `reservar/[isbn]` (modal), `permisos/[recurso]` (modal), `login` (modal) y `mostrador`.
- Pestañas: src/app/(tabs)/_layout.tsx. Contiene "Catálogo" y "Mis reservas".
- Stack de la pestaña Catálogo: src/app/(tabs)/(catalogo)/_layout.tsx. Contiene `index` y `libro/[isbn]`.

Las pilas van de la base al tope.

| # | Acción | Stack raíz | Pestañas | Stack de la pestaña Catálogo |
| --- | --- | --- | --- | --- |
| 1 | Abre la app. | `(tabs)` | Catálogo (activa) | `index` |
| 2 | Toca un libro del Catálogo. | `(tabs)` | Catálogo (activa) | `index`, `libro/[isbn]` |
| 3 | Toca "Reservar". | `(tabs)`, `reservar/[isbn]` (modal) | Catálogo (activa, debajo del modal) | `index`, `libro/[isbn]` |
| 4 | Toca "Confirmar". | `(tabs)` | Mis reservas (activa) | `index`, `libro/[isbn]` |
| 5 | Toca atrás (Android). | `(tabs)` | Catálogo (activa) | `index`, `libro/[isbn]` |
| 6 | Toca la tab "Catálogo". | `(tabs)` | Catálogo (activa) | `index` |

- Paso 2: `FilaLibro` hace `router.push` a `/libro/[isbn]` (src/components/FilaLibro.tsx:14). El destino está dentro del Stack de la pestaña.
- Paso 3: el detalle hace `router.push` a `/reservar/[isbn]` (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:34). Esa ruta es un modal del Stack raíz (NavegacionRaiz.tsx:19). Se apila sobre `(tabs)` y no toca la pila del Catálogo.
- Paso 4: `router.dismissTo('/reservas')` (src/app/reservar/[isbn].tsx:38) saca el modal y deja visible "Mis reservas". La pila del Catálogo no cambia.
- Paso 5: el Stack raíz solo tiene `(tabs)`, así que atrás lo maneja el navegador de pestañas. Su `backBehavior` por defecto es `firstRoute` (node_modules/expo-router/build/react-navigation/routers/TabRouter.js:240) y vuelve a la primera pestaña, el Catálogo. Esa pestaña conserva el detalle en su pila.
- Paso 6: la pestaña "Catálogo" ya está activa. Al tocarla, su Stack vuelve a `index`.

a) Método del paso 4

Usé `router.dismissTo('/reservas')` (src/app/reservar/[isbn].tsx:38).

- `dismissTo`: saca el modal de confirmación y deja `(tabs)` mostrando "Mis reservas". No agrega pantallas y atrás no vuelve a la confirmación.
- `push`: agrega una pantalla nueva sobre el modal. Al tocar atrás la persona volvería a la confirmación de la reserva ya hecha.
- `replace`: cambia el modal por la pantalla nueva dentro del Stack raíz. Quedaría una segunda copia de `(tabs)` en esa pila, con una flecha de volver sin sentido en el Catálogo.

Elegí `dismissTo` porque el destino ya existe dentro de `(tabs)`. El modal es temporal, así que lo correcto es cerrarlo y volver a esa pantalla.

b) Pantalla del paso 6

La persona ve el Catálogo (la lista). Antes del paso 6 ya estaba en la pestaña "Catálogo" (paso 5). Tocar la pestaña activa vuelve al inicio de su pila. Si hubiera venido de "Mis reservas" y tocado "Catálogo", vería el detalle del libro, porque cada pestaña conserva su pila.

Me parece correcto. Cada pestaña recuerda dónde estaba la persona, y volver a tocar la pestaña activa es la forma estándar de volver a la lista.

### C2. El escáner que dispara de más

a) `router.push` sin protección

Cada ejecución de `onBarcodeScanned` llamaría a `router.push`. Con el código frente a la cámara eso ocurre muchas veces por segundo. En el TP 2, cada `push` agrega una acción a la cola de navegación y la cola las procesa todas en orden. No descarta ni une acciones iguales.

Resultado: el detalle del mismo libro quedaría apilado varias veces y la persona tendría que tocar atrás una vez por cada copia. La cola solo garantiza el orden. La protección tiene que estar antes del `push`.

b) `useRef` o `useState`

Usé `useRef` (src/app/escanear.tsx:21-22):

```ts
const yaNavego = useRef(false);
const ultimoCodigo = useRef<string | null>(null);
```

Un `useState` puesto en true en el primer escaneo no alcanza por dos motivos:

- `setState` no cambia la variable en el momento. El valor nuevo recién se ve en el render siguiente.
- La cámara puede llamar a `onBarcodeScanned` varias veces antes de ese render, y cada llamada usa la función del render anterior, que recuerda el valor viejo. Todas leen `false` y todas navegan.

Con `useRef`, `yaNavego.current = true` cambia el valor al instante y las llamadas siguientes lo leen en el momento de ejecutarse. `yaNavego` frena todo después de navegar (líneas 33-35 y 50). `ultimoCodigo` ignora un código igual al anterior (línea 50).

c) `replace` y no `push`

Usé `router.replace({ pathname: '/libro/[isbn]', ... })` (src/app/escanear.tsx:46). El escáner es un paso intermedio. Con `replace` el detalle ocupa su lugar y atrás no vuelve a la cámara.

Con `push`, el escáner quedaría debajo del detalle y seguiría montado. Al tocar atrás la persona vería la cámara otra vez. `yaNavego` seguiría en true, así que la cámara no leería nada y el ISBN a mano tampoco funcionaría, porque también pasa por `abrirLibro`. Sería una pantalla sin salida.

d) ISBN que no está en el catálogo

`abrirLibro` no navega. Llama a `setAviso` con "El libro con ISBN ... no está en el catálogo. Probá con otro código." (src/app/escanear.tsx:40-44). El aviso se muestra con el botón "Seguir escaneando" (líneas 79-84) y la cámara sigue abierta.

El aviso no aparece diez veces por dos motivos:

- `ultimoCodigo` guarda el último código leído y `alLeer` ignora el mismo código mientras siga frente a la cámara (líneas 50-53).
- El aviso es un solo texto en un estado, no una lista. Un código distinto reemplaza el texto anterior.

"Seguir escaneando" borra el aviso y pone `ultimoCodigo` en null (líneas 57-60), así que el mismo código se puede leer otra vez.

### C3. Deep links y rutas protegidas

| Link | Qué ve la persona | Qué queda debajo en la pila | Qué parte de tu código lo decide |
| --- | --- | --- | --- |
| `bibliotecaipf://libro/` más un ISBN existente, por ejemplo 9780307474728 | El detalle de "Cien años de soledad", con los ejemplares disponibles, las personas en espera y el botón "Reservar". | El Catálogo (`index`) dentro del Stack de la pestaña. Atrás lleva al Catálogo. | src/app/(tabs)/(catalogo)/libro/[isbn].tsx, que busca el libro en la línea 25. El `anchor: 'index'` de src/app/(tabs)/(catalogo)/_layout.tsx:7-9 y el `anchor: '(tabs)'` de src/app/_layout.tsx:8-10 ponen el Catálogo debajo. |
| `bibliotecaipf://libro/123` | El detalle con "El ISBN no es válido. Tiene que tener 13 números, sin guiones." y el enlace "Ir al Catálogo". | El Catálogo, por el mismo `anchor`. | `esIsbnValido` (src/lib/isbn.ts:3-5) usado en src/app/(tabs)/(catalogo)/libro/[isbn].tsx:37-47. |
| `bibliotecaipf://buscar?q=borges` | La búsqueda con "borges" en el campo y dos resultados: El Aleph y Ficciones. | Las pestañas, con el Catálogo. Atrás lleva al Catálogo. | `anchor: '(tabs)'` en src/app/_layout.tsx:8-10. El `q` se lee en src/app/buscar.tsx:14-15 y la búsqueda la hace src/hooks/useBusqueda.ts. |
| `bibliotecaipf://mostrador` (sin sesión) | El Catálogo, en la URL `/`. No aparece el mostrador. | Nada más. El Stack raíz solo tiene `(tabs)`. | `Stack.Protected guard={sesionIniciada}` en src/components/NavegacionRaiz.tsx:25-27. Sin sesión la ruta no existe. |
| `bibliotecaipf://reserva` | "Mis reservas". La URL cambia a `/reservas`. | Las pestañas. Atrás, desde "Mis reservas", lleva al Catálogo. | `<Redirect href="/reservas" />` en src/app/reserva.tsx:3-5. |
| `bibliotecaipf://escanear` (cámara bloqueada) | El escáner sin cámara, con el mensaje "La cámara está bloqueada. Activala en Ajustes o escribí el ISBN.", el botón "Abrir Ajustes" y el campo para escribir el ISBN. | Las pestañas, con el Catálogo, por el `anchor` de la raíz. | `ZonaCamara` (src/components/ZonaCamara.tsx:65-74) según el estado que calcula `calcularEstado` (src/lib/permisos.ts:36-44). |

Pregunta final: por qué `/libro/123` llega al detalle

El router solo compara la forma de la dirección con los archivos. `libro/[isbn].tsx` define el patrón `libro/` más un segmento, y "123" es un segmento. El router no sabe qué es un ISBN válido ni qué libros existen. Solo entrega el valor como texto (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:20). La pantalla 404 se usa únicamente cuando la dirección no coincide con ningún patrón.

La responsabilidad de responder bien es de la pantalla de detalle. Primero valida el formato y, si falla, muestra el mensaje de ISBN inválido y el enlace al Catálogo (líneas 37-47). Después, con el catálogo cargado, busca el libro y, si no existe, muestra "No encontramos ningún libro con el ISBN ..." (líneas 66-73).

### C4. Foco, montaje y primer plano

a) Qué detecta cada herramienta

- `useEffect` con `[]`: detecta que el componente se montó. Corre una vez y su limpieza corre al desmontar. No sabe nada del foco ni del primer plano.
- `useFocusEffect`: detecta que la pantalla pasó a estar enfocada dentro de la navegación. Corre cada vez que la persona vuelve a ella, por ejemplo al volver de otra pestaña o al cerrarse un modal apilado encima.
- `AppState`: detecta si la app entera pasa a primer plano o a segundo plano. No sabe en qué pantalla está la persona.

b) Ajustes o cambio de pestaña

La persona sale a Ajustes, habilita las notificaciones y vuelve: se entera `AppState`. La app vuelve a `active` y el listener de `usePermiso` (src/hooks/usePermiso.ts:55-64) llama a `revisar()`. La pantalla pasa a mostrar "Las notificaciones están permitidas" (src/app/(tabs)/reservas.tsx:43-46). `useEffect` con `[]` no se entera, porque el componente no se desmontó. `useFocusEffect` tampoco, porque salir de la app no cambia el foco de las pantallas.

La persona va a la pestaña Catálogo y vuelve a "Mis reservas": se entera `useFocusEffect`. La pantalla recupera el foco y ejecuta `revisar()` (src/app/(tabs)/reservas.tsx:71-78). `AppState` no se entera, porque la app siguió en primer plano. `useEffect` con `[]` tampoco, porque la pantalla seguía montada.

c) Cuáles usé y por qué

Usé las tres:

- Montaje: `usePermiso` ejecuta `revisar()` al montarse el hook (src/hooks/usePermiso.ts:51-53). Da el estado inicial.
- Primer plano: `usePermiso` escucha `AppState` (líneas 55-64) y revisa cuando la app vuelve de segundo plano o inactiva a `active`. Cubre la vuelta desde Ajustes.
- Foco: "Mis reservas" usa `useFocusEffect` (src/app/(tabs)/reservas.tsx:71-78). Cuando se cierra el modal /permisos/notificaciones, la pantalla recupera el foco y vuelve a consultar el permiso. Si el permiso no quedó concedido, también borra el recordatorio pendiente (líneas 74-76), para que no se active solo más tarde.

## Parte D · Permisos en mi app

### D1. Recorrido completo de la cámara

| # | Acción | Qué muestra mi app | status | canAskAgain |
|---|--------|--------------------|--------|-------------|
| 1 | Toca "Escanear" por primera vez | Un instante "Revisando el permiso de la cámara..." (src/components/ZonaCamara.tsx:34-36). Después escanear.tsx abre el modal /permisos/camara (src/app/escanear.tsx:25-30) con el título "Cámara", el beneficio y el botón "Continuar". Debajo queda "Todavía no diste permiso a la cámara..." con el botón "Permitir la cámara" (ZonaCamara.tsx:77-85) | undetermined | true |
| 2 | "Continuar" y "No permitir" | "Continuar" ejecuta pedir() (src/components/PantallaPrevia.tsx:21-26) y aparece el diálogo del sistema. Tras "No permitir" el modal se cierra y la zona de cámara vuelve a mostrar "Todavía no diste permiso..." con "Permitir la cámara" | denied | true |
| 3 | Toca "Escanear" otra vez | El escáner se abre de nuevo con previaMostrada en false (escanear.tsx:23). El estado sigue en preguntable, así que el modal /permisos/camara se abre otra vez con "Continuar" | denied | true |
| 4 | "Continuar" y "No permitir" | El sistema muestra el diálogo por segunda vez. Tras la segunda negación el estado pasa a bloqueado. El modal se cierra y la zona de cámara muestra "La cámara está bloqueada. Activala en Ajustes o escribí el ISBN." con la ruta de Ajustes y el botón "Abrir Ajustes" (ZonaCamara.tsx:65-75) | denied | false |
| 5 | Toca "Escanear" otra vez | No se abre el modal, porque escanear.tsx:26 solo lo abre en estado preguntable. Se ve directamente el mensaje de cámara bloqueada con "Abrir Ajustes". El formulario del ISBN sigue disponible (escanear.tsx:85) | denied | false |
| 6 | "Abrir Ajustes", habilita la cámara y vuelve | Linking.openSettings() abre Ajustes (src/hooks/usePermiso.ts:47-49). Al volver, AppState pasa a active y el hook vuelve a leer el permiso (usePermiso.ts:55-64). Aparece CameraView con "Apuntá al código de barras de la contratapa." (ZonaCamara.tsx:38-51) | granted | true |

a) En iOS el resultado cambia en el paso 2.

- iOS pregunta una sola vez. Después de "No permitir", el servicio de permisos calcula canAskAgain como status distinto de denied, así que vale false (node_modules/expo-modules-core/ios/Legacy/Services/Permissions/EXPermissionsService.m:130).
- En el paso 2 mi app ya pasa a bloqueado. El modal se cierra y se ve "La cámara está bloqueada..." con la ruta "Ajustes > Biblioteca IPF > Cámara > activar." (src/lib/permisos.ts:25).
- Los pasos 3 y 5 muestran ese mismo mensaje, sin modal ni diálogo. El paso 4 no existe, porque el sistema no vuelve a preguntar.
- El paso 6 es igual que en Android.

b) La línea que decide está en src/lib/permisos.ts:

```ts
function calcularEstado(respuesta: RespuestaSistema): EstadoPermiso {
  if (respuesta.granted) {
    return 'concedido';
  }
  if (respuesta.canAskAgain) {
    return 'preguntable';
  }
  return 'bloqueado';
}
```

La decisión entre "Continuar" y "Abrir Ajustes" es la línea 40, `if (respuesta.canAskAgain)`.

- Uso el campo canAskAgain. Mirar solo status no alcanza, porque los pasos 2 y 4 devuelven el mismo status, denied.
- En el paso 2 todavía puedo pedir el permiso. En el paso 4 ya no.
- Si decidiera solo con status, en el paso 4 mostraría "Continuar". Ese botón no abriría ningún diálogo y la persona tocaría un botón que no hace nada.

c) La parte que se entera es el oyente de AppState dentro de usePermiso (src/hooks/usePermiso.ts:55-64).

```ts
useEffect(() => {
  const suscripcion = AppState.addEventListener('change', (nuevo) => {
    const estabaAfuera = anterior.current === 'background' || anterior.current === 'inactive';
    if (estabaAfuera && nuevo === 'active') {
      revisar();
    }
    anterior.current = nuevo;
  });
  return () => suscripcion.remove();
}, [revisar]);
```

- Cuando la app vuelve de Ajustes pasa de background o inactive a active y llama a revisar(). Esa función consulta el permiso y lo guarda en el almacén compartido (usePermiso.ts:37-39).
- Sin esa parte, el escáner seguiría mostrando "La cámara está bloqueada" aunque la persona ya la habilitó. Volver de Ajustes no desmonta la pantalla, así que el useEffect de usePermiso.ts:51-53 no se ejecuta de nuevo.

### D2. Notificaciones y consistencia

a) Si no cancelara la notificación, el sistema la entregaría igual a los 15 segundos (src/constants/biblioteca.ts:6-7 y src/lib/notificaciones.ts:40-43). La persona vería "Recordá devolver Rayuela a la biblioteca." (notificaciones.ts:53) de un libro que ya devolvió.

Para evitarlo, devolver() cancela el recordatorio (src/context/BibliotecaContext.tsx:141-144):

```ts
setPrestamos((actual) => actual.filter((item) => item.isbn !== isbn));
if (prestamo.recordatorioId !== null) {
  await cancelarRecordatorio(prestamo.recordatorioId);
}
```

Si la persona devuelve el libro mientras el sistema todavía programa el recordatorio, activarRecordatorio revisa al terminar si el préstamo sigue vigente. Si ya no está, cancela la notificación recién creada (BibliotecaContext.tsx:158-163).

b) El identificador se guarda dentro del préstamo, en el campo recordatorioId (src/types/index.ts:19-24). Se asigna en BibliotecaContext.tsx:164-168. Los préstamos viven en un useState (BibliotecaContext.tsx:75), es decir, solo en memoria.

Si la app se cierra antes de que llegue la notificación:

- La notificación no se pierde. Android la guarda y la sigue programada en el sistema (node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt:111-127).
- El identificador sí se pierde. Los préstamos desaparecen al cerrar la app, porque no uso almacenamiento persistente.

El problema que aparece:

- Llega un recordatorio de un préstamo que la app ya no conoce, y no se puede cancelar porque no se sabe qué identificador cancelar.
- Si la persona reserva el mismo libro y activa el recordatorio otra vez, quedan dos notificaciones para el mismo libro.

Cómo lo resolvería, sin implementarlo:

- Guardaría los préstamos con su recordatorioId en almacenamiento persistente, por ejemplo AsyncStorage.
- Al iniciar la app llamaría a getAllScheduledNotificationsAsync y compararía esa lista con los préstamos guardados. Cancelaría las notificaciones que no pertenecen a ningún préstamo.

c) En Android 13 o superior el canal se crea antes de pedir el permiso porque el sistema no muestra el diálogo hasta que existe al menos un canal. La documentación de Expo dice: "On Android 13, app users must opt-in to receive notifications via a permissions prompt. This prompt will not appear until at least one notification channel is created." (https://docs.expo.dev/versions/latest/sdk/notifications/).

En mi código, solicitarPermiso llama a crearCanalPrestamos() antes de requestPermissionsAsync() (src/lib/permisos.ts:62-63). El canal se crea con setNotificationChannelAsync en src/lib/notificaciones.ts:34-37.

En Android 12 o inferior:

- No existe permiso en tiempo de ejecución y las notificaciones están activas por defecto. requestPermissionsAsync no abre ningún diálogo.
- Mi app pasa directo a concedido y la pantalla previa dice "Este permiso ya está concedido." (PantallaPrevia.tsx:51-53).
- Si la persona apagó las notificaciones en Ajustes, el estado es bloqueado y se muestra "Abrir Ajustes".
- El canal sigue siendo necesario desde Android 8 para publicar cualquier notificación.

d) Si el permiso está denegado y me entregan un libro desde el mostrador, me entero por un aviso dentro de la app. Aparece en la sección "Avisos" de "Mis reservas" (src/app/(tabs)/reservas.tsx:33-39).

El código que decide está en src/context/BibliotecaContext.tsx:197-218:

```ts
const entregarSiguiente = useCallback(
  async (libro: Libro): Promise<PersonaEnEspera | undefined> => {
    const persona = colas.get(libro.isbn)?.desencolar();
    setEsperas(copiarEsperas(colas));
    if (persona === undefined || !persona.esMia) {
      return persona;
    }
    const estado = await consultarPermiso('notificaciones');
    if (estado === 'concedido') {
      try {
        await notificarLibroListo(libro.titulo);
        return persona;
      } catch {
        agregarAviso('Tu reserva de ' + libro.titulo + ' está lista. Pasá a retirarla.');
        return persona;
      }
    }
    agregarAviso('Tu reserva de ' + libro.titulo + ' está lista. Pasá a retirarla.');
    return persona;
  },
  [colas, agregarAviso],
);
```

- El código consulta el permiso en ese momento. La línea 204 llama a consultarPermiso('notificaciones'), que pregunta al sistema con getPermissionsAsync (src/lib/permisos.ts:46-55). No usa un valor guardado.
- Importa porque la persona puede cambiar el permiso en Ajustes en cualquier momento sin que la app lo sepa. Un valor guardado podría ser viejo y yo mandaría una notificación que el sistema descarta.

### D3. Lo que mi app pide y lo que no

| Plataforma | Permiso o clave declarada | Función de la app que lo justifica | Quién lo agrega |
|------------|---------------------------|------------------------------------|-----------------|
| Android | android.permission.CAMERA | Escáner de códigos de barras (src/app/escanear.tsx) | Plugin expo-camera (node_modules/expo-camera/plugin/src/withCamera.ts:78-84) |
| Android | android.permission.POST_NOTIFICATIONS | Recordatorio de devolución y aviso de libro listo | AndroidManifest de expo-notifications, línea 3 |
| Android | android.permission.RECEIVE_BOOT_COMPLETED | Que los recordatorios programados se vuelvan a programar después de reiniciar el teléfono | AndroidManifest de expo-notifications, línea 2 |
| Android | android.permission.INTERNET | Conexión con el servidor de desarrollo. La app no hace pedidos de red reales, porque el catálogo sale de src/lib/api.ts | Plantilla base de Expo (node_modules/@expo/config-plugins/build/plugins/withAndroidBaseMods.js:57) |
| Android | android.permission.VIBRATE | Mi código no la usa. Queda por la plantilla base | Plantilla base de Expo (withAndroidBaseMods.js:60) |
| Android | android.permission.RECORD_AUDIO, bloqueado con tools:node remove | No se usa. La app no graba audio | Yo, con blockedPermissions en app.json:24 |
| Android | android.permission.SYSTEM_ALERT_WINDOW, bloqueado | No se usa | Yo, con blockedPermissions en app.json:25 |
| Android | android.permission.READ_EXTERNAL_STORAGE y WRITE_EXTERNAL_STORAGE, bloqueados | No se usan. No leo ni guardo archivos | Yo, con blockedPermissions en app.json:26-27 |
| Android | SCHEDULE_EXACT_ALARM y USE_EXACT_ALARM, no declarados | Los recordatorios no necesitan hora exacta | Nadie. Es una decisión mía |
| iOS | NSCameraUsageDescription | Texto del diálogo de la cámara: "Usamos tu cámara para leer el código de barras de la contratapa y abrir el libro en el catálogo." | Plugin expo-camera, con el texto que escribí en app.json:47 |
| iOS | NSMicrophoneUsageDescription, no declarada | La app no usa el micrófono | Nadie. El plugin la omite porque microphonePermission es false (app.json:48) |
| iOS | Entitlement aps-environment con valor development | Mi app solo usa notificaciones locales | Plugin expo-notifications, por su valor por defecto (node_modules/expo-notifications/plugin/src/withNotificationsIOS.ts:20-25) |
| iOS | Permiso de notificaciones, sin clave en Info.plist | Se pide en tiempo de ejecución con requestPermissionsAsync (src/lib/permisos.ts:63) | No hay clave que declarar |

a) Mi app no declara RECORD_AUDIO por dos motivos.

- El plugin de expo-camera agrega CAMERA y también RECORD_AUDIO, salvo que recordAudioAndroid sea false. Yo lo puse en false (app.json:49).
- Además bloqueo RECORD_AUDIO con blockedPermissions. Eso agrega la entrada con tools:node remove, que borra el permiso aunque otra librería lo declare.

El fragmento de app.json:

```json
"android": {
  "blockedPermissions": [
    "android.permission.RECORD_AUDIO",
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE"
  ]
}
```

```json
[
  "expo-camera",
  {
    "cameraPermission": "Usamos tu cámara para leer el código de barras de la contratapa y abrir el libro en el catálogo.",
    "microphonePermission": false,
    "recordAudioAndroid": false
  }
]
```

b) Usaría expo-image-picker y su función launchImageLibraryAsync.

- Permiso: la documentación oficial dice "No permissions request is necessary for launching the image library." (https://docs.expo.dev/versions/latest/sdk/imagepicker/). En iOS el plugin tiene la opción photosPermission, que escribe NSPhotoLibraryUsageDescription, y pondría un texto claro.
- Hace falta una build nueva. expo-image-picker es un módulo nativo que mi app no incluye, y una actualización OTA solo reemplaza el JavaScript y los assets. Además el plugin cambia el Info.plist y el AndroidManifest, que solo se regeneran al compilar.

c) Las partes que no pude verificar del todo en Expo Go son estas.

- El texto de propósito de la cámara en iOS. Expo Go usa su propio Info.plist y no aplica los plugins de mi app.json, así que se vería el texto de Expo Go. Lo comprobaría con una development build de iOS, mirando el diálogo.
- El canal "prestamos" de Android. En Expo Go se crea bajo el paquete de Expo Go, así que Ajustes no mostraría "Biblioteca IPF" y la ruta de src/lib/permisos.ts:23-24 no coincidiría. Lo comprobaría en una build de Android, en Ajustes, Aplicaciones, Biblioteca IPF, Notificaciones.
- La lista final de permisos de Android, incluido el bloqueo de RECORD_AUDIO. Solo existe en una build. Se comprueba con `adb shell dumpsys package ar.edu.ipf.biblioteca` o con prebuild, leyendo android/app/src/main/AndroidManifest.xml.
- El esquema bibliotecaipf:// de los enlaces profundos. Expo Go abre las rutas con su propio esquema, y el esquema propio solo existe en una build.
- Los valores reales de status y canAskAgain en cada paso, el diálogo del sistema y la notificación recibida. Se comprueban en un teléfono con la app recién instalada.

## Parte E · Buenas prácticas y decisiones de diseño

### E1. Revisión de código

a) Problemas del archivo del compañero. Las líneas son las del enunciado.

| N | Línea | Clasificación | Causa | Corrección |
|---|-------|---------------|-------|------------|
| 1 | 18-20 | Rendimiento u optimización | El efecto no tiene array de dependencias. Se ejecuta después de cada render. Cada respuesta cambia el estado, ese cambio dispara otro render y ese render dispara otro pedido | Agregar `[]` como segundo argumento. Mejor todavía, usar el catálogo compartido con `useCatalogo()` (src/context/CatalogoContext.tsx:20-26) |
| 2 | 19 | Error de ejecución | `obtenerLibros().then(...)` no tiene catch. En esta app el pedido falla 1 de cada 5 veces (src/lib/api.ts:9-11). La promesa rechazada queda sin atender y la lista queda vacía sin ningún mensaje | Atrapar el error y mostrar un mensaje con botón "Reintentar", como en src/hooks/useLibros.ts:26-30 |
| 3 | 14-15 | Mala práctica | Pide cámara y notificaciones apenas se abre el Catálogo. Esta pantalla no usa ninguna de las dos. La persona ve diálogos sin saber para qué | Pedir cada permiso al usar la función: la cámara al abrir el escáner (src/app/escanear.tsx:25-30) y las notificaciones al activar "Recordarme" (src/app/(tabs)/reservas.tsx:80-91) |
| 4 | 10 y 22 | Mala práctica | `any[]` y `libro: any` apagan el chequeo de tipos. Un error de nombre, como `libro.titlo`, no se detecta | Usar el tipo `Libro` (src/types/index.ts:1-7) |
| 5 | 22-30 | Mala práctica | `Fila` se declara dentro de `Catalogo`. En cada render es una función nueva, así que React la toma como otro componente. Desmonta y monta todas las filas, y estas pierden su estado | Sacarla a su propio archivo: src/components/FilaLibro.tsx |
| 6 | 33-36 | Rendimiento u optimización | `ScrollView` con `map` crea todas las filas de una vez. Con un catálogo grande, el arranque se vuelve lento | Usar `FlatList`, como en src/app/(tabs)/(catalogo)/index.tsx:24-33 |
| 7 | 35 | Mala práctica | `key={i}` usa la posición. Si la lista se reordena o se filtra, React asocia el estado de una fila con otro libro | Usar el ISBN: `keyExtractor={(libro) => libro.isbn}` (index.tsx:29) |
| 8 | 24 | Mala práctica | `router.push('/libro/' + libro.isbn)` arma la ruta pegando texto. El proyecto tiene `typedRoutes: true` (app.json:55) y el texto armado a mano pierde esa comprobación | Usar `router.push({ pathname: '/libro/[isbn]', params: { isbn: libro.isbn } })`, como en src/components/FilaLibro.tsx:13-15 |
| 9 | 37-39 | Mala práctica | El botón de la cámara es un ícono dentro de un `Pressable` sin `accessibilityRole` ni `accessibilityLabel`. Un lector de pantalla no sabe qué hace. Tampoco tiene área mínima de toque y queda al final de la lista | Usar un botón con rol y área mínima de toque. Mi app usa `BotonEnlace` en la cabecera (src/components/CabeceraCatalogo.tsx:33) con `tamanios.toqueMinimo` (src/components/BotonEnlace.tsx:33-34) |
| 10 | 25 | Mala práctica | Estilo en línea con valores sueltos (`fontSize: 16`, `color: '#333'`, `padding: 12`). Se crea un objeto nuevo en cada render y los valores no vienen de ningún tema | Usar `StyleSheet.create` y las constantes de src/constants/tema.ts, como en src/components/FilaLibro.tsx:31-44 |
| 11 | 11 | Advertencia | `permiso` se declara y no se usa | Quitar el hook de la cámara de esta pantalla |
| 12 | 9-41 | Mala práctica | La pantalla no tiene estados de carga, error ni vacío. Mientras carga se ve en blanco | Usar `EstadoCargando`, `EstadoError` y `EstadoVacio` (src/app/(tabs)/(catalogo)/index.tsx:16-21) |

b) Primer minuto con el efecto de las líneas 18 a 20 sin array de dependencias.

1. Se renderiza `Catalogo` con `libros` vacío. Solo se ve el botón de la cámara.
2. Corren los efectos. El primero pide los permisos. El segundo llama a `obtenerLibros()`.
3. `obtenerLibros()` espera 800 milisegundos y devuelve un arreglo nuevo con objetos nuevos (src/lib/api.ts:8 y 12).
4. En el segundo 0,8 llega la respuesta. `setLibros` recibe un arreglo distinto, React renderiza otra vez y aparecen los libros.
5. Como no hay array de dependencias, ese render ejecuta el efecto de nuevo y empieza otro pedido.
6. En el segundo 1,6 llega otro arreglo nuevo y todo se repite cada 0,8 segundos.
7. En cada render `Fila` es una función nueva (línea 22). Las filas se desmontan y se montan de nuevo cada 0,8 segundos. La lista parpadea y un toque a medias sobre una fila se puede perder.
8. En esta app el pedido falla 1 de cada 5 veces (api.ts:9-11). Una respuesta con error no llama a `setLibros`, no hay render y el ciclo se corta. Con un servidor estable no se cortaría y harían unos 75 pedidos en el minuto.

Si `obtenerLibros()` devolviera siempre el mismo arreglo, el ciclo se cortaría solo.

- El primer `setLibros(A)` recibe un arreglo distinto del vacío inicial. Hay un render y el efecto corre otra vez.
- El segundo `setLibros(A)` recibe el mismo A. React compara con `Object.is`, ve que es igual y no vuelve a renderizar. Sin render, el efecto no corre de nuevo.

c) Pantalla reescrita con los hooks, componentes y constantes de mi app. Es el archivo src/app/(tabs)/(catalogo)/index.tsx:

```tsx
import { FlatList, StyleSheet } from 'react-native';

import { CabeceraCatalogo } from '@/components/CabeceraCatalogo';
import { EstadoCargando } from '@/components/EstadoCargando';
import { EstadoError } from '@/components/EstadoError';
import { EstadoVacio } from '@/components/EstadoVacio';
import { FilaLibro } from '@/components/FilaLibro';
import { colores, espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useCatalogo } from '@/context/CatalogoContext';

export default function Catalogo() {
  const { libros, cargando, error, reintentar } = useCatalogo();
  const { recientes } = useBiblioteca();

  let estadoVacio = <EstadoVacio mensaje="Todavía no hay libros en el catálogo." />;
  if (cargando) {
    estadoVacio = <EstadoCargando mensaje="Cargando el catálogo..." />;
  } else if (error !== null) {
    estadoVacio = <EstadoError mensaje={error} onReintentar={reintentar} />;
  }

  return (
    <FlatList
      style={estilos.lista}
      contentContainerStyle={estilos.contenido}
      contentInsetAdjustmentBehavior="automatic"
      data={libros}
      keyExtractor={(libro) => libro.isbn}
      renderItem={({ item }) => <FilaLibro libro={item} />}
      ListHeaderComponent={<CabeceraCatalogo recientes={recientes} />}
      ListEmptyComponent={estadoVacio}
    />
  );
}

const estilos = StyleSheet.create({
  lista: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    padding: espaciado.l,
    gap: espaciado.s,
  },
});
```

d) El problema que podría provocar el rechazo en una tienda es el pedido de permisos al abrir (líneas 14 y 15).

- La pantalla pide la cámara y las notificaciones sin que ninguna función visible las use en ese momento.
- La documentación de Android recomienda pedir el permiso de notificaciones en contexto y esperar a que la persona conozca la app (https://developer.android.com/develop/ui/views/notifications/notification-permission, secciones "Wait to show notification permission prompt" y "Request the permission in context").

El problema que haría desinstalar la app primero es el efecto sin array de dependencias junto con `Fila` dentro del componente (líneas 18-20 y 22-30).

- La persona lo nota en el primer segundo. Con un servidor estable, la lista se vuelve a armar cada 0,8 segundos. Parpadea, se pierden toques y se gasta batería y datos.
- Los permisos, en cambio, se rechazan con un toque y la app sigue funcionando.

### E2. Organización y acoplamiento

a) Quién importa a quién. Lo revisé con grep sobre las importaciones de src.

| Carpeta | Importa de |
|---------|------------|
| app | components, constants, context, hooks, lib, types |
| components | components, constants, context, hooks, lib, types |
| context | constants, data, estructuras, hooks, lib, types |
| hooks | lib, types |
| lib | constants, data, types y otros archivos de lib |
| data | types |
| estructuras, constants, types | nada del proyecto |

No hay importaciones hacia arriba. Ningún archivo fuera de src/app importa algo de src/app.

Una importación hacia arriba sería un problema por tres motivos.

- Un hook que importara de src/app dependería de una pantalla, y no se podría reutilizar sin arrastrarla.
- Se pueden formar ciclos de importación. En un ciclo, un valor puede llegar como `undefined` al cargar los módulos.
- Los archivos de src/app son rutas. Importar desde ahí mezcla navegación con lógica.

b) Si el catálogo viniera de una API real, cambiarían estos archivos:

| Archivo | Por qué cambia |
|---------|----------------|
| src/lib/api.ts | Hay que reemplazar la simulación (`esperar`, la falla aleatoria y `LIBROS`) por un pedido de red real en `obtenerLibros` y `buscarLibros` (líneas 7-23). Es el cambio principal |
| src/data/libros.ts | Dejaría de ser la fuente de los libros. Podría quedar solo como datos de prueba |
| src/types/index.ts | Cambia solo si la respuesta de la API no tiene la misma forma que `Libro` |
| src/context/BibliotecaContext.tsx | Importa `ESPERA_INICIAL` de data/libros.ts (línea 13) para armar las colas iniciales (líneas 45-55). Si las listas de espera también vinieran del servidor, hay que cambiarlo |

Para leer el catálogo, el cambio real está en api.ts y data/libros.ts. Eso indica que la fuente de datos quedó aislada en lib/api.ts. La cuarta fila es un punto débil de mi diseño: BibliotecaContext.tsx lee data/libros.ts sin pasar por lib/api.ts. Esa lectura debería pedirse con una función de api.ts, igual que los libros.

c) Un componente `<ConPermiso recurso="camara">` en lugar de `usePermiso` y la pantalla previa.

Lo que ganaría:

- Un solo lugar con los cuatro estados (cargando, concedido, preguntable y bloqueado). Hoy están repartidos entre src/app/escanear.tsx:25-30, src/components/ZonaCamara.tsx:34-85 y src/components/PantallaPrevia.tsx:28-56.
- Menos código en cada pantalla que use la cámara y mensajes iguales en todas.

Lo que perdería:

- La pantalla previa como ruta. Hoy /permisos/[recurso] es un modal (src/components/NavegacionRaiz.tsx:20) y se abre una sola vez por apertura del escáner (`previaMostrada`, escanear.tsx:23-30). Un envoltorio tendría que reimplementar esa regla.
- La alternativa manual. El escáner muestra el formulario del ISBN aunque la cámara esté bloqueada (escanear.tsx:85). Un componente que envuelva toda la pantalla la ocultaría.
- El estado "concedido pero la cámara no abre" (`falloCamara`, ZonaCamara.tsx:53-63), que depende del fallo de montaje y no del permiso.

Para las notificaciones no serviría.

- No se piden al abrir una pantalla. Se piden al tocar el interruptor "Recordarme" (src/app/(tabs)/reservas.tsx:80-91). No hay una zona que envolver.
- Hay que recordar la acción pendiente y retomarla cuando el permiso se concede (reservas.tsx:58 y 63-69). Un componente que solo decide qué dibujar no puede expresarlo.
- Para las notificaciones sigue siendo mejor el hook `usePermiso` con la lógica en la pantalla.

### E3. Mapa de fallas

| Situación | Qué ve la persona | Dónde se maneja |
|-----------|-------------------|-----------------|
| obtenerLibros() falla | En el Catálogo, el mensaje "No pudimos cargar el catálogo. Revisá tu conexión e intentá de nuevo." con el botón "Reintentar". Lo mismo se ve en el detalle, en el modal de reserva, en el escáner y en el mostrador | Lanza el error src/lib/api.ts:9-11. Lo atrapa src/hooks/useLibros.ts:26-30 y arma el mensaje en la línea 42. Se muestra en src/app/(tabs)/(catalogo)/index.tsx:19-20 y 32. Otras pantallas: src/app/(tabs)/(catalogo)/libro/[isbn].tsx:57-64, src/app/reservar/[isbn].tsx:49-56, src/app/escanear.tsx:78 y src/app/mostrador.tsx:51-52 |
| Se abre /libro/abc | Mensaje rojo "El ISBN no es válido. Tiene que tener 13 números, sin guiones." y el enlace "Ir al Catálogo" | src/app/(tabs)/(catalogo)/libro/[isbn].tsx:37-47. La validación está en src/lib/isbn.ts:3-5 |
| Se escanea un ISBN que no está en el catálogo | Aviso "El libro con ISBN ... no está en el catálogo. Probá con otro código." y el botón "Seguir escaneando" | src/app/escanear.tsx:40-44 arma el aviso. Se muestra en las líneas 79-84. El botón limpia el aviso en las líneas 57-60 |
| La cámara está bloqueada | Mensaje "La cámara está bloqueada. Activala en Ajustes o escribí el ISBN." con la ruta de Ajustes y el botón "Abrir Ajustes". El formulario del ISBN sigue disponible | src/components/ZonaCamara.tsx:65-75. El estado se calcula en src/lib/permisos.ts:36-44. El formulario está en src/app/escanear.tsx:85 |
| Las notificaciones están denegadas | En "Mis reservas", arriba: "Las notificaciones están bloqueadas. Los avisos aparecen acá, dentro de la app." Al tocar el interruptor "Recordarme" se abre la pantalla previa, que indica activarlas en Ajustes y ofrece "Abrir Ajustes". Cuando entregan el libro, el aviso aparece en la sección "Avisos" | src/app/(tabs)/reservas.tsx:43-51 y 80-91. src/components/PantallaPrevia.tsx:36-45. El aviso: src/context/BibliotecaContext.tsx:214 |
| Se intenta reservar un libro ya reservado | El botón "Confirmar" queda deshabilitado y se ve "Ya reservaste este libro. No se puede reservar dos veces." | src/app/reservar/[isbn].tsx:67-68, 76-77 y 97. Segunda defensa: el Context devuelve el resultado `repetida` (src/context/BibliotecaContext.tsx:113-115) y la pantalla muestra el error (reservar/[isbn].tsx:34-36) |
| "Entregar al siguiente" con la lista de espera vacía | El mostrador solo lista libros con espera, así que ese botón normalmente no aparece. Si se llega igual, se ve "No hay nadie en la lista de espera de ..." en tono de aviso. Sin libros con espera se ve "No hay libros con lista de espera." | src/app/mostrador.tsx:26 filtra. El camino vacío es mostrador.tsx:30-36, que recibe `undefined` de BibliotecaContext.tsx:199-203. El mensaje de lista vacía: mostrador.tsx:48 |
| Login con clave incorrecta | Mensaje rojo "El usuario o la clave no son correctos." Los campos no se borran | src/app/login.tsx:19-22. La comparación está en src/lib/autenticacion.ts:3-5 |

### E4. Decisiones con argumentos

a) Identificador. Elegí el ISBN como parámetro de ruta y como key.

- Dos ediciones del mismo título tienen ISBN distintos. El ISBN identifica la edición, que es lo que presta una biblioteca. Un id numérico propio no agrega esa información.
- El ISBN viene del código de barras. El escáner lo usa directo: `libros.find((item) => item.isbn === isbn)` (src/app/escanear.tsx:40). Con un id propio necesitaría una tabla de equivalencias.
- `useLocalSearchParams` devuelve texto, y a veces una lista de textos. Mi función `leerParametro` lo resuelve (src/lib/parametros.ts:1-6).
- Un ISBN es un texto. Un ISBN-10 puede empezar con cero, y convertido a número perdería ese cero.
- Uso el mismo valor en la ruta `/libro/[isbn]`, en el `keyExtractor` (src/app/(tabs)/(catalogo)/index.tsx:29) y en la reserva (`'propia-' + libro.isbn`, src/context/BibliotecaContext.tsx:127).
- Punto débil: un libro sin ISBN no entra en mi app, porque `esIsbnValido` exige 13 números (src/lib/isbn.ts:3-5). Si la biblioteca tuviera libros antiguos sin ISBN, necesitaría un id propio en texto.
- El ISBN no distingue ejemplares físicos. Mi app lo resuelve con el campo `ejemplares`, que es una cantidad (src/types/index.ts:6).

b) Estructuras. Elegí la clase con `#items`.

Lo que me dio la clase:

- Encapsulamiento. `#items` es privado y nadie cambia la estructura sin pasar por sus métodos (src/estructuras/Pila.ts:1-30 y src/estructuras/Cola.ts:1-40).
- Una interfaz que expresa la regla de negocio: `push`, `pop`, `tope`, `encolar`, `desencolar`, `frente`.
- En la Cola, `desencolar` mueve un índice y solo recorta el arreglo de vez en cuando (Cola.ts:9-20). Con un arreglo en el estado y `slice` se copiaría la lista en cada entrega.

Lo que me complicó al combinarla con React:

- React compara por referencia. Si cambio una instancia por dentro, la referencia no cambia y no se vuelve a renderizar.
- Por eso guardo la instancia en `useState` (src/context/BibliotecaContext.tsx:66-67) y después de cada cambio copio el contenido a un estado normal con `aArray()`: en `registrarVisto` (línea 97), en `reservar` (línea 129) y en `entregarSiguiente` (línea 200).
- Quedan dos copias del mismo dato. Si olvido copiar, la pantalla queda desactualizada. Para reducir ese riesgo hay una sola función de copia para las colas, `copiarEsperas` (líneas 57-63).
- El `push` tiene que ir fuera de las funciones que se pasan a `setState`. React puede ejecutarlas dos veces en desarrollo y se duplicaría el elemento (línea 96).

Para guardar solo tres libros vistos, un arreglo con `[libro, ...recientes].slice(0, 3)` sería más simple. La Cola es donde la clase aporta más.

c) Memorización. Sí usé `useMemo` y `useCallback`.

Donde aportan:

- El `value` del Context (src/context/BibliotecaContext.tsx:220-251). Es un objeto con 13 campos. Sin `useMemo` sería un objeto nuevo en cada render del proveedor y todos los componentes que llaman a `useBiblioteca` se volverían a renderizar.
- `registrarVisto` (líneas 91-100). El detalle del libro la usa como dependencia de un efecto (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:27-31). Sin referencia estable, el efecto correría en cada render.

Donde serían ruido:

- `armarItems` y `obtenerReservasEnEspera` en src/app/(tabs)/reservas.tsx:60-61. Recorren listas de pocos elementos. Comparar las cuatro dependencias cuesta casi lo mismo que recalcular.
- `librosConEspera` en src/app/mostrador.tsx:26. Es un filtro de 16 elementos.

Cómo lo comprobaría en lugar de suponerlo:

1. Abriría React DevTools conectado a la app y usaría la pestaña Profiler con "Record why each component rendered".
2. Grabaría una acción que cambie solo una parte del estado, por ejemplo abrir un libro, que cambia `recientes`.
3. Contaría cuántas veces se renderiza un consumidor que no usa ese dato, como `EnlacePersonal`.
4. Repetiría la prueba sin el `useMemo` del value y con `reactCompiler` en `false` en app.json:56, para separar el efecto del compilador.
5. Si la cantidad de renders y el tiempo son iguales, la memorización es ruido y la quitaría.

d) Datos duplicados. Calculo los ejemplares disponibles y no los guardo.

- El dato guardado es `libro.ejemplares`, la cantidad total (src/types/index.ts:6).
- La disponibilidad se calcula en src/lib/reservas.ts:8-11 con `Math.max(0, libro.ejemplares - prestados)`.
- Se usa en el detalle (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:75), en el modal de reserva (src/app/reservar/[isbn].tsx:69) y al decidir entre prestar o encolar (src/context/BibliotecaContext.tsx:116).

El error cuando un mismo dato vive en dos lugares:

- Si guardara `disponibles` en el estado, cada acción tendría que actualizar dos cosas: la lista de préstamos y el contador.
- Ejemplo con Don Quijote de la Mancha, que tiene 1 ejemplar (src/data/libros.ts:12). La persona lo reserva y el contador baja a 0. Después lo devuelve. Si `devolver()` quita el préstamo y olvida subir el contador, el detalle seguiría diciendo "Ejemplares disponibles: 0" y la próxima reserva iría a la cola con el libro en el estante.

Cómo lo evita mi diseño:

- `devolver()` solo quita el préstamo (BibliotecaContext.tsx:135-147).
- La disponibilidad se recalcula sola en todas las pantallas, porque hay una sola fuente de verdad: la lista de préstamos.
