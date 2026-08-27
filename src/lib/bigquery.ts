import { BigQuery } from '@google-cloud/bigquery';

let bigQueryClient: BigQuery | null = null;

export function getBigQueryClient(): BigQuery {
  if (!bigQueryClient) {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID;

    const clientOptions: any = {
      projectId,
    };

    if (credentialsJson && !credentialsJson.startsWith('/')) {
      try {
        const credentials = JSON.parse(credentialsJson);
        clientOptions.credentials = credentials;
      } catch (error) {
        console.error('Failed to parse BigQuery credentials:', error);
      }
    }

    bigQueryClient = new BigQuery(clientOptions);
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
