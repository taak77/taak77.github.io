import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'src/content/portfolio';
const REQUIRED_KEYS = ['title', 'order', 'thumbnail', 'images', 'tools'];

test('there are exactly 15 portfolio entries', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
  assert.equal(files.length, 15);
});

test('every entry has required frontmatter, a body, and a unique order', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
  const orders = [];

  for (const file of files) {
    const raw = readFileSync(`${DIR}/${file}`, 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    assert.ok(match, `${file}: missing frontmatter block`);

    const [, frontmatter, body] = match;
    for (const key of REQUIRED_KEYS) {
      assert.match(frontmatter, new RegExp(`^${key}:`, 'm'), `${file}: missing ${key}`);
    }
    assert.ok(body.trim().length > 0, `${file}: empty description body`);

    const orderMatch = frontmatter.match(/^order:\s*(\d+)/m);
    assert.ok(orderMatch, `${file}: order is not an integer`);
    orders.push(Number(orderMatch[1]));
  }

  assert.deepEqual(
    [...orders].sort((a, b) => a - b),
    Array.from({ length: 15 }, (_, i) => i + 1),
  );
});
