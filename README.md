# Roumavis

Experiencia privada para el 10–12 de octubre de 2026. Next.js App Router + TypeScript + Tailwind CSS, con Blob privado; sin base de datos. Diseñada para teléfono. No hay menú público entre sorpresas.

## Desarrollo

Node.js 22 o 24. `npm ci`, copiar `.env.example` a `.env.local`, completar las variables y ejecutar `npm run dev`. Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. `npm start` sirve la compilación de producción.

## Vercel, paso a paso

1. Importar `roumanok/Roumavis`, framework **Next.js**, directorio raíz del repositorio, Node 22/24; comandos predeterminados (`npm run build`).
2. En **Storage → Create Database/Storage → Blob**, crear un almacén con acceso **Private**, vincularlo al proyecto y habilitar los entornos correspondientes. Esta app requiere Blob privado, no cambia silenciosamente a público. No se creó ni contrató ningún recurso desde este repositorio.
3. Configurar `BLOB_READ_WRITE_TOKEN` con el token oficial del almacén. Si se eligió un prefijo personalizado al conectarlo, usar el nombre exacto `BLOB_READ_WRITE_TOKEN` aquí. El SDK también admite la conexión actual por `BLOB_STORE_ID` + `VERCEL_OIDC_TOKEN` administrado por Vercel; no copiar manualmente tokens OIDC. El token estático es útil para desarrollo local.
4. Agregar `ADMIN_PASSWORD` (contraseña única de al menos 16 caracteres), `SESSION_SECRET` y `EXPERIENCE_KEY` (dos valores aleatorios distintos de al menos 32 caracteres). Para cada secreto aleatorio se puede ejecutar `openssl rand -hex 32`. Ninguna variable lleva `NEXT_PUBLIC_`. No guardar valores reales en Git.
5. Hacer un nuevo deploy después de configurar variables. Producción debe usar HTTPS. Para que una invitada abra los QR sin cuenta de Vercel, el despliegue de producción no debe exigir autenticación de Vercel; la propia app valida el enlace privado. Mantener protegido el preview de desarrollo si se prefiere.
6. Abrir `/admin`, ingresar y cargar las frases. Guardar en Historia o Mensajes guarda ambos grupos, con detección de versiones concurrentes.
7. Crear cada QR con el formato siguiente, reemplazando dominio y clave. El servidor valida la clave, coloca una cookie httpOnly y redirige a la ruta limpia. No hay registro ni pantalla de login para la invitada:

```
https://TU-DOMINIO/acceso?k=EXPERIENCE_KEY&destino=/
https://TU-DOMINIO/acceso?k=EXPERIENCE_KEY&destino=/vista
https://TU-DOMINIO/acceso?k=EXPERIENCE_KEY&destino=/cama
https://TU-DOMINIO/acceso?k=EXPERIENCE_KEY&destino=/mesita
https://TU-DOMINIO/acceso?k=EXPERIENCE_KEY&destino=/encuesta
```

La clave debe codificarse con `encodeURIComponent` si contiene caracteres especiales (hexadecimal evita ese problema). El QR es una invitación privada: quien lo tenga podrá acceder a las selfies. Las sesiones de invitada duran 60 días; las de admin, 8 horas. Rotar `SESSION_SECRET` invalida todas las cookies; rotar `EXPERIENCE_KEY` invalida los QR antiguos. `noindex` no es autenticación. Los endpoints de imágenes, contenido y encuesta exigen sesión. El servidor verifica el origen de escrituras. Configurar una regla de rate limiting de Vercel Firewall para `/api/login` si se desea limitar intentos globalmente; no se usa un contador en memoria que daría falsa protección en serverless.

## Assets

Se conservaron los tres archivos originales de raíz, incluida la ilustración `file_00000000fe3c820ea8d9b8ea6aa3a972.png`. El logo y `heaven.mp3` se copiaron a `public/` para servirlos sin alterar los originales.

**Las 22 fotos históricas no estaban en el repositorio.** Agregar `public/historia/foto-1.png` (2004) hasta `foto-22.png` (2025). Mientras falten se ve un marco discreto con corazón; no se inventan fotos ni frases. Estas imágenes estáticas, el logo y el audio son assets públicos. Las selfies son privadas y nunca se agregan a Git. Si también se necesita confidencialidad de fotos históricas, deben almacenarse fuera de `public/` en Blob con el mismo control de acceso, antes de cargarlas a un repositorio público.

