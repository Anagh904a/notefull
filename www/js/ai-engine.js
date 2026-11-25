let isDownloading = false;
const agentTools = [
  {
    name: 'get_current_time',
    label: 'Checking the time',
    description: "Get the current date and time on the user's device.",
    run: async () => new Date().toLocaleString()
  },
  {
    name: 'create_note',
    label: 'Creating note',
    description: 'Create a NEW note. Use only when the user asks to create, write or save a note.',
    parameters: {
      type: 'object',
      properties: {
        title:   { type: 'string', description: 'Short note title' },
        content: { type: 'string', description: "Full note text, written out from the user's request" }
      },
      required: ['title', 'content']
    },
    run: async ({ title, content }) => ({ ok: true, id: await NotefullTools.createNoteTool(title, content) })
  },
  {
    name: 'get_note_by_keyword',
    label: 'Searching notes',
    description: 'Search existing unlocked notes by keyword in title or content.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Keyword or phrase to search in notes' }
      },
      required: ['keyword']
    },
    run: async ({ keyword }) => await NotefullTools.getNoteByKeywordTool(keyword)
  },
  {
    name: 'edit_note',
    label: 'Updating note',
    description: 'Update an existing unlocked note by id or current title. Pass newTitle and newContent; unchanged fields are kept automatically.',
    parameters: {
      type: 'object',
      properties: {
        noteTitle: { type: 'string', description: 'Existing note current title' },
        newTitle:      { type: 'string', description: 'New title (or keep same title)' },
        newContent:    { type: 'string', description: 'Updated full note content' }
      },
      required: ['noteIdOrTitle', 'newTitle', 'newContent']
    },
    run: async ({ noteIdOrTitle, newTitle, newContent }) =>
      await NotefullTools.editNoteTool(noteIdOrTitle, newTitle, newContent)
  },
  {
    name: 'create_list',
    label: 'Creating list',
    description: 'Create a NEW checklist or to-do list with optional initial items.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short list title' },
        items: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional initial item names'
        }
      },
      required: ['title']
    },
    run: async ({ title, items = [] }) => ({ ok: true, id: await NotefullTools.createListTool(title, items) })
  },
  {
    name: 'get_list_by_keyword',
    label: 'Searching lists',
    description: 'Search existing unlocked lists by keyword in title or item names.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Keyword or item name to search in lists' }
      },
      required: ['keyword']
    },
    run: async ({ keyword }) => await NotefullTools.getListByKeywordTool(keyword)
  },
  {
    name: 'add_item_to_list',
    label: 'Adding item to list',
    description: 'Add a new item to an existing unlocked list matched by title or keyword.',
    parameters: {
      type: 'object',
      properties: {
        listKeyword: { type: 'string', description: 'Target list title or keyword' },
        itemText:    { type: 'string', description: 'Item text to add to the list' }
      },
      required: ['listKeyword', 'itemText']
    },
    run: async ({ listKeyword, itemText }) =>
      await NotefullTools.addItemToListTool(listKeyword, itemText)
  }
];

