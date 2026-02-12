#!/usr/bin/env node
/**
 * Subscribe to job messages (2 subscriptions) and exchange 2 messages from each user.
 * Loads defaults from scripts/.script-config.json; creates from .script-config.example.json if missing.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, 'scripts', '.script-config.json');
const EXAMPLE_PATH = join(ROOT, 'scripts', '.script-config.example.json');

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    if (existsSync(EXAMPLE_PATH)) {
      const example = JSON.parse(readFileSync(EXAMPLE_PATH, 'utf8'));
      writeFileSync(CONFIG_PATH, JSON.stringify(example, null, 2));
      console.log('Created scripts/.script-config.json from example. Edit it to customize.');
    } else {
      console.error('No scripts/.script-config.json or .script-config.example.json found.');
      process.exit(1);
    }
  }
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function formatTimestamp(ts) {
  if (ts == null || ts === '') return '';
  const ms = typeof ts === 'number' || /^\d+$/.test(String(ts)) ? Number(ts) : ts;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function signin(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.message && !data.token) {
    throw new Error(`Signin failed: ${data.message}`);
  }
  return data.token;
}

async function graphql(baseUrl, token, query, variables = {}) {
  const res = await fetch(`${baseUrl}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors && data.errors.length > 0) {
    throw new Error(`GraphQL error: ${data.errors[0].message}`);
  }
  return data.data;
}

function getUserIdFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

async function getJob(baseUrl, token, jobId) {
  const data = await graphql(
    baseUrl,
    token,
    `query GetJob($id: ID!) {
      getJobById(id: $id) {
        id contractor_id homeowner_id
        jobMessages(limit: 1) { messages { id } hasMore }
      }
    }`,
    { id: jobId }
  );
  return data?.getJobById;
}

async function addJobMessage(baseUrl, token, jobId, recipientId, message) {
  const data = await graphql(
    baseUrl,
    token,
    `mutation AddJobMessage($input: AddJobMessageInput!) {
      addJobMessage(input: $input) { id message author_id recipient_id created_at }
    }`,
    {
      input: { job_id: jobId, recipient_id: recipientId, message },
    }
  );
  return data?.addJobMessage;
}

function startSubscription(baseUrl, token, jobId) {
  const url = new URL(`${baseUrl}/graphql`);
  url.searchParams.set(
    'query',
    'subscription JobMessages($jobId: ID!) { jobMessages(jobId: $jobId) { id message author_id recipient_id created_at } }'
  );
  url.searchParams.set('variables', JSON.stringify({ jobId }));

  const controller = new AbortController();
  const subscription = fetch(url.toString(), {
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Subscription failed: ${res.status} ${text.slice(0, 200)}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.data?.jobMessages) {
              const m = json.data.jobMessages;
              console.log(
                `[Subscription] [${formatTimestamp(m.created_at)}] ${m.author_id} -> ${m.recipient_id ?? '?'}: ${m.message}`
              );
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') console.error('[Subscription error]', err.message);
  });

  return { subscription, controller };
}

async function main() {
  const config = loadConfig();

  const contractorEmail = process.argv[2] ?? config.contractor_email;
  const contractorPassword = process.argv[3] ?? config.contractor_password;
  const homeownerEmail = process.argv[4] ?? config.homeowner_email;
  const homeownerPassword = process.argv[5] ?? config.homeowner_password;
  const jobId = process.argv[6] ?? config.job_id;
  const baseUrl = config.base_url ?? 'http://localhost:3000';

  console.log('Signing in contractor...');
  const contractorToken = await signin(baseUrl, contractorEmail, contractorPassword);
  console.log('Contractor token:', contractorToken.slice(0, 20) + '...');

  console.log('Signing in homeowner...');
  const homeownerToken = await signin(baseUrl, homeownerEmail, homeownerPassword);
  console.log('Homeowner token:', homeownerToken.slice(0, 20) + '...');

  config.contractor_token = contractorToken;
  config.homeowner_token = homeownerToken;
  config.contractor_email = contractorEmail;
  config.contractor_password = contractorPassword;
  config.homeowner_email = homeownerEmail;
  config.homeowner_password = homeownerPassword;
  config.job_id = jobId;
  saveConfig(config);
  console.log('Tokens saved to scripts/.script-config.json');

  const job = await getJob(baseUrl, contractorToken, jobId);
  if (!job) {
    console.error('Job not found');
    process.exit(1);
  }
  const jobContractorId = job.contractor_id;
  const jobHomeownerId = job.homeowner_id;
  if (!jobHomeownerId) {
    console.error('Job has no homeowner');
    process.exit(1);
  }

  const contractorLoginUserId = getUserIdFromToken(contractorToken);

  const tokenForJobContractor =
    contractorLoginUserId === jobContractorId ? contractorToken : homeownerToken;
  const tokenForJobHomeowner =
    contractorLoginUserId === jobContractorId ? homeownerToken : contractorToken;

  console.log('Starting 2 subscriptions...');
  const sub1 = startSubscription(baseUrl, tokenForJobContractor, jobId);
  const sub2 = startSubscription(baseUrl, tokenForJobHomeowner, jobId);

  await new Promise((r) => setTimeout(r, 500));

  console.log('Sending 2 messages from contractor...');
  const c1 = await addJobMessage(
    baseUrl,
    tokenForJobContractor,
    jobId,
    jobHomeownerId,
    'Contractor message 1'
  );
  console.log(`  [${formatTimestamp(c1?.created_at)}] ${c1?.author_id} -> ${c1?.recipient_id}: ${c1?.message}`);
  const c2 = await addJobMessage(
    baseUrl,
    tokenForJobContractor,
    jobId,
    jobHomeownerId,
    'Contractor message 2'
  );
  console.log(`  [${formatTimestamp(c2?.created_at)}] ${c2?.author_id} -> ${c2?.recipient_id}: ${c2?.message}`);

  console.log('Sending 2 messages from homeowner...');
  const h1 = await addJobMessage(
    baseUrl,
    tokenForJobHomeowner,
    jobId,
    jobContractorId,
    'Homeowner message 1'
  );
  console.log(`  [${formatTimestamp(h1?.created_at)}] ${h1?.author_id} -> ${h1?.recipient_id}: ${h1?.message}`);
  const h2 = await addJobMessage(
    baseUrl,
    tokenForJobHomeowner,
    jobId,
    jobContractorId,
    'Homeowner message 2'
  );
  console.log(`  [${formatTimestamp(h2?.created_at)}] ${h2?.author_id} -> ${h2?.recipient_id}: ${h2?.message}`);

  await new Promise((r) => setTimeout(r, 1500));

  sub1.controller.abort();
  sub2.controller.abort();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
