import './style.css';

type Section = 'Produce' | 'Dairy' | 'Meat' | 'Pantry' | 'Frozen' | 'Household' | 'Other';

type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  section: Section;
  bought: boolean;
};

const STORAGE_KEY = 'buy-later-goblin-items';
const SECTIONS: readonly Section[] = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Household', 'Other'] as const;

let items: ShoppingItem[] = loadItems();

function createId(): string {
  return crypto.randomUUID();
}

function loadItems(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i: unknown): i is ShoppingItem =>
        typeof i === 'object' && i !== null &&
        typeof (i as ShoppingItem).id === 'string' &&
        typeof (i as ShoppingItem).name === 'string'
    );
  } catch {
    return [];
  }
}

function saveItems(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function normalizeSection(value: string): Section {
  const s = SECTIONS.find((sec) => sec.toLowerCase() === value.toLowerCase());
  return s ?? 'Other';
}

function addManualItem(): void {
  const input = document.querySelector<HTMLInputElement>('#goal');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  items.push({
    id: createId(),
    name,
    quantity: '',
    section: 'Other',
    bought: false,
  });
  input.value = '';
  saveItems();
  render();
}

function updateItem(id: string, patch: Partial<ShoppingItem>): void {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], ...patch };
  saveItems();
  render();
}

function deleteItem(id: string): void {
  items = items.filter((i) => i.id !== id);
  saveItems();
  render();
}

function clearBought(): void {
  items = items.filter((i) => !i.bought);
  saveItems();
  render();
}

function countText(): string {
  const unbought = items.filter((i) => !i.bought).length;
  if (items.length === 0) return 'No goblins yet. Add one before it escapes.';
  if (unbought === 0) return 'All goblins caught. Loot secured.';
  return `<span class="num">${unbought}</span> goblin${unbought === 1 ? '' : 's'} left to catch.`;
}

type ModelMeta = { id: string; provider: string; contextK: number; flavor: string };

// ponytail: curated free set; expand when puter adds more reliable free models
const FREE_MODELS: readonly ModelMeta[] = [
  { id: 'gpt-5-nano',  provider: 'openai',    contextK: 128, flavor: 'fast generalist' },
  { id: 'gpt-4o-mini',  provider: 'openai',    contextK: 128, flavor: 'reliable generalist' },
  { id: 'claude-sonnet-4', provider: 'anthropic', contextK: 200, flavor: 'nuanced, good at lists' },
  { id: 'gemini-2.0-flash', provider: 'google', contextK: 1000, flavor: 'long-context, fast' },
  { id: 'llama-3.3-70b', provider: 'meta',     contextK: 128, flavor: 'open-source generalist' },
  { id: 'deepseek-chat', provider: 'deepseek', contextK: 64,  flavor: 'cheap, decent reasoning' },
  { id: 'qwen-2.5-72b',  provider: 'alibaba',  contextK: 128, flavor: 'strong multilingual' },
  { id: 'mistral-large', provider: 'mistral',  contextK: 128, flavor: 'European, structured output' },
];
const JUDGE_MODEL = 'gpt-5-nano';
const FALLBACK_MODEL = 'gpt-5-nano';

async function pickModel(goal: string, spice: number): Promise<ModelMeta> {
  const catalog = FREE_MODELS.map((m) =>
    `- ${m.id} | provider=${m.provider} | context=${m.contextK}k | ${m.flavor}`
  ).join('\n');

  const prompt = `You are a routing judge. Pick the single best free model from the catalog for the task below. Reply with ONLY this JSON, no markdown:\n{"model":"<id>","reason":"<one short sentence>"}\n\nCatalog:\n${catalog}\n\nTask: shopping list for goal "${goal}", spiceness ${spice}/5.`;

  try {
    const res = await puter.ai.chat(prompt, { model: JUDGE_MODEL, temperature: 0 });
    const text = typeof res === 'string' ? res : res.message?.content ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      const found = FREE_MODELS.find((m) => m.id === parsed.model);
      if (found) {
        console.log(`[goblin-router] chose: ${found.id} (reason: ${parsed.reason ?? 'n/a'})`);
        return found;
      }
    }
  } catch (e) {
    console.warn('[goblin-router] judge failed, falling back to round-robin', e);
  }
  // ponytail: round-robin fallback when judge is down; deterministic-ish per request
  const idx = (goal.length + spice) % FREE_MODELS.length;
  const pick = FREE_MODELS[idx]!;
  console.log(`[goblin-router] judge unavailable, picked: ${pick.id} (round-robin)`);
  return pick;
}