async function manageModels() {
  const llamaPath = 'models/Llama-3.2-1B-Instruct-Q4_K_M.gguf';
  const gemmaPath = 'models/qwen2.5-3b-instruct-q3_k_m.litertlm';
const qwenPath = 'models/qwen2.5-3b-instruct-q3_k_m.gguf';
const AIPath = 'models/notefull-ai-lite.litertlm';
const AI2Path = 'models/notefull-ai-full.litertlm';
  const hasLlama = await checkFileExists(llamaPath, 'DATA');
 const hasGemma = await checkFileExists(gemmaPath, 'DATA');
  const hasQwen = await checkFileExists(qwenPath, 'DATA');
  const hasAnyAI = await checkFileExists(AIPath, 'DATA');
  const hasSecondAI = await checkFileExists(AI2Path, 'DATA');
  let state = false;

  if (hasAnyAI) {
    try {
      const fileInfo = await Filesystem.stat({
        path: AIPath,
        directory: 'DATA'
      });
      const fileSizeGB = fileInfo.size / (1024 * 1024 * 1024);
      if (fileSizeGB < 1.6) {
        console.error('Qwen model size too small: ' + fileSizeGB.toFixed(2) + 'GB');
       state = false;
      } else {
        state = true;
      }
    } catch (error) {
      console.error("Failed to check Qwen model size:", error);
      state = false;
    }
  }

  if (hasSecondAI) {
    try {
      const fileInfo = await Filesystem.stat({
        path: AI2Path,
        directory: 'DATA'
      });
      const fileSizeGB = fileInfo.size / (1024 * 1024 * 1024);
      if (fileSizeGB <= 2.41) {
        console.error('Qwen model size too small: ' + fileSizeGB.toFixed(2) + 'GB');
       state = false;
      } else {
        state = true;
      }
    } catch (error) {
      console.error("Failed to check Qwen model size:", error);
      state = false;
    }
  }

  if (hasLlama || hasQwen || hasGemma) {
    try {
      await Filesystem.deleteFile({
        path: llamaPath,
        directory: 'DATA'
      });
      await Filesystem.deleteFile({
        path: qwenPath,
        directory: 'DATA'
      });
       await Filesystem.deleteFile({
        path: gemmaPath,
        directory: 'DATA'
      });
      console.log('Llama file found and deleted.');
    } catch (error) {
      console.error('Failed to delete Llama file:', error);
    }
  }

  return state;
}
// ───────── Parsing helpers ─────────

const CONTROL = /<\|(?:im_start|im_end|endoftext)\|>/g;

function hideTail(s) {
  const lt = s.lastIndexOf('<');
  return lt >= 0 && s.indexOf('>', lt) === -1 && s.length - lt < 32
    ? s.slice(0, lt)
    : s;
}


function toPlain(s) {
  s = String(s ?? '');

  if (!s.includes('<|im_start|>')) return s.trim();

  return s
    .replace(/<\|im_start\|>assistant\s*$/s, '')
    .replace(/<\|im_start\|>system\s*/g, 'System: ')
    .replace(/<\|im_start\|>user\s*/g, 'User: ')
    .replace(/<\|im_start\|>assistant\s*/g, 'Assistant: ')
    .replace(/<\|im_end\|>/g, '')
    .replace(/<\|endoftext\|>/g, '')
    .trim();
}


function parseOutput(raw, thinkingOn, finished) {
  let s = String(raw ?? '').replace(CONTROL, '').trim();
  s = s.replace(/^Assistant:\s*/i, '');

  let thinking = '';
  let body = s;
  let phase = 'answer';

  // Gemma 4 channel format
  const channelStart = s.indexOf('<|channel>thought');
  if (channelStart >= 0) {
    const start = channelStart + '<|channel>thought'.length;
    const channelEnd = s.indexOf('<channel|>', start);

    if (channelEnd >= 0) {
      thinking = s.slice(start, channelEnd).trim();
      body = s.slice(channelEnd + '<channel|>'.length).trim();
    } else if (!finished) {
      thinking = s.slice(start).trim();
      body = '';
      phase = 'thinking';
    } else {
      // Incomplete response: don't mistake a partial thought for an answer.
      thinking = s.slice(start).trim();
      body = '';
    }
  } else {
    // Legacy custom format
    const thinkStart = s.indexOf('<think>');
    const thinkEnd = s.indexOf('</think>');

    if (thinkStart >= 0 && thinkEnd > thinkStart) {
      thinking = s.slice(thinkStart + 7, thinkEnd).trim();
      body = (
        s.slice(0, thinkStart) +
        s.slice(thinkEnd + 8)
      ).trim();
    } else if (thinkStart >= 0 && !finished) {
      thinking = s.slice(thinkStart + 7).trim();
      body = '';
      phase = 'thinking';
    } else if (thinkStart === 0 && finished) {
      thinking = s.slice(7).trim();
      body = '';
    }
  }

  const calls = [];

  // Your custom JSON protocol (not Gemma's native tool syntax)
 body = body.replace(/<tool_call>\s*([\s\S]*?)\s*(?:<\/tool_call>|$)/g, (_, json) => {
  try {
    const c = JSON.parse(json.replace(/```(?:json)?/g, '').trim());
    if (c && typeof c.name === 'string') {
      calls.push({ name: c.name, arguments: c.arguments ?? c.run ?? {} });
    }
  } catch (e) {
    if (finished) console.warn('[Agent] Invalid tool-call JSON:', e);   // partial JSON mid-stream is normal
  }
  return '';
});

// 1. Custom JSON protocol: <tool_call>{"name":...}</tool_call>
  body = body.replace(/<tool_call>\s*([\s\S]*?)\s*(?:<\/tool_call>|$)/g, (_, json) => {
    try {
      const c = JSON.parse(json.replace(/```(?:json)?/g, '').trim());
      if (c && typeof c.name === 'string') {
        calls.push({ name: c.name, arguments: c.arguments ?? c.run ?? {} });
      }
    } catch (e) {
      if (finished) console.warn('[Agent] Invalid tool-call JSON:', e);
    }
    return '';
  });

  // 2. Gemma 4 native protocol: <|tool_call>call:name{key:"val"}<tool_call|>
  body = body.replace(/<\|tool_call>\s*call:([a-zA-Z0-9_]+)\s*(\{[\s\S]*?\})\s*(?:<tool_call\|>|$)/g, (_, name, rawArgs) => {
    try {
      calls.push({ name, arguments: parseGemmaArgs(rawArgs) });
    } catch (e) {
      if (finished) console.warn('[Agent] Invalid Gemma tool-call args:', rawArgs, e);
    }
    return '';
  });

  // Hide unfinished tool calls (either format) while streaming
  const openCall = body.search(/<\|?tool_call>/);
  if (openCall >= 0) body = body.slice(0, openCall);

  // If no answer channel has arrived yet, don't emit thinking as an answer.
  if (thinkingOn && thinking && !body.trim() && !finished) {
    phase = 'thinking';
  }

  return { thinking, answer: body.trim(), calls, phase };
}

