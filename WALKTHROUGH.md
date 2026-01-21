# Manual del Sistema de Facturación y Veri*factu

Este documento describe el funcionamiento del módulo de facturación, diseñado para cumplir con la nueva normativa de la Ley Antifraude y el sistema Veri*factu de la Hacienda Española.

## 1. Emisión de Facturas
El sistema permite emitir facturas directamente desde el módulo de **Caja & Facturación** o desde la ficha del paciente.

- **Proceso de Creación**:
  1. Seleccionar el paciente y los tratamientos a facturar.
  2. Verificar los datos fiscales del paciente.
  3. Confirmar la emisión. Una vez emitida, la factura recibe un número de serie consecutivo y único.

## 2. Nuevo Sistema Veri*factu (Hacienda)
Nuestro software implementa los requisitos técnicos de la normativa Veri*factu para garantizar la integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad de los registros de facturación.

### Características Principales:
*   **Inalterabilidad**: Una vez emitida una factura, sus datos no pueden ser modificados ni borrados. Cualquier error debe subsanarse mediante una factura rectificativa.
*   **Encadenamiento (Chaining)**: Cada factura genera una "huella digital" (Hash) única que incluye información de la factura anterior. Esto crea una cadena inquebrantable que garantiza que no se han ocultado facturas intermedias.
*   **Código QR**: Todas las facturas impresas o en PDF incluyen un código QR legible. Este código contiene los datos esenciales de la factura y permite a los clientes verificar su autenticidad escaneándolo (enlace con la AEAT).
*   **Envío a Hacienda (Veri*factu)**: El sistema está preparado para remitir automáticamente los registros de facturación a la Agencia Tributaria en el momento de su expedición (modo "Veri*factu"), cumpliendo con el Reglamento.

## 3. Facturas Rectificativas
Dado que las facturas emitidas son inalterables, si se comete un error (ej. importe incorrecto, datos del cliente erróneos), el sistema obliga a emitir una **Factura Rectificativa**.

- **Cómo funciona**:
  - Se selecciona la factura original errónea.
  - Se elige la opción "Rectificar".
  - Se genera una nueva factura con su propia serie (ej. R-2024-001) que anula o corrige la anterior.
  - La factura rectificativa también se encadena y se envía a Hacienda, manteniendo la trazabilidad completa.

## 4. Estados de la Factura
*   **Borrador (Draft)**: La factura se está preparando. Aún no tiene validez legal ni número oficial. Se puede modificar.
*   **Emitida (Issued)**: La factura es firme. Tiene número, fecha, hash y QR. No se puede editar.
*   **Rectificada**: La factura ha sido corregida por una rectificativa posterior.

Este flujo garantiza que la clínica cumpla con todas las obligaciones legales vigentes, evitando sanciones y simplificando la gestión fiscal.
