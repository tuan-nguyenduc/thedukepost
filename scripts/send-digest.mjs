// scripts/send-digest.mjs
// Builds a digest of the top Wire stories since the last send and emails it
// to subscribers via the Buttondown API. Run manually with `npm run
// send-digest` (add --dry-run to preview without sending), or on a schedule
// via .github/workflows/send-digest.yml.

import { readFile, writeFile } from 'node:fs/promises';

const WIRE_PATH = 'src/data/wire.json';
const STATE_PATH = 'src/data/digest-state.json';
const ARCHIVE_PATH = 'src/data/digest-archive.json';
const MAX_STORIES = 8;
const MIN_STORIES = 1;
// First run has no prior send to diff against — fall back to a lookback
// window slightly longer than the digest cadence so nothing gets missed.
const FALLBACK_LOOKBACK_MS = 26 * 60 * 60 * 1000;

const isDryRun = process.argv.includes('--dry-run');

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function buildEmail(stories) {
  const dateLabel = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const subject = `The Wire — top stories for ${dateLabel}`;

  const intro = `Here's what's trending across tech right now, pulled from ${stories.length === 1 ? 'the story' : `the ${stories.length} stories`} getting the most coverage since our last note.`;

  const body = [
    intro,
    '',
    ...stories.flatMap((story) => {
      const attribution =
        story.sourceCount > 1
          ? `${story.source} + ${story.sourceCount - 1} more outlet${story.sourceCount - 1 > 1 ? 's' : ''}`
          : story.source;
      return [
        `### ${story.title}`,
        '',
        story.summary,
        '',
        `*${attribution}*  ·  [Read more](${story.link})`,
        '',
        '---',
        '',
      ];
    }),
  ].join('\n');

  return { subject, body };
}

async function sendEmail({ subject, body }) {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    throw new Error('BUTTONDOWN_API_KEY is not set — cannot send.');
  }

  const res = await fetch('https://api.buttondown.com/v1/emails', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
      // Buttondown requires this on the first send from a new API key to
      // confirm we really mean to queue mail to subscribers, not just draft
      // it. It's a no-op on subsequent sends.
      'X-Buttondown-Live-Dangerously': 'true',
    },
    body: JSON.stringify({ subject, body, status: 'about_to_send' }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Buttondown API error ${res.status}: ${text}`);
  }
}

async function archiveIssue({ subject, sentAt, stories }) {
  const archive = await readJson(ARCHIVE_PATH, { issues: [] });
  const dateStr = sentAt.toISOString().slice(0, 10);
  const existingSlugs = new Set(archive.issues.map((issue) => issue.slug));
  let slug = dateStr;
  let suffix = 2;
  while (existingSlugs.has(slug)) {
    slug = `${dateStr}-${suffix++}`;
  }

  archive.issues.unshift({
    slug,
    subject,
    sentAt: sentAt.toISOString(),
    stories: stories.map(({ title, summary, source, sourceCount, link }) => (
      { title, summary, source, sourceCount, link }
    )),
  });

  await writeFile(ARCHIVE_PATH, JSON.stringify(archive, null, 2) + '\n');
}

async function sendDigest() {
  const wire = await readJson(WIRE_PATH, null);
  if (!wire) throw new Error(`${WIRE_PATH} not found — run \`npm run sync-feeds\` first.`);

  const state = await readJson(STATE_PATH, null);
  const since = state?.lastSentAt
    ? new Date(state.lastSentAt).getTime()
    : Date.now() - FALLBACK_LOOKBACK_MS;

  const candidates = wire.items.filter((item) => new Date(item.latestActivity).getTime() > since);
  candidates.sort((a, b) => {
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
    return new Date(b.latestActivity) - new Date(a.latestActivity);
  });
  const stories = candidates.slice(0, MAX_STORIES);

  if (stories.length < MIN_STORIES) {
    console.log('No new stories since the last digest — skipping send.');
    return;
  }

  const email = buildEmail(stories);

  if (isDryRun) {
    console.log(`Subject: ${email.subject}\n`);
    console.log(email.body);
    console.log(`\n(dry run — ${stories.length} stories, nothing sent)`);
    return;
  }

  await sendEmail(email);
  console.log(`✓ Sent digest with ${stories.length} stories: "${email.subject}"`);

  const sentAt = new Date();
  await writeFile(STATE_PATH, JSON.stringify({ lastSentAt: sentAt.toISOString() }, null, 2));
  await archiveIssue({ subject: email.subject, sentAt, stories });
}

sendDigest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