function parseGemmaArgs(rawArgs) {
  const s = rawArgs.replace(/<\|"\|>/g, '"').trim();
  try { return JSON.parse(s); } catch (_) {}
  // Quote unquoted keys (e.g. {keyword:"..."}) without touching colons inside strings
  const fixed = s.replace(
    /"(?:\\.|[^"\\])*"|([{,]\s*)([a-zA-Z_]\w*)\s*:/g,
    (m, sep, key) => (key ? `${sep}"${key}":` : m)
  );
  return JSON.parse(fixed);
}


function extractSteps(thinking) {
  const rules = [
    [/\b(user|they)\b.*\b(want|ask|need|request)/i, "Understanding the request"],
    [/\b(wait|hmm|double.?check|verify|make sure)/i, "Double-checking"],
    [/\b(structure|format|outline|organi[sz]e)/i, "Structuring the answer"],
    [/\b(draft|write|compose)/i, "Drafting the response"],
    [/\b(tool|function|call|search|create)/i, "Choosing an action"],
  ];
  return thinking.split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map((text, i) => {
    const hit = rules.find(([re]) => re.test(text.slice(0, 200)));
    const first = (text.match(/^[^.!?\n]{8,}/) || [text])[0];
    return { id: i, title: hit ? hit[1] : first.slice(0, 57), text };
  });
}
const MAX_TOOL_ROUNDS = 4;      // max tool calls per request (one per round)
const RESULT_CHARS = 700;       // max chars of one tool result shown to the model

const clip = (s, n = RESULT_CHARS) => {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n) + '…[truncated]' : s;
};
const callKey = c => c.name + JSON.stringify(c.arguments || {});
// ───────── Prompt building ─────────

function toolsBlock(tools, continuing = false) {
  const defs = tools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters || { type: 'object', properties: {} }
  }));
  const ex = tools.find(t => t.parameters?.required?.length) || tools[0];
  const exArgs = Object.fromEntries((ex.parameters?.required || []).map(k => [k, '...']));

  const modeRules = continuing
    ? `- Call a tool only if the request still needs another action. Take its arguments from the results already shown.
- Never repeat a call you already made.`
    : `- If the user asks for something a tool can do, you MUST call that tool. Never claim an action is done without calling it.
- If the request needs several actions, call ONE tool at a time. You will see its result before choosing the next call.
- Replace the "..." in the example with real values from the user's request.`;

  return `You are Notefull AI, an assistant that can use tools. You are created by Anagh Manglick and you are trained by him.

Available tools:
${JSON.stringify(defs)}

To use a tool, reply with ONLY this block and nothing else:
<tool_call>
{"name":"<tool name>","arguments":{...}}
</tool_call>

Example:
<tool_call>
${JSON.stringify({ name: ex.name, arguments: exArgs })}
</tool_call>

Rules:
${modeRules}
- Use only the listed tool names and include every required argument.
- Never invent the contents of the user's notes. If a search finds nothing, tell the user.
- If no tool is needed, answer normally.`;
}


