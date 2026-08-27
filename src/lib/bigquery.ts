import { BigQuery } from '@google-cloud/bigquery';
import * as fs from 'fs';
import * as path from 'path';

let bigQueryClient: BigQuery | null = null;

export function getBigQueryClient(): BigQuery {
  if (!bigQueryClient) {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (credentialsJson && !credentialsJson.startsWith('/')) {
      // If GOOGLE_APPLICATION_CREDENTIALS contains JSON (not a file path),
      // write it to a temp file so the BigQuery client can read it
      const tmpDir = '/tmp';
      const credentialsPath = path.join(tmpDir, 'gcloud-credentials.json');

      try {
        fs.writeFileSync(credentialsPath, credentialsJson);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      } catch (error) {
        console.error('Failed to write credentials file:', error);
      }
    }

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
