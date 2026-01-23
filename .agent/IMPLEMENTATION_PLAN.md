# Plan de Implementación - Funcionalidades Avanzadas CRM Médico

## Estado Actual
- ✅ Sistema de Agenda funcionando
- ✅ Odontograma básico implementado
- ✅ Sistema de facturación Veri*factu
- ✅ Gestión de pacientes y historial clínico

## Funcionalidades a Implementar

### 1. Navegación desde Agenda → Gestión de Cita
**Objetivo**: Crear flujo completo desde cita hasta gestión de tratamientos

**Componentes a crear/modificar**:
- `src/components/AppointmentModal.tsx` (NUEVO) - Modal resumen de cita
- `src/pages/AppointmentDetails.tsx` (NUEVO) - Pantalla gestión de cita
- `src/pages/Agenda.tsx` (MODIFICAR) - Añadir modal al hacer clic en cita

**Flujo**:
1. Clic en cita → Abre `AppointmentModal`
2. Botón "Ver Cita" → Navega a `/appointment/:id` 
3. En AppointmentDetails ya aparece pestaña Odontograma/Tratamientos

---

### 2. Odontograma Avanzado (Selección Múltiple + Acumulación)
**Objetivo**: Permitir múltiples tratamientos por diente y selección batch

**Componentes a modificar**:
- `src/components/Odontogram.tsx` - Reescribir lógica de selección
- `types.ts` - Añadir tipo `Treatment` con toothId, serviceId, status

**Nuevas características**:
```typescript
interface Treatment {
  id: string;
  patientId: string;
  toothId: number; // Diente específico
  serviceId: string; // Referencia a DENTAL_SERVICES
  serviceName: string;
  price: number;
  status: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO';
  createdAt: string;
}
```

**Estados del componente**:
- `selectedTeeth: number[]` - Array de dientes seleccionados
- `treatments: Treatment[]` - Lista de tratamientos del paciente
- `showSidePanel: boolean` - Panel lateral para asignar tratamiento

**Lógica**:
1. **Selección simple**: Clic en un diente → `selectedTeeth = [21]` → Muestra panel
2. **Selección múltiple**: Ctrl+Clic → Acumula `selectedTeeth = [14, 15, 16]`
3. **Asignación masiva**: Seleccionar servicio → Crea un Treatment por cada diente
4. **Acumulación**: Volver a clicar mismo diente → Añade otro tratamiento (no reemplaza)

---

### 3. Presupuestos desde Odontograma
**Objetivo**: Seleccionar tratamientos y generar presupuesto formal

**Componentes a crear/modificar**:
- `src/components/TreatmentList.tsx` (NUEVO) - Tabla con checkboxes
- `src/components/Odontogram.tsx` (MODIFICAR) - Añadir TreatmentList debajo
- `server/routes/budgets.js` (MODIFICAR) - Endpoint crear presupuesto desde treatments

**Interfaz**:
```
┌─────────────────────────────────────────┐
│         [Odontograma Visual]           │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Tabla de Movimientos                    │
│ ☐ Diente 21 - Endodoncia - 350€        │
│ ☐ Diente 21 - Corona - 450€            │
│ ☑ Diente 14 - Extracción - 150€        │
│ ☑ Diente 15 - Extracción - 150€        │
│                                          │
│ [Presupuestar Seleccionados]            │
└─────────────────────────────────────────┘
```

**Lógica**:
1. Renderizar lista de `treatments` del paciente
2. Checkboxes para seleccionar
3. Botón "Presupuestar" → API: `POST /api/budgets/create-from-treatments`
4. Navegar a pestaña Presupuestos

---

### 4. Modal de Nueva Venta (Cobro)
**Objetivo**: Gestionar cobros directos y pagos a cuenta

**Componentes a crear**:
- `src/components/PaymentModal.tsx` (NUEVO) - Modal completo de venta