function buildPrompt(system, messages, tools, thinking) {
  const parts = [];
  const sys = [system, tools?.length ? toolsBlock(tools) : ''].filter(Boolean).join('\n\n');
  if (sys) parts.push('System: ' + sys);
  for (const m of messages) {
    if (m.role === 'user') parts.push('User: ' + m.content);
    else if (m.role === 'assistant') parts.push('Assistant: ' + m.content);
    else if (m.role === 'tool') parts.push(`Tool result (${m.name}): ${m.content}`);
  }
  return parts.join('\n\n');
}

// ───────── Native call ─────────
async function rawAsk(prompt, stream, onRaw, opts = {}) {
  const plugin = window.Capacitor?.Plugins?.AIPlugin;
  if (!plugin) throw new Error('Native AIPlugin is not available.');
  let l1, l2, streamErr;
  try {
    if (stream) {
      l1 = await plugin.addListener('onAiToken', d => {
        if (!d.done) onRaw?.(d.accumulated || '', d.accumulatedThought || '');
      });
      l2 = await plugin.addListener('onAiError', d => { streamErr = d?.error; });
    }
    const r = await plugin.askAI({
  prompt,
  system: opts.system || '',
  stream: !!stream,
  thinking: !!opts.thinking,
  maxTokens: opts.maxTokens || 0,
  thinkBudget: opts.thinkBudget || 0
});
    if (streamErr) throw new Error(streamErr);
    return { response: r?.response ?? '', thinking: r?.thinking ?? '' };
  } finally {
    try { await l1?.remove(); } catch (_) {}
    try { await l2?.remove(); } catch (_) {}
  }
}

async function runTool(tool, call) {
  if (!tool) return { ok: false, content: `Error: unknown tool "${call.name}".` };
  if (typeof tool.run !== 'function') return { ok: false, content: `Error: tool "${call.name}" has no run function.` };

  const args = call.arguments && typeof call.arguments === 'object' ? call.arguments : {};
  const missing = (tool.parameters?.required || []).filter(k => args[k] === undefined || args[k] === '');
  if (missing.length) return { ok: false, content: `Error: missing required argument(s): ${missing.join(', ')}` };

  try {
    const value = await Promise.race([
      tool.run(args),
      new Promise((_, rej) => setTimeout(() => rej(new Error('tool timed out')), tool.timeoutMs || 15000))
    ]);
    return { ok: true, value, content: typeof value === 'string' ? value : JSON.stringify(value ?? { ok: true }) };
  } catch (e) {
    return { ok: false, content: 'Error: ' + (e?.message || e) };
  }
}

// The prompt for the step AFTER a tool ran: framed as a continuation, and no tools are offered
// Every round after the first: a continuation with a progress log
function progressPrompt(executed, canCallMore) {
  const last = executed[executed.length - 1];
  const tail = canCallMore
    ? `If another tool is needed, call it now. Otherwise reply to the user in plain text.`
    : `All actions are finished. Reply briefly in plain text based on the results. Do not write <tool_call>.`;

  return `Tool result (${last.name}): ${last.shown}\n\n${tail}`;
}

