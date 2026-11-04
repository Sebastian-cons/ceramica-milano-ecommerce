require('dotenv').config();
const path = require('path');
const express = require('express');
const products = require('./server/data/products');
const { insertRows, healthCheck } = require('./server/services/bigquery');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(__dirname, 'public');

app.use(express.json({ limit: '2mb' }));
app.use(express.static(PUBLIC));

app.get('/api/catalog', (_req, res) => res.json({ products }));

app.get('/api/health', async (_req, res) => {
  try {
    const ok = await healthCheck();
    res.json({ ok, bigquery: ok ? 'connected' : 'unknown' });
  } catch (error) {
    res.status(500).json({ ok: false, bigquery: 'error', message: error.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  const started = Date.now();
  const body = req.body || {};
  const product = products.find(p => String(p.id) === String(body.productId));
  const quantity = Number(body.quantity);
  const customerName = String(body.customerName || '').trim();
  const customerEmail = String(body.customerEmail || '').trim();
  const selectedColor = String(body.color || '').trim();

  if (!product) return res.status(400).json({ ok: false, message: 'Producto inválido.' });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50000) {
    return res.status(400).json({ ok: false, message: 'La cantidad debe estar entre 1 y 50,000.' });
  }
  if (!customerName || !customerEmail) {
    return res.status(400).json({ ok: false, message: 'Ingresa nombre y correo del cliente.' });
  }

  const isWholesale = quantity >= product.prices.wholesaleMin;
  const unitPrice = isWholesale ? product.prices.wholesale : product.prices.retail;
  const now = new Date();
  const stamp = `${now.getTime()}-${Math.floor(Math.random() * 1000)}`;
  const testRunId = `TEST-WEB-${stamp}`;
  const orderId = `ORDER-${stamp}`;
  const batchSize = quantity >= 5000 ? 500 : 250;

  let successful = 0;
  let failed = 0;
  let batchNumber = 0;
  const errors = [];

  try {
    for (let offset = 0; offset < quantity; offset += batchSize) {
      batchNumber += 1;
      const size = Math.min(batchSize, quantity - offset);
      const batchStarted = Date.now();
      const createdAt = new Date().toISOString();
      const rows = Array.from({ length: size }, (_, i) => {
        const item = offset + i + 1;
        return {
          transaction_id: `${orderId}-TX-${String(item).padStart(6, '0')}`,
          test_run_id: testRunId,
          order_id: orderId,
          customer_id: `WEB-${customerEmail.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) || 'CLIENT'}`,
          customer_name: customerName,
          customer_email: customerEmail,
          product_id: String(product.id),
          product_name: product.name,
          product_category: product.category.toUpperCase(),
          quantity: 1,
          unit_price: unitPrice.toFixed(2),
          total_amount: unitPrice.toFixed(2),
          payment_method: String(body.paymentMethod || 'SIMULATED_WEB'),
          currency: 'PEN',
          transaction_status: 'SUCCESS',
          source_application: 'WEB_CERAMICA_MILANO',
          batch_number: batchNumber,
          created_at: createdAt,
          processed_at: new Date().toISOString(),
          response_time_ms: 0,
          error_code: null,
          error_message: null
        };
      });

      try {
        await insertRows('TRANSACTIONS', rows);
        successful += size;
      } catch (error) {
        failed += size;
        errors.push({ batchNumber, error });
      }

      const elapsed = Date.now() - started;
      const processed = successful + failed;
      await insertRows('LOAD_TEST_METRICS', [{
        test_run_id: testRunId,
        metric_id: `${testRunId}-M-${String(batchNumber).padStart(4, '0')}`,
        measured_at: new Date().toISOString(),
        elapsed_ms: elapsed,
        processed_records: processed,
        successful_records: successful,
        failed_records: failed,
        throughput_rps: elapsed > 0 ? Number((processed / (elapsed / 1000)).toFixed(2)) : 0,
        average_response_ms: Date.now() - batchStarted,
        maximum_response_ms: Date.now() - batchStarted,
        minimum_response_ms: Date.now() - batchStarted,
        batch_number: batchNumber,
        active_requests: 1,
        created_at: new Date().toISOString()
      }]);
    }

    for (let i = 0; i < errors.length; i++) {
      const item = errors[i];
      await insertRows('LOAD_TEST_ERRORS', [{
        test_run_id: testRunId,
        error_id: `${testRunId}-ERR-${i + 1}`,
        transaction_id: null,
        order_id: orderId,
        error_code: item.error.code ? String(item.error.code) : 'BIGQUERY_INSERT_ERROR',
        error_type: item.error.name || 'BigQueryError',
        error_message: String(item.error.message || item.error).slice(0, 900),
        stage: 'BIGQUERY_INSERT',
        batch_number: item.batchNumber,
        occurred_at: new Date().toISOString(),
        retry_attempt: 0,
        resolved: false,
        created_at: new Date().toISOString()
      }]);
    }

    const finished = Date.now();
    const durationMs = finished - started;
    const processed = successful + failed;
    const throughput = durationMs > 0 ? processed / (durationMs / 1000) : 0;
    const status = failed === 0 ? 'SUCCESS' : (successful > 0 ? 'COMPLETED_WITH_ERRORS' : 'FAILED');

    await insertRows('LOAD_TEST_RUNS', [{
      test_run_id: testRunId,
      test_name: `Compra web ${orderId}`,
      test_type: quantity >= 10000 ? 'STRESS_WEB' : (isWholesale ? 'WHOLESALE_WEB' : 'RETAIL_WEB'),
      requested_records: quantity,
      processed_records: processed,
      successful_records: successful,
      failed_records: failed,
      started_at: new Date(started).toISOString(),
      finished_at: new Date(finished).toISOString(),
      duration_ms: durationMs,
      throughput_rps: Number(throughput.toFixed(2)),
      average_response_ms: Number((durationMs / Math.max(1, batchNumber)).toFixed(2)),
      maximum_response_ms: durationMs,
      minimum_response_ms: 0,
      status,
      notes: `Compra ${isWholesale ? 'por mayor' : 'por menor'} desde la web. Producto: ${product.name}. Color: ${selectedColor || 'No especificado'}.`,
      created_at: new Date().toISOString()
    }]);

    res.status(failed === 0 ? 201 : 207).json({
      ok: failed === 0,
      orderId,
      testRunId,
      purchaseType: isWholesale ? 'wholesale' : 'retail',
      product: product.name,
      quantity,
      unitPrice,
      total: Number((unitPrice * quantity).toFixed(2)),
      successfulRecords: successful,
      failedRecords: failed,
      durationMs,
      throughputRps: Number(throughput.toFixed(2)),
      status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: error.message || 'Error interno procesando la compra.' });
  }
});

app.use((_req, res) => {res.sendFile(path.join(PUBLIC, 'index.html'));});

app.listen(PORT, () => {
  console.log(`Cerámica Milano: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
