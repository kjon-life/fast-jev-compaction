import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { collectToolCalls } from '../src/state.js';
import { extractClaudeCompactEvents, parseTranscript } from '../src/transcript.js';

const claudeJsonl = [
  JSON.stringify({
    type: 'file-history-snapshot',
    messageId: 'skip-me',
  }),
  JSON.stringify({
    type: 'user',
    message: { role: 'user', content: 'Fix the failing test. Never edit src/generated.' },
  }),
  JSON.stringify({
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'plan' },
        { type: 'text', text: 'Reading the file.' },
        { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { file_path: 'src/a.ts' } },
      ],
    },
  }),
  JSON.stringify({
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'export const a = 1;\n'.repeat(20) }],
    },
  }),
  JSON.stringify({
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'toolu_2', name: 'Bash', input: { command: 'npm test' } }],
    },
  }),
  JSON.stringify({
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'toolu_2', content: 'FAIL', is_error: true }],
    },
  }),
].join('\n');

const grokJsonl = [
  JSON.stringify({ type: 'system', content: 'you are grok' }),
  JSON.stringify({ type: 'user', content: [{ type: 'text', text: 'Fix the test.' }] }),
  JSON.stringify({
    type: 'assistant',
    content: 'Reading.',
    tool_calls: [{ id: 'call_1', name: 'read_file', arguments: JSON.stringify({ path: 'src/a.ts' }) }],
  }),
  JSON.stringify({ type: 'tool_result', tool_call_id: 'call_1', content: 'export const a = 1;' }),
  JSON.stringify({ type: 'reasoning', encrypted_content: 'nope' }),
].join('\n');

describe('parseTranscript', () => {
  it('maps Claude Code JSONL tool_use / tool_result pairs and skips non-messages', () => {
    const parsed = parseTranscript(claudeJsonl);
    expect(parsed.format).toBe('claude-jsonl');
    expect(parsed.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant', 'user']);
    expect(parsed.messages[1]).toMatchObject({
      text: 'Reading the file.',
      toolUses: [{ tool_use_id: 'toolu_1', tool: 'Read', input: { file_path: 'src/a.ts' } }],
    });
    expect(parsed.messages[2]?.toolResults?.[0]).toEqual({
      tool_use_id: 'toolu_1',
      text: 'export const a = 1;\n'.repeat(20),
    });
    expect(parsed.messages[4]?.toolResults?.[0]).toMatchObject({ tool_use_id: 'toolu_2', text: 'FAIL', isError: true });
    const calls = collectToolCalls(parsed.messages, 0);
    expect(calls.map((c) => c.tool)).toEqual(['Read', 'Bash']);
  });

  it('maps Grok chat_history.jsonl assistant tool_calls and tool_result rows', () => {
    const parsed = parseTranscript(grokJsonl);
    expect(parsed.format).toBe('grok-jsonl');
    expect(parsed.messages).toHaveLength(3);
    expect(parsed.messages[1]?.toolUses[0]).toEqual({
      tool_use_id: 'call_1',
      tool: 'read_file',
      input: { path: 'src/a.ts' },
    });
    expect(parsed.messages[2]?.toolResults?.[0]).toEqual({ tool_use_id: 'call_1', text: 'export const a = 1;' });
    expect(collectToolCalls(parsed.messages, 0)).toHaveLength(1);
  });

  it('accepts a library Message JSON array', () => {
    const parsed = parseTranscript(
      JSON.stringify([
        { role: 'user', text: 'hi', toolUses: [] },
        { role: 'assistant', text: '', toolUses: [{ tool_use_id: 't', tool: 'Read', input: { file_path: 'a.ts' } }] },
      ]),
    );
    expect(parsed.format).toBe('library-json');
    expect(parsed.messages).toHaveLength(2);
  });

  it('reads Claude compactMetadata pre/post tokens', () => {
    const events = extractClaudeCompactEvents(
      `${JSON.stringify({
        type: 'system',
        compactMetadata: { trigger: 'manual', preTokens: 500000, postTokens: 12000, durationMs: 1 },
      })}\n`,
    );
    expect(events).toEqual([{ trigger: 'manual', preTokens: 500000, postTokens: 12000, durationMs: 1 }]);
  });
});

describe('compact-transcript CLI', () => {
  it('dry-runs a Claude JSONL without contacting the network', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jev-compact-'));
    const path = join(dir, 'session.jsonl');
    writeFileSync(path, claudeJsonl);
    const stdout = execFileSync(
      'npx',
      ['tsx', 'bin/compact-transcript.ts', '--dry-run', '--json', '--preserve', '0', path],
      { cwd: join(fileURLToPath(new URL('.', import.meta.url)), '..'), encoding: 'utf8', env: { ...process.env, TYPESAFE_API_KEY: '' } },
    );
    const report = JSON.parse(stdout) as {
      format: string;
      candidates: number;
      ceiling: { reduction: number };
      shares: { resultShare: number };
      rows: { tool: string; pinned: boolean }[];
    };
    expect(report.format).toBe('claude-jsonl');
    expect(report.candidates).toBeGreaterThan(0);
    expect(report.ceiling.reduction).toBeGreaterThan(0);
    expect(report.shares.resultShare).toBeGreaterThan(0);
    expect(report.rows.map((row) => row.tool)).toEqual(['Read', 'Bash']);
  });

  it('refuses --api-key', () => {
    try {
      execFileSync('npx', ['tsx', 'bin/compact-transcript.ts', '--api-key', 'secret', 'x'], {
        cwd: join(fileURLToPath(new URL('.', import.meta.url)), '..'),
        encoding: 'utf8',
      });
      throw new Error('expected --api-key to fail');
    } catch (error) {
      const err = error as { stderr?: string; message: string };
      expect(`${err.stderr ?? ''}${err.message}`).toMatch(/Refusing --api-key/);
    }
  });
});