// ───────── Public API (backward compatible) ─────────
async function askAI(prompt, {
  stream = false,
  thinking = false,
  maxTokens = thinking ? 1400 : 600,
  thinkBudget = thinking ? 384 : 0,
  tools = false,
  system = '',
  history = [],
  maxRounds = MAX_TOOL_ROUNDS,
  onToken = null, onDone = null, onError = null, onThinking = null, onStep = null
} = {}) {
  const userText = toPlain(prompt);
  const toolList = Array.isArray(tools) && tools.length ? tools : null;
  const rounds = toolList ? maxRounds : 0;
  const executed = [];
  const seen = new Set();
  let last = { thinking: '', answer: '' };
  let forceFinal = false;
  let stepId = 0;
const fullSystem = [system, toolList ? toolsBlock(toolList) : ''].filter(Boolean).join('\n\n');
  try {
    for (let round = 0; round <= rounds; round++) {
      const first = round === 0;
      const canCallMore = !!toolList && round < rounds && !forceFinal;
      const stepThinking = first ? thinking : false;          // only the first round thinks
const promptText = first
  ? userText
  : progressPrompt(executed, canCallMore);
      let sentLen = 0;

      const out = await rawAsk(promptText, stream, (acc, thought) => {
        const p = parseOutput(hideTail(acc), stepThinking, false);
        const th = thought || p.thinking;
        if (th) onThinking?.(th, extractSteps(th));
        if (p.phase === 'answer' && p.answer.length > sentLen) {
          onToken?.(p.answer.slice(sentLen), p.answer);
          sentLen = p.answer.length;
        }
      }, {
  system: fullSystem,
  thinking: stepThinking,
  maxTokens: first ? maxTokens : (canCallMore ? 450 : 300),
  thinkBudget: stepThinking ? thinkBudget : 0
});

      const p = parseOutput(out.response, stepThinking, true);
      if (out.thinking) p.thinking = out.thinking;
      console.log(`[Agent] round ${round} raw:`, JSON.stringify(out.response), '| calls:', JSON.stringify(p.calls));
      if (toolList && !p.calls.length && /tool_call|call:/i.test(out.response)) {
        console.warn('[Agent] Output mentions a tool call but none was parsed:', out.response);
      }
      last = { ...p, thinking: p.thinking || last.thinking };

      if (!stream) {
        if (p.thinking) onThinking?.(p.thinking, extractSteps(p.thinking));
        if (p.answer) onToken?.(p.answer, p.answer);
      }

      // No tool call, or tools are no longer allowed: this is the final answer
      if (!p.calls.length || !canCallMore) break;

      // One call per round: the next call may depend on this one's result
      const call = p.calls.find(c => !seen.has(callKey(c)));
      if (!call) { forceFinal = true; continue; }             // model is repeating itself: make it wrap up
      seen.add(callKey(call));

      const tool = toolList.find(t => t.name === call.name);
      const label = tool?.label || call.name;
      const id = ++stepId;
      onStep?.({ id, type: 'tool', label, status: 'running' });

      const res = await runTool(tool, call);
      onStep?.({ id, type: 'tool', label, status: res.ok ? 'done' : 'error' });
      executed.push({ name: call.name, args: call.arguments || {}, ok: res.ok, shown: clip(res.content) });

      // A tool with a canned reply ENDS the request without another model call
      if (res.ok && typeof tool.reply === 'function') {
        last = { ...last, answer: tool.reply(res.value, call.arguments) };
        onToken?.(last.answer, last.answer);
        break;
      }
    }

    let answer = last.answer;
    if (!answer && executed.length) {                          // say what happened instead of a dead end
      answer = executed.map(e => {
        const label = toolList.find(t => t.name === e.name)?.label || e.name;
        return e.ok ? `✓ ${label}` : `Couldn't run ${label}: ${e.shown}`;
      }).join('\n');
    }

    onDone?.(answer, { thinking: last.thinking, steps: extractSteps(last.thinking || '') });
    return answer;
  } catch (e) {
    onError?.(e?.message || String(e));
    throw e;
  }
} 


const STAGE_LABELS = {
  connecting: 'Connecting to server…',
  downloading: 'Installing Notefull AI ',
  verifying: 'Verifying file…',
  complete: 'AI Ready!',
  paused: 'Download Paused',
  retrying: 'Retrying Download',
  waiting_network: 'Waiting for network..',
  error: 'Download failed'
};


let downloadListener = null;

// ============================================================
// AI DOWNLOAD & BENCHMARK ORCHESTRATION
// ============================================================