## Persistencia y estructura

- `src/components/Story.tsx`: escenas, progreso local versionado, reingreso; audio en un componente estable fuera de las transiciones. Contador con Temporal y zona `America/Argentina/Buenos_Aires`.
- `CameraCapture` + `RegisterMoment`: cámara frontal, fallback, preview, compresión JPEG hasta 1800 px y un slot activo por momento. El servidor valida/decodifica, normaliza orientación y descarta metadatos usando Sharp.
- `Survey`, `MomentViewer`, `StoryCollage`: encuesta por pasos, envío final idempotente, galería ordenada, PNG 1080×1920. Si falta un momento, la galería lo omite y el collage conserva un marco vacío. Nunca se tapa la imagen con los rótulos; se encuadra completa.
- `src/app/admin` y `AdminPanel`: contenido, fotos (ver/reemplazar/eliminar) y respuestas. Sesión HMAC httpOnly validada en servidor; CSRF por origen y SameSite (Lax para invitada, compatible con abrir QR externos; Strict para admin).
- `src/lib/storage.ts`, `src/app/api/`: JSON validado y Blob privado. Paths fijos `data/contenido.json`, `data/encuesta.json`, `momentos/{slot}.jpg`. Lecturas consistentes (`useCache: false`) y respuestas no-store. Creación sin sobrescritura y reemplazos con ETag/`ifMatch`: un conflicto devuelve 409. No se acumulan archivos con sufijos. Un JSON corrupto o un fallo del proveedor no se interpreta como archivo vacío para no pisar datos. Contenido ausente usa defaults; encuesta ausente significa no enviada.

Solo el envío final persiste la encuesta; una evaluación ya enviada no se reemplaza con reintentos. El admin es de consulta para la encuesta. Una respuesta del servidor perdida se recupera al reintentar o recargar. Los borradores y progreso están en `roumavis:v1:*`; fallas de localStorage no bloquean el uso. El botón para revivir nunca borra fotos.

## Verificación y límites

`npm run test:e2e` usa Chromium con viewport mobile y APIs simuladas: comprueba recorrido, recuperación de encuesta, fallback de cámara, collage y controles de acceso reales sin credenciales Blob. Instalar Chromium una vez: `npx playwright install chromium`. Los tests levantan la compilación de producción con secretos ficticios de prueba. No sustituyen una prueba de integración contra un almacén real.

Antes de imprimir QR: con las variables reales, probar guardar/reemplazar y borrar una foto, editar una frase, enviar la encuesta y abrir desde otro dispositivo para confirmar persistencia. Verificar la cámara y audio en los teléfonos concretos. Safari/iOS requiere interacción para audio y HTTPS para cámara; navegadores integrados pueden denegar permisos. Se ofrece captura/selección alternativa. Las pistas de cámara se detienen al capturar, cancelar, ocultar la página y desmontar. La vista en vivo está espejada; el JPEG conserva la orientación fotográfica. HEIC depende del decodificador del navegador: si no abre, elegir JPG/PNG. Safari puede ignorar cambios programáticos de volumen: el fade es best effort y termina pausando el audio. Una recarga no puede reanudar música con sonido sin otro toque. Web Share solo aparece cuando admite archivos; siempre existe descarga PNG (en algunos iPhone se abre la imagen para guardarla/compartirla desde Safari).

Fuentes autoalojadas mediante Fontsource, sin llamadas a Google Fonts. No se probaron todavía hardware iOS/Android real ni el Blob de producción: faltan sus credenciales y las fotos originales.

### Resultado de esta entrega

- `npm run build`, `npm run lint` y `npm run typecheck`: OK.
- `npm test`: 4 pruebas OK (calendario, firmas/expiración, contenido, encuesta).
- `npm run test:e2e`: 4 pruebas OK en Chromium mobile (390×844), contra build de producción: acceso real por QR/admin, historia completa con fallback de cámara y revisita, borrador y reintento de encuesta, galería/descarga PNG 1080×1920, edición y borrado desde admin. APIs de Blob simuladas; ninguna foto de prueba se subió al almacenamiento real.
- Inspección visual de bienvenida y collage renderizados: OK. Cámara física, audio/fade específico de Safari y Blob real pendientes de prueba con la configuración final.
