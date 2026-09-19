import type { Message, Role, ToolResult, ToolUse } from './types.js';

export type TranscriptFormat = 'claude-jsonl' | 'grok-jsonl' | 'library-json' | 'library-jsonl';

export interface ParsedTranscript {
  format: TranscriptFormat;
  messages: Message[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asRole(value: unknown): Role | undefined {
  return value === 'user' || value === 'assistant' ? value : undefined;
}

function blockText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block === 'string') {
      parts.push(block);
      continue;
    }
    if (!isRecord(block)) continue;
    if (typeof block.text === 'string') parts.push(block.text);
  }
  return parts.join('\n');
}

function parseInput(raw: unknown): Record<string, unknown> {
  if (isRecord(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed)) return parsed;
    } catch {
      /* keep the raw string */
    }
    return { raw };
  }
  return {};
}

function isLibraryMessage(value: unknown): value is Message {
  if (!isRecord(value) || asRole(value.role) === undefined) return false;
  if (typeof value.text !== 'string') return false;
  if (!Array.isArray(value.toolUses)) return false;
  return true;
}

function parseLibraryMessage(value: unknown): Message | undefined {
  if (!isLibraryMessage(value)) return undefined;
  const toolResults = Array.isArray(value.toolResults)
    ? value.toolResults.filter(
        (result): result is ToolResult =>
          isRecord(result) &&
          typeof result.tool_use_id === 'string' &&
          typeof result.text === 'string',
      )
    : undefined;
  return {
    role: value.role,
    text: value.text,
    toolUses: value.toolUses.filter(
      (tool): tool is ToolUse =>
        isRecord(tool) &&
        typeof tool.tool_use_id === 'string' &&
        typeof tool.tool === 'string' &&
        isRecord(tool.input),
    ),
    ...(toolResults && toolResults.length > 0 ? { toolResults } : {}),
  };
}

function parseClaudeMessage(row: Record<string, unknown>): Message | undefined {
  const type = row.type;
  if (type !== 'user' && type !== 'assistant') return undefined;
  const message = isRecord(row.message) ? row.message : row;
  const role = asRole(message.role) ?? (type === 'assistant' ? 'assistant' : 'user');
  const content = message.content;
  const toolUses: ToolUse[] = [];
  const toolResults: ToolResult[] = [];
  let text = '';
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const block of content) {
      if (!isRecord(block)) continue;
      if (block.type === 'text' && typeof block.text === 'string') texts.push(block.text);
      if (block.type === 'tool_use' && typeof block.id === 'string' && typeof block.name === 'string') {
        toolUses.push({
          tool_use_id: block.id,
          tool: block.name,
          input: parseInput(block.input),
        });
      }
      if (block.type === 'tool_result' && typeof block.tool_use_id === 'string') {
        toolResults.push({
          tool_use_id: block.tool_use_id,
          text: blockText(block.content),
          ...(block.is_error === true ? { isError: true } : {}),
        });
      }
    }
    text = texts.join('\n');
  }
  if (!text && toolUses.length === 0 && toolResults.length === 0) return undefined;
  return {
    role,
    text,
    toolUses,
    ...(toolResults.length > 0 ? { toolResults } : {}),
  };
}

function parseGrokRow(row: Record<string, unknown>): Message | undefined {
  const type = row.type;
  if (type === 'tool_result' && typeof row.tool_call_id === 'string') {
    return {
      role: 'user',
      text: '',
      toolUses: [],
      toolResults: [
        {
          tool_use_id: row.tool_call_id,
          text: blockText(row.content),
        },
      ],
    };
  }
  if (type === 'user' || type === 'assistant') {
    const toolUses: ToolUse[] = [];
    const calls = row.tool_calls;
    if (Array.isArray(calls)) {
      for (const call of calls) {
        if (!isRecord(call) || typeof call.id !== 'string' || typeof call.name !== 'string') continue;
        toolUses.push({
          tool_use_id: call.id,
          tool: call.name,
          input: parseInput(call.arguments ?? call.input),
        });
      }
    }
    const text = blockText(row.content);
    if (!text && toolUses.length === 0) return undefined;
    return { role: type, text, toolUses };
  }
  return undefined;
}

function detectJsonlFormat(rows: Record<string, unknown>[]): TranscriptFormat {
  if (rows.some((row) => isRecord(row.message) && (row.type === 'user' || row.type === 'assistant'))) {
    return 'claude-jsonl';
  }
  if (rows.some((row) => row.type === 'tool_result' || (row.type === 'assistant' && Array.isArray(row.tool_calls)))) {
    return 'grok-jsonl';
  }
  if (rows.some(isLibraryMessage)) return 'library-jsonl';
  if (rows.some((row) => row.type === 'user' || row.type === 'assistant')) return 'claude-jsonl';
  throw new Error('unrecognised transcript format');
}

function parseJsonl(text: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed: unknown = JSON.parse(trimmed);
    if (isRecord(parsed)) rows.push(parsed);
  }
  return rows;
}

export interface CompactEvent {
  trigger?: string;
  preTokens?: number;
  postTokens?: number;
  cumulativeDroppedTokens?: number;
  durationMs?: number;
}

/** Built-in Claude Code `/compact` events recorded on the JSONL (`compactMetadata`). */
export function extractClaudeCompactEvents(text: string): CompactEvent[] {
  const events: CompactEvent[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!isRecord(parsed) || !isRecord(parsed.compactMetadata)) continue;
    const meta = parsed.compactMetadata;
    if (typeof meta.preTokens !== 'number' || typeof meta.postTokens !== 'number') continue;
    events.push({
      trigger: typeof meta.trigger === 'string' ? meta.trigger : undefined,
      preTokens: meta.preTokens,
      postTokens: meta.postTokens,
      cumulativeDroppedTokens:
        typeof meta.cumulativeDroppedTokens === 'number' ? meta.cumulativeDroppedTokens : undefined,
      durationMs: typeof meta.durationMs === 'number' ? meta.durationMs : undefined,
    });
  }
  return events;
}

/** Parses a Claude Code JSONL, Grok `chat_history.jsonl`, or library `Message` JSON/JSONL. */
export function parseTranscript(text: string): ParsedTranscript {
  const trimmed = text.trim();
  if (!trimmed) return { format: 'library-json', messages: [] };

  if (trimmed.startsWith('[')) {
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error('JSON array transcript is malformed');
    const messages = parsed.map(parseLibraryMessage).filter((message): message is Message => message !== undefined);
    return { format: 'library-json', messages };
  }

  if (trimmed.startsWith('{') && !trimmed.includes('\n')) {
    const message = parseLibraryMessage(JSON.parse(trimmed));
    return { format: 'library-json', messages: message ? [message] : [] };
  }

  const rows = parseJsonl(trimmed);
  const format = detectJsonlFormat(rows);
  const messages: Message[] = [];
  for (const row of rows) {
    const message =
      format === 'grok-jsonl'
        ? parseGrokRow(row)
        : format === 'library-jsonl'
          ? parseLibraryMessage(row)
          : parseClaudeMessage(row);
    if (message) messages.push(message);
  }
  return { format, messages };
}