async function startDownload() {
  if (isDownloading) return;

  const pill = document.getElementById('aiDownloadPill');
  const pillText = document.getElementById('aiDownloadPillText');
  const AIPlugin = window.Capacitor?.Plugins?.AIPlugin;

  if (!AIPlugin) {
    if (typeof safeToastError === 'function') safeToastError('AI Plugin unavailable');
    return;
  }

  isDownloading = true;
  await installAIModuleStage();
  if (pill) pill.classList.remove('hidden');
  if (pillText) pillText.textContent = 'Downloading AI: 0%';

  let benchmarkStarted = false;
const preference = localStorage.getItem("AI-prefrence");

  // If user disabled AI, bypass and shut off downloader
  if (preference === "disbale-ai" || localStorage.getItem("DisbalkeAIAuto") === "true") {
    console.log("[AI Downloader] AI is disabled by user preference.");
    if (pill) pill.classList.add('hidden');
    return;
  }

  // 2. Resolve target URL based on preference
  let downloadUrl = 0;
  if (preference === "full") {
    // Advanced Thinking Model (e.g. Qwen3-4B LiteRT)
    //downloadUrl = "https://huggingface.co/litert-community/Qwen3-4B/resolve/main/qwen3_4b_mixed_int4.litertlm?download=true";
 downloadUrl = "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm?download=true";
  } else {
    // Default to Lite Model (Qwen 2.5 3B / Qwen3-1.7B)
    downloadUrl = "https://huggingface.co/mlboydaisuke/Qwen2.5-3B-Instruct-LiteRT/resolve/main/model.litertlm?download=true";
  }

  if (!downloadUrl || downloadUrl === 0) {
    if (pill) pill.classList.add('hidden');
    return;
  }
  const triggerBenchmarkOnce = async () => {
    if (benchmarkStarted) return;
    benchmarkStarted = true;
    isDownloading = false;

    // Detach download listener
    if (downloadListener) {
      try { await downloadListener.remove(); } catch (_) {}
      downloadListener = null;
    }

    // Pass control to the benchmark optimizer
    
      await runAiBenchmark();
   };

  try {
    let nativePath = null;
    if (preference === "lite") {
     nativePath = await getModelNativePath();
    } else if (preference === "full") {
       nativePath = await getModelNativePathFull();
    } else {
      showToastError('Unexpected Error occured while downloading model');
      return;
    }
      
    // Clear stale listener
    if (downloadListener) {
      try { await downloadListener.remove(); } catch (_) {}
      downloadListener = null;
    }

    // 1. Listen for true progress updates from native downloader
    downloadListener = await AIPlugin.addListener('downloadProgress', async (data) => {
      const stage = data?.stage;
      const downloaded = Number(data?.downloaded) || 0;
      const total = Number(data?.total) || 0;

      if (stage === 'downloading' && total > 0) {
        const pct = Math.min(100, Math.round((downloaded / total) * 100));
        if (pillText) pillText.textContent = `Downloading AI: ${pct}%`;

        // Only trigger once all bytes have actually landed on disk
        if (pct >= 100 && downloaded >= total) {
          await triggerBenchmarkOnce();
        }
      } else if (stage === 'complete') {
        if (pillText) pillText.textContent = 'Downloading AI: 100%';
        await triggerBenchmarkOnce();
      } else if (stage === 'error') {
        if (pill) pill.classList.add('hidden');
        if (downloadListener) {
          try { await downloadListener.remove(); } catch (_) {}
          downloadListener = null;
        }
        isDownloading = false;
        if (typeof safeToastError === 'function') {
          safeToastError('Download failed. Please check your network.');
        }
      }
    });

    // 2. Kicks off background task in Java
    await AIPlugin.downloadAssets({
      url: downloadUrl,
      path: nativePath
    });

    // Native download runs in background; waiting for stage 'complete' or 100% bytes

  } catch (err) {
    isDownloading = false;
    if (pill) pill.classList.add('hidden');
    if (downloadListener) {
      try { await downloadListener.remove(); } catch (_) {}
      downloadListener = null;
    }
    console.error('[AI Download] Error:', err);
    if (typeof safeToastError === 'function') {
      safeToastError('Could not start download: ' + err.message);
    }
  }
}