async function generateShoppingItems(goal: string, spice: number): Promise<ShoppingItem[]> {
  const chosen = await pickModel(goal, spice);

  const systemPrompt = `You are a shopping list assistant. Break down this goal into a shopping list: "${goal}"

Spiciness level: ${spice}/5. Higher spiciness means more creative, unusual, or detailed items.

Return ONLY valid JSON with this exact shape, no markdown, no explanation:
{
  "items": [
    { "name": "item name", "quantity": "short quantity", "section": "Produce|Dairy|Meat|Pantry|Frozen|Household|Other" }
  ]
}`;

  const errors: unknown[] = [];
  for (const modelId of [chosen.id, FALLBACK_MODEL]) {
    try {
      const response = await puter.ai.chat(systemPrompt, { model: modelId, temperature: 0.2 });
      const text = typeof response === 'string' ? response : response.message?.content ?? '';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.items || !Array.isArray(parsed.items)) throw new Error('Missing items array');

      if (modelId !== chosen.id) {
        console.log(`[goblin-router] fallback to ${modelId} succeeded`);
      }

      return parsed.items.map((raw: Record<string, unknown>) => ({
        id: createId(),
        name: String(raw.name ?? '').trim(),
        quantity: String(raw.quantity ?? '').trim(),
        section: normalizeSection(String(raw.section ?? 'Other')),
        bought: false,
      }));
    } catch (e) {
      errors.push(e);
      console.warn(`[goblin-router] ${modelId} failed:`, e);
    }
  }
  throw errors[errors.length - 1] ?? new Error('All models failed');
}

