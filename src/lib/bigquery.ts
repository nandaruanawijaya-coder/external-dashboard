import { BigQuery } from '@google-cloud/bigquery';

let bigQueryClient: BigQuery | null = null;

export function getBigQueryClient(): BigQuery {
  if (!bigQueryClient) {
    // Uses Application Default Credentials (gcloud auth application-default login)
    bigQueryClient = new BigQuery({
      projectId: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID,
    });
  }
  return bigQueryClient;
}

export async function queryBigQuery(sql: string): Promise<any[]> {
  const bigquery = getBigQueryClient();
  const dataset = bigquery.dataset(process.env.NEXT_PUBLIC_BIGQUERY_DATASET!);

  try {
    const [rows] = await dataset.query({ query: sql });
    return rows;
  } catch (error) {
    console.error('BigQuery query failed:', error);
    throw error;
  }
}

export async function getUidMaster(uid: string): Promise<any> {
  const sql = `
    SELECT uid, company_name, total_branches, last_updated
    FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.uid_master\`
    WHERE uid = @uid
    LIMIT 1
  `;

  const bigquery = getBigQueryClient();
  const options = {
    query: sql,
    params: { uid },
  };

  const [rows] = await bigquery.query(options);
  return rows.length > 0 ? rows[0] : null;
}