async function installAIModuleStage() {
  showToastWarn('Please do not close Notefull while AI is installing!')
    const pill = document.getElementById('aiDownloadPill');
    const pillText = document.getElementById('aiDownloadPillText');
    const AIPlugin = window.Capacitor?.Plugins?.AIPlugin;

    if (!pill || !pillText || !AIPlugin) {
        throw new Error('AI download interface or plugin unavailable');
    }

    pill.classList.remove('hidden');
    pillText.textContent = 'Preparing AI components...';

    let listener;
    let timeout;

    try {
        return await new Promise(async (resolve, reject) => {
            let settled = false;

            const finish = (error, value) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);

                if (error) reject(error);
                else resolve(value);
            };

            listener = await AIPlugin.addListener(
                'moduleDownloadProgress',
                (data) => {
                    if (data?.status === 'downloading') {
                        const current = Number(data.downloaded) || 0;
                        const total = Number(data.total) || 0;
                        const percent = total > 0
                            ? Math.min(100, Math.round(current / total * 100))
                            : 0;

                        pillText.textContent =
                            `Downloading components: ${percent}%`;
                    }

                    if (data?.status === 'installing') {
                        pillText.textContent = 'Installing AI components...';
                    }

                    if (data?.status === 'installed') {
                        pillText.textContent = 'Stage 1 Complete ✓';
                        finish(null, true);
                    }

                    if (data?.status === 'failed') {
                        finish(new Error(
                            `Module installation failed (${data.errorCode})`
                        ));
                    }
                }
            );

            timeout = setTimeout(() => {
                finish(new Error('AI module installation timed out'));
            }, 180000);

            try {
                const result = await AIPlugin.installAIModule();

                if (result?.status === 'already_installed') {
                    pillText.textContent = 'Stage 1 Complete ✓';
                    finish(null, true);
                }
            } catch (error) {
                finish(error);
            }
        });
    } finally {
        if (listener) {
            await listener.remove().catch(() => {});
        }
    }
}


// ============================================================
// BENCHMARK MODAL & PERSISTENCE
// ============================================================

async function runAiBenchmark() {
  const pill = document.getElementById('aiDownloadPill');
  const pillText = document.getElementById('aiDownloadPillText');
  const AIPlugin = window.Capacitor?.Plugins?.AIPlugin;

  if (!AIPlugin) return;

  if (pill) pill.classList.remove('hidden');
  if (pillText) pillText.textContent = 'Optimizing AI: 0%';

  let benchmarkListener = null;

  try {
    // Listen for simple 0-100% updates
    benchmarkListener = await AIPlugin.addListener('benchmarkProgress', (data) => {
      const pct = Math.min(100, Math.max(0, Math.round(Number(data.percent) || 0)));
      if (pillText) {
        pillText.textContent = `Optimizing AI: ${pct}%`;
      }
    });

 const preference = localStorage.getItem("AI-prefrence");
    let nativePath = null;
    if (preference === "lite") {
     nativePath = await getModelNativePath();
    } else if (preference === "full") {
       nativePath = await getModelNativePathFull();
    } else {
      showToastError('Unexpected Error occured while loading AI');
      return;
    }
    const result = await AIPlugin.testAiBackends({ modelPath: nativePath });

    // Store optimal backend configuration
    await localforage.setItem('notefull_ai_backend', {
      backend: result.bestBackend,
      benchmarkMs: result.benchmarkMs,
      timestamp: Date.now()
    });

    // Complete state
    if (pillText) pillText.textContent = 'AI Ready';
    setTimeout(() => {
      if (pill) pill.classList.add('hidden');
    }, 1500);

  } catch (err) {
    console.error('Optimization error:', err);
    if (pill) pill.classList.add('hidden');
  } finally {
    if (benchmarkListener) {
      try { await benchmarkListener.remove(); } catch (_) {}
      benchmarkListener = null;
    }
  }
}

async function finishAiSetup() {
  const pill = document.getElementById('aiDownloadPill');
pill.classList.add('hidden');
}

// ============================================================
// INITIALIZE AI USING PERSISTED BACKEND
// ============================================================

