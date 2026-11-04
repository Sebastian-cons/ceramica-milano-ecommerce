const { BigQuery } = require('@google-cloud/bigquery');

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'proyecto-universidad-507221';
const datasetId = process.env.BIGQUERY_DATASET || 'PAYMENTS_STRESS_LAB';
const bigquery = new BigQuery({ projectId });

const dataset = bigquery.dataset(datasetId);

function table(name) {
  return dataset.table(name);
}

async function healthCheck() {
  const [rows] = await bigquery.query({ query: 'SELECT 1 AS ok', location: 'US' });
  return rows?.[0]?.ok === 1;
}

async function insertRows(tableName, rows) {
  if (!rows.length) return;
  await table(tableName).insert(rows, { ignoreUnknownValues: false, skipInvalidRows: false });
}

module.exports = { bigquery, datasetId, table, insertRows, healthCheck };
