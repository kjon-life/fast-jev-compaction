#!/usr/bin/env npx tsx
/**
 * Offline Jev compaction over a saved transcript.
 *
 * Key: process.env.TYPESAFE_API_KEY only (load it from ~/.config/secrets/api_keys.sh).
 * Never pass the key on the command line. Never write it to the repo or settings.json.
 *
 * Live mode POSTs user/assistant text and tool inputs to api.typesafe.ai.
 * Tool results are omitted from that request. --dry-run does not network.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  applyDecisions,
  compactMessages,
  collectToolCalls,
  decideCall,
  extractClaudeCompactEvents,
  fitState,
  parseTranscript,
  reductionRatio,
  resolveOptions,
  type CompactResult,
  type Message,
} from '../src/index.js';

function usage(): never {
  console.error(`Usage: npx tsx bin/compact-transcript.ts [options] <transcript>

  --dry-run              No network. Candidates, char shares, drop-all ceiling, built-in /compact events
  --json                 Machine-readable output
  --preserve <n>         Newest messages to pin (default 6)
  --out <path>           Write compacted messages JSON (live mode only)

Key: $TYPESAFE_API_KEY from the environment (zsh: ~/.config/secrets/api_keys.sh).
     Not --api-key, not ~/.typesafe_key, not settings.json.
`);
  process.exit(2);
}

function resolveApiKey(): string | undefined {
  const fromEnv = process.env.TYPESAFE_API_KEY?.trim();
  return fromEnv || undefined;
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  let jsonOut = false;
  let preserve: number | undefined;
  let out: string | undefined;
  const files: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--json') jsonOut = true;
    else if (arg === '--preserve') {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value)) usage();
      preserve = value;
    } else if (arg === '--out') {
      out = argv[++i];
      if (!out) usage();
    } else if (arg === '--api-key' || arg.startsWith('--api-key=')) {
      console.error('Refusing --api-key (leaks into shell history). Export TYPESAFE_API_KEY from ~/.config/secrets/api_keys.sh.');
      process.exit(2);
    } else if (arg === '-h' || arg === '--help') usage();
    else if (arg.startsWith('-')) usage();
    else files.push(arg);
  }
  if (files.length !== 1) usage();
  return { dryRun, jsonOut, preserve, out, file: files[0]! };
}

function contentShares(messages: readonly Message[]) {
  let text = 0;
  let toolInput = 0;
  let toolResult = 0;
  for (const message of messages) {
    text += message.text.length;
    for (const tool of message.toolUses) {
      try {
        toolInput += JSON.stringify(tool.input).length;
      } catch {
        toolInput += 20;
      }
    }
    for (const result of message.toolResults ?? []) toolResult += result.text.length;
  }
  const total = text + toolInput + toolResult;
  const pct = (n: number) => (total === 0 ? 0 : n / total);
  return { text, toolInput, toolResult, total, textShare: pct(text), inputShare: pct(toolInput), resultShare: pct(toolResult) };
}

function summarizeCalls(
  messages: Message[],
  preserveRecentMessages: number,
  rawText: string,
  format: string,
) {
  const options = resolveOptions({ preserveRecentMessages });
  const calls = collectToolCalls(messages, options.preserveRecentMessages);
  const candidates = calls.filter((call) => !call.pinned);
  let fitted: { tokens: number; stage: string } = { tokens: 0, stage: 'no-candidates' };
  if (candidates.length > 0) {
    try {
      fitted = fitState(messages, calls, options);
    } catch (error) {
      fitted = {
        tokens: 0,
        stage: `unfittable: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  const shares = contentShares(messages);
  const dropAll = applyDecisions(
    messages,
    calls.map((call) => decideCall(call, { keepCall: 0, keepResult: 0 }, options)),
    calls,
    options.truncateHeadChars,
  );
  const after = contentShares(dropAll);
  const builtInCompact = format === 'claude-jsonl' ? extractClaudeCompactEvents(rawText) : [];
  return {
    messages: messages.length,
    calls: calls.length,
    candidates: candidates.length,
    pinned: calls.length - candidates.length,
    stateTokens: fitted.tokens,
    stateStage: fitted.stage,
    shares,
    ceiling: {
      messagesAfter: dropAll.length,
      charsAfter: after.total,
      charsBefore: shares.total,
      reduction: shares.total === 0 ? 0 : (shares.total - after.total) / shares.total,
      note: 'drop every non-pinned call+result; Jev will keep some. Not Anthropic tokens.',
    },
    builtInCompact: builtInCompact.map((event) => ({
      ...event,
      reduction:
        event.preTokens && event.preTokens > 0
          ? (event.preTokens - (event.postTokens ?? 0)) / event.preTokens
          : undefined,
    })),
    rows: calls.map((call) => ({
      id: call.id,
      tool: call.tool,
      pinned: call.pinned,
      resultChars: call.resultChars,
      inputKeys: Object.keys(call.input),
    })),
  };
}

function printHumanDryRun(file: string, format: string, summary: ReturnType<typeof summarizeCalls>) {
  const { shares, ceiling } = summary;
  console.log(`file\t${file}`);
  console.log(`format\t${format}`);
  console.log(`messages\t${summary.messages}`);
  console.log(`calls\t${summary.calls} (${summary.candidates} candidates, ${summary.pinned} pinned)`);
  console.log(`state\t~${summary.stateTokens} tokens (${summary.stateStage})`);
  console.log(
    `shares\ttext=${(shares.textShare * 100).toFixed(1)}% input=${(shares.inputShare * 100).toFixed(1)}% result=${(shares.resultShare * 100).toFixed(1)}% (${shares.total} chars)`,
  );
  console.log(
    `ceiling\t${(ceiling.reduction * 100).toFixed(1)}% chars if Jev dropped every non-pinned call (${ceiling.charsBefore} → ${ceiling.charsAfter})`,
  );
  if (summary.builtInCompact.length > 0) {
    console.log('builtin_/compact\ttrigger\tpre\tpost\treduction');
    for (const event of summary.builtInCompact) {
      console.log(
        `\t${event.trigger ?? '?'}\t${event.preTokens}\t${event.postTokens}\t${((event.reduction ?? 0) * 100).toFixed(1)}%`,
      );
    }
  }
  console.log('id\ttool\tpinned\tresult_chars\tinput_keys');
  for (const row of summary.rows) {
    console.log(`${row.id}\t${row.tool}\t${row.pinned}\t${row.resultChars}\t${row.inputKeys.join(',')}`);
  }
  console.log('');
  console.log('Live mode POSTs user/assistant text and tool inputs to api.typesafe.ai; tool results are omitted.');
  console.log('Ceiling is char-share of droppable tool I/O, not billed tokens. Built-in /compact is the token baseline.');
}

function printHumanLive(file: string, format: string, result: CompactResult) {
  console.log(`file\t${file}`);
  console.log(`format\t${format}`);
  console.log(`reduction\t${(reductionRatio(result) * 100).toFixed(1)}%`);
  console.log(`messages\t${result.stats.messagesBefore} → ${result.stats.messagesAfter}`);
  console.log(`chars\t${result.stats.charsBefore} → ${result.stats.charsAfter}`);
  console.log(
    `decisions\tkept=${result.stats.kept} result_dropped=${result.stats.resultsDropped} call_dropped=${result.stats.callsDropped} pinned=${result.stats.pinned}`,
  );
  console.log(`state\t~${result.stats.stateTokens} tokens (${result.stats.stateStage}) in ${result.stats.requests} request(s), ${result.stats.ms}ms`);
  console.log('id\ttool\taction\tkeep_call\tkeep_result');
  for (const decision of result.decisions) {
    console.log(
      `${decision.id}\t${decision.tool}\t${decision.action}\t${decision.keepCall.toFixed(2)}\t${decision.keepResult.toFixed(2)}`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = resolve(args.file);
  const rawText = readFileSync(file, 'utf8');
  const parsed = parseTranscript(rawText);
  const preserve = args.preserve ?? 6;

  if (args.dryRun) {
    const summary = summarizeCalls(parsed.messages, preserve, rawText, parsed.format);
    if (args.jsonOut) {
      console.log(JSON.stringify({ file, format: parsed.format, ...summary }, null, 2));
    } else {
      printHumanDryRun(file, parsed.format, summary);
    }
    return;
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error('TYPESAFE_API_KEY is not set. Add it to ~/.config/secrets/api_keys.sh and open a new shell.');
    console.error('Re-run with --dry-run for the no-key ceiling eval.');
    process.exit(1);
  }

  const result = await compactMessages(parsed.messages, { apiKey, preserveRecentMessages: preserve });
  if (args.out) {
    writeFileSync(resolve(args.out), `${JSON.stringify(result.messages, null, 2)}\n`);
  }
  if (args.jsonOut) {
    console.log(
      JSON.stringify(
        {
          file,
          format: parsed.format,
          stats: result.stats,
          reduction: reductionRatio(result),
          decisions: result.decisions,
          out: args.out ?? null,
        },
        null,
        2,
      ),
    );
  } else {
    printHumanLive(file, parsed.format, result);
  }
}

await main();
