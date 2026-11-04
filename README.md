# Cerámica Milano + BigQuery

Proyecto web con backend Node.js/Express para registrar compras por menor y por mayor en Google BigQuery.

## Flujo

Web -> POST /api/purchases -> Node.js/Express -> BigQuery

Tablas utilizadas en `PAYMENTS_STRESS_LAB`:
- TRANSACTIONS
- LOAD_TEST_RUNS
- LOAD_TEST_METRICS
- LOAD_TEST_ERRORS

## 1. Instalar dependencias

```powershell
npm install
```

## 2. Crear `.env`

Copia `.env.example` como `.env`.

```env
PORT=3000
GOOGLE_CLOUD_PROJECT=proyecto-universidad-507221
BIGQUERY_DATASET=PAYMENTS_STRESS_LAB
```

## 3. Autenticación con Google Cloud

Recomendado para desarrollo local:

```powershell
gcloud auth application-default login
```

Tu usuario debe tener permisos para insertar y ejecutar trabajos sobre BigQuery en `proyecto-universidad-507221`.

Alternativa: usa una cuenta de servicio y define `GOOGLE_APPLICATION_CREDENTIALS` apuntando al JSON, pero nunca copies ese JSON dentro de `public/` ni lo subas a GitHub.

## 4. Ejecutar

```powershell
npm run dev
```

Abre:

http://localhost:3000

Prueba de conexión:

http://localhost:3000/api/health

Debe devolver algo parecido a:

```json
{"ok":true,"bigquery":"connected"}
```

## Compras

Al abrir un producto ahora aparece "Realizar compra". Se solicita nombre, correo y cantidad.

- Cantidad menor al mínimo mayorista -> precio por menor.
- Cantidad igual o mayor al mínimo -> precio por mayor.
- Cada unidad genera un registro en `TRANSACTIONS`.
- La ejecución se resume en `LOAD_TEST_RUNS`.
- Cada lote genera métricas en `LOAD_TEST_METRICS`.
- Los fallos quedan en `LOAD_TEST_ERRORS`.

Para la demostración de estrés puedes usar 10,000 unidades desde la misma página. El backend procesa la operación por lotes para no enviar todo en una sola solicitud a BigQuery.