**Pestañas del modal**:
1. **Cobro Directo/Presupuesto**
   - Selector de presupuesto existente
   - Desglose de items
   - Total a cobrar
   - Método de pago (Efectivo/Tarjeta/Monedero)

2. **Pago a Cuenta**
   - Input manual de importe
   - Método de pago
   - Al guardar → Suma a `patient.wallet` (nuevo campo)

**Tipos a añadir**:
```typescript
interface Patient {
  // ... campos existentes
  wallet?: number; // Saldo disponible de pagos adelantados
}

interface Payment {
  id: string;
  patientId: string;
  budgetId?: string; // Si es cobro de presupuesto
  amount: number;
  method: 'cash' | 'card' | 'wallet';
  type: 'DIRECT_CHARGE' | 'ADVANCE_PAYMENT';
  createdAt: string;
  invoiceId: string; // Factura generada automáticamente
}
```

---

### 5. Generación Automática de Factura al Cobrar
**Objetivo**: Al confirmar pago, crear factura instantáneamente

**Flujo**:
1. Usuario hace clic en "Pagar" en `PaymentModal`
2. Backend recibe `POST /api/payments/create`
3. Backend:
   - Crea registro `Payment`
   - Si type='ADVANCE_PAYMENT' → Actualiza `patient.wallet`
   - Si type='DIRECT_CHARGE' → Puede usar `patient.wallet` como método
   - **Genera factura automáticamente** → `POST /api/invoices/create`
4. Devuelve invoice PDF URL
5. Frontend muestra "✅ Pago registrado. Factura: [PDF]"

**Modificaciones en backend**:
- `server/services/paymentService.js` (NUEVO)
- `server/routes/payments.js` (NUEVO)
- Integrar con `invoiceService.js` existente

---

### 6. Detalle en Lista de Facturas
**Objetivo**: Mostrar concepto claro en factura

**Campos de Invoice a añadir**:
```typescript
interface Invoice {
  // ... campos existentes
  concept: string; // "Pago a Cuenta" | "Tratamiento: Endodoncia Diente 21"
  relatedPaymentId?: string;
}
```

**Renderizado**:
```
Factura 2026-001
Fecha: 23/01/2026
Concepto: Pago a Cuenta - 5.000€
─────────────────
Factura 2026-002
Fecha: 24/01/2026
Concepto: 
  • Endodoncia Diente 21 - 350€
  • Corona Diente 21 - 450€
Total: 800€
```

---

## Orden de Implementación

### Sprint 1: Tipos y Backend (Prioridad Alta)
1. ✅ Actualizar `types.ts` con Treatment, Payment
2. ✅ Crear `server/models/Treatment.js`
3. ✅ Crear `server/routes/treatments.js`
4. ✅ Crear `server/services/paymentService.js`
5. ✅ Actualizar Prisma schema

### Sprint 2: Odontograma Avanzado (Prioridad Alta)
1. Reescribir `Odontogram.tsx` con selección múltiple
2. Crear `TreatmentList.tsx` con checkboxes
3. Integrar panel lateral de asignación

### Sprint 3: Navegación Agenda (Prioridad Media)
1. Crear `AppointmentModal.tsx`
2. Crear `AppointmentDetails.tsx`
3. Modificar `Agenda.tsx` para abrir modal

### Sprint 4: Sistema de Cobros (Prioridad Crítica)
1. Crear `PaymentModal.tsx` con pestañas
2. Implementar lógica de Monedero Virtual
3. Integrar generación automática de factura
4. Probar flujo completo

### Sprint 5: Presupuestos desde Odontograma (Prioridad Media)
1. Endpoint `POST /api/budgets/create-from-treatments`
2. Botón "Presupuestar" en TreatmentList
3. Navegación automática a pestaña Budget

---

## Próximos Pasos Inmediatos
1. Actualizar schema de base de datos (Prisma)
2. Ejecutar migraciones
3. Crear componentes base
4. Probar cada flujo individualmente
