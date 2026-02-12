#!/usr/bin/env node
/**
 * Scrape job messages page by page.
 * Loads defaults from scripts/.script-config.json; creates from .script-config.example.json if missing.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, 'scripts', '.script-config.json');
const EXAMPLE_PATH = join(ROOT, 'scripts', '.script-config.example.json');

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

async function getJobMessagesPage(baseUrl, token, jobId, after = null) {
  const variables = { id: jobId };
  if (after) variables.after = after;

  const data = await graphql(
    baseUrl,
    token,
    `query GetJobMessages($id: ID!, $after: ID) {
      getJobById(id: $id) {
        id
        jobMessages(limit: 10, after: $after) {
          messages { id message author_id recipient_id created_at }
          hasMore
        }
      }
    }`,
    variables
  );
  return data?.getJobById?.jobMessages;
}

async function main() {
  const config = loadConfig();

  const jobId = process.argv[2] ?? config.job_id;
  const baseUrl = config.base_url ?? 'http://localhost:3000';

  let token = config.contractor_token ?? config.homeowner_token;
  if (!token) {
    console.log('No saved token. Signing in as contractor...');
    token = await signin(baseUrl, config.contractor_email, config.contractor_password);
  }

  let after = null;
  let page = 1;
  let total = 0;

  while (true) {
    const result = await getJobMessagesPage(baseUrl, token, jobId, after);
    if (!result) {
      console.error('Job not found');
      process.exit(1);
    }

    const { messages, hasMore } = result;
    console.log(`\n--- Page ${page} ---`);
    for (const m of messages) {
      total++;
      console.log(`[${formatTimestamp(m.created_at)}] ${m.author_id} -> ${m.recipient_id}: ${m.message}`);
    }

    if (!hasMore || messages.length === 0) break;
    after = messages[messages.length - 1].id;
    page++;
  }

  console.log(`\nTotal: ${total} messages`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