async function handleGoblinIt(): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('#goal');
  const spiceInput = document.querySelector<HTMLInputElement>('#spice');
  const goblinBtn = document.querySelector<HTMLButtonElement>('#goblin-btn');
  const status = document.querySelector<HTMLDivElement>('#status');
  if (!input || !spiceInput || !goblinBtn || !status) return;

  const goal = input.value.trim();
  if (!goal) return;

  goblinBtn.disabled = true;
  goblinBtn.textContent = 'Thinking...';
  status.textContent = '';
  status.className = 'status';

  try {
    const generated = await generateShoppingItems(goal, parseInt(spiceInput.value, 10));
    items.push(...generated);
    saveItems();
    input.value = '';
    status.textContent = `The goblin found ${generated.length} thing${generated.length === 1 ? '' : 's'}.`;
    status.className = 'status success';
  } catch {
    status.textContent = 'The goblin tripped. Add items manually or try again.';
    status.className = 'status error';
  } finally {
    goblinBtn.disabled = false;
    goblinBtn.textContent = 'Goblin it';
    render();
  }
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>('#app')!;

  const grouped = new Map<Section, ShoppingItem[]>();
  for (const s of SECTIONS) grouped.set(s, []);
  for (const item of items) {
    const list = grouped.get(item.section) ?? grouped.get('Other')!;
    list.push(item);
  }

  let html = `
    <header class="header">
      <h1>Buy Later <span class="goblin">Goblin</span></h1>
      <p class="helper">type a vague goal. goblin sorts the loot.</p>
    </header>
    <div class="controls">
      <div class="input-row">
        <input id="goal" type="text" placeholder="taco night, camping breakfast, cleaning day..." autocomplete="off" />
        <button id="add-btn" class="btn-primary">Add</button>
      </div>
      <div class="spice-row">
        <span class="spice-label">Spice</span>
        <span class="spice-value" id="spice-label">3</span>
        <input id="spice" type="range" min="1" max="5" value="3" />
        <span class="spice-peppers" id="spice-peppers">🌶️🌶️🌶️</span>
        <button id="goblin-btn" class="btn-primary">Goblin it</button>
      </div>
    </div>
    <div class="status" id="status"></div>
    <div class="count">${countText()}</div>
  `;

  if (items.length === 0) {
    html += `
      <div class="empty-state">
        <div class="goblin-face">👺</div>
        <p>no goblins yet.<br>type something above and hit<br>"goblin it" or "add".</p>
      </div>
    `;
  } else {
    for (const [section, sectionItems] of grouped) {
      if (sectionItems.length === 0) continue;
      html += `<div class="section-group"><div class="section-title">${section}</div>`;
      for (const item of sectionItems) {
        const boughtClass = item.bought ? ' bought' : '';
        html += `
          <div class="item" data-id="${item.id}">
            <input type="checkbox" class="bought-cb" ${item.bought ? 'checked' : ''} />
            <input type="text" class="name${boughtClass}" value="${escapeHtml(item.name)}" />
            <input type="text" class="qty" value="${escapeHtml(item.quantity)}" placeholder="qty" />
            <select class="section-select">
              ${SECTIONS.map((s) => `<option value="${s}"${s === item.section ? ' selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="btn-danger delete-btn">✕</button>
          </div>
        `;
      }
      html += `</div>`;
    }

    if (items.some((i) => i.bought)) {
      html += `<div class="clear-row"><button id="clear-btn" class="btn-secondary">Clear bought</button></div>`;
    }
  }

  app.innerHTML = html;

  document.querySelector<HTMLButtonElement>('#add-btn')?.addEventListener('click', addManualItem);
  document.querySelector<HTMLInputElement>('#goal')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addManualItem();
  });
  document.querySelector<HTMLButtonElement>('#clear-btn')?.addEventListener('click', clearBought);
  document.querySelector<HTMLButtonElement>('#goblin-btn')?.addEventListener('click', handleGoblinIt);

  const spice = document.querySelector<HTMLInputElement>('#spice');
  spice?.addEventListener('input', () => {
    const v = spice.value;
    const label = document.querySelector<HTMLSpanElement>('#spice-label');
    const peppers = document.querySelector<HTMLSpanElement>('#spice-peppers');
    if (label) label.textContent = v;
    if (peppers) peppers.textContent = '🌶️'.repeat(parseInt(v, 10));
  });

  document.querySelectorAll<HTMLInputElement>('.bought-cb').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = cb.closest<HTMLDivElement>('.item')?.dataset.id;
      if (id) updateItem(id, { bought: cb.checked });
    });
  });

  document.querySelectorAll<HTMLInputElement>('.name').forEach((input) => {
    input.addEventListener('change', () => {
      const id = input.closest<HTMLDivElement>('.item')?.dataset.id;
      if (id) updateItem(id, { name: input.value.trim() || 'Unnamed' });
    });
  });

  document.querySelectorAll<HTMLInputElement>('.qty').forEach((input) => {
    input.addEventListener('change', () => {
      const id = input.closest<HTMLDivElement>('.item')?.dataset.id;
      if (id) updateItem(id, { quantity: input.value.trim() });
    });
  });

  document.querySelectorAll<HTMLSelectElement>('.section-select').forEach((select) => {
    select.addEventListener('change', () => {
      const id = select.closest<HTMLDivElement>('.item')?.dataset.id;
      if (id) updateItem(id, { section: normalizeSection(select.value) });
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest<HTMLDivElement>('.item')?.dataset.id;
      if (id) deleteItem(id);
    });
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

render();