async function initAi(backend) {
  const statusText = document.getElementById('ai-status-text');
  const modal = document.getElementById('model-progress-modal');

  const filesReady = await manageModels();
  if (!filesReady) { 
    showToastError('AI not ready! Aborting... Please Download AI first'); 
    return null;
  } else { 

showToast('Notefull AI initlizing.... It may take a few moments');
  if (modal) modal.classList.remove('hidden');
  if (statusText) statusText.textContent = 'Warming up AI...';

  try {
    const AIPlugin = window.Capacitor?.Plugins?.AIPlugin;
    const preference = localStorage.getItem("AI-prefrence");
    let nativePath = null;
    if (preference === "lite") {
     nativePath = await getModelNativePath();
    } else if (preference === "full") {
       nativePath = await getModelNativePathFull();
    } else {
      showToastError('Unexpected Error occured while loading AI');
      return;
    }


const saved = await localforage.getItem('notefull_ai_backend');
let choosenBackend = null;
if (!saved || !saved.backend) {
  const userAsk = await showConfirmToast({
    title: 'Benchmark Interrupted',
    message: 'We have detected that the benchmark sequence was interrupted. AI may be slower on the default CPU backend.',
    btn1txt: 'Proceed with CPU',
    btn2txt: 'Switch to GPU'
  });

  choosenBackend = userAsk ? 'cpu' : 'gpu';

} else if (backend === 'cpu' || backend === 'gpu') {
  choosenBackend = backend;

} else if (!backend) {
  choosenBackend = saved.backend;

} else {
  showToastError('Failed to load AI: Invalid backend');
  return null;
}

 const devInfo = await AIPlugin.getDeviceInfo().catch(() => ({ ramGB: 4 }));
const ctxSize = (devInfo.ramGB || 0) >= 6.7 ? 4096 : 2048;

await AIPlugin.initAI({
  modelPath: nativePath,
  backend: choosenBackend,
  ctx: ctxSize
});

    window.aiReady = true;
    if (statusText) statusText.textContent = `AI Ready (${choosenBackend.toUpperCase()})`;
    setTimeout(() => { if (modal) modal.classList.add('hidden'); }, 1200);
    safeToast(`AI Initialized using ${choosenBackend.toUpperCase()}`);
    return true;

  } catch (err) {
    if (statusText) statusText.textContent = 'Failed to load AI';
    if (modal) modal.classList.add('hidden');
    console.error('[AI] Init Error:', err);
    return null;
  }
}
}

async function checkPermission() {
  try {
    const permission = await notifications.checkPermissions();
    const statusEl = document.getElementById('notificationStatus');
    if (permission.display !== 'granted') {
      if (statusEl) {
        statusEl.innerHTML = "Permission is not granted!";
        statusEl.style.color = "red";
      }
      return false;
    } else {
      if (statusEl) {
        statusEl.innerHTML = "Permission is granted!";
        statusEl.style.color = "green";
      }
      return true;
    }
  } catch (e) {
    return false;
  }
} 

async function getModelNativePath() {
  const relPath = 'models/notefull-ai-lite.litertlm';

  try {
    await Filesystem.mkdir({
      directory: 'DATA',
      path: 'models',
      recursive: true
    });
  } catch (e) {
    // Directory already exists
  }

  try {
    const baseUri = await Filesystem.getUri({ directory: 'DATA', path: '' });
    const basePath = baseUri.uri.replace("file://", "").replace(/\/$/, "");
    return basePath + '/' + relPath;
  } catch (err) {
    const uri = await Filesystem.getUri({ directory: 'DATA', path: 'models' });
    return uri.uri.replace("file://", "").replace(/\/$/, "") + '/notefull-ai-lite.litertlm';
  }
}

async function getModelNativePathFull() {
  const relPath = 'models/notefull-ai-full.litertlm';

  try {
    await Filesystem.mkdir({
      directory: 'DATA',
      path: 'models',
      recursive: true
    });
  } catch (e) {
    // Directory already exists
  }

  try {
    const baseUri = await Filesystem.getUri({ directory: 'DATA', path: '' });
    const basePath = baseUri.uri.replace("file://", "").replace(/\/$/, "");
    return basePath + '/' + relPath;
  } catch (err) {
    const uri = await Filesystem.getUri({ directory: 'DATA', path: 'models' });
    return uri.uri.replace("file://", "").replace(/\/$/, "") + '/notefull-ai-full.litertlm';
  }
}