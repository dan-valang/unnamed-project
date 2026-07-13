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
  return `${unbought} goblin${unbought === 1 ? '' : 's'} left to catch.`;
}

async function generateShoppingItems(goal: string, spice: number): Promise<ShoppingItem[]> {
  const prompt = `You are a shopping list assistant. Break down this goal into a shopping list: "${goal}"

Spiciness level: ${spice}/5. Higher spiciness means more creative, unusual, or detailed items.

Return ONLY valid JSON with this exact shape, no markdown, no explanation:
{
  "items": [
    { "name": "item name", "quantity": "short quantity", "section": "Produce|Dairy|Meat|Pantry|Frozen|Household|Other" }
  ]
}`;

  const response = await puter.ai.chat(prompt, { model: 'gpt-5-nano', temperature: 0.2 });
  const text = typeof response === 'string' ? response : response.message?.content ?? '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.items || !Array.isArray(parsed.items)) throw new Error('Missing items array');

  return parsed.items.map((raw: Record<string, unknown>) => ({
    id: createId(),
    name: String(raw.name ?? '').trim(),
    quantity: String(raw.quantity ?? '').trim(),
    section: normalizeSection(String(raw.section ?? 'Other')),
    bought: false,
  }));
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
  goblinBtn.textContent = 'Goblin thinking...';
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
    <h1>Buy Later Goblin</h1>
    <p class="helper">Type a vague shopping goal, choose spiciness, and get an editable grouped shopping checklist.</p>
    <div class="controls">
      <div class="input-row">
        <input id="goal" type="text" placeholder="e.g. taco night, camping breakfast..." autocomplete="off" />
        <button id="add-btn">Add</button>
      </div>
      <div class="spice-row">
        <label>
          Spiciness: <strong id="spice-label">3</strong> 🌶️
          <input id="spice" type="range" min="1" max="5" value="3" />
        </label>
        <button id="goblin-btn">Goblin it</button>
      </div>
    </div>
    <div class="count">${countText()}</div>
  `;

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
          <button class="danger delete-btn">✕</button>
        </div>
      `;
    }
    html += `</div>`;
  }

  if (items.some((i) => i.bought)) {
    html += `<div class="clear-row"><button id="clear-btn" class="secondary">Clear bought</button></div>`;
  }

  html += `<div class="status" id="status"></div>`;

  app.innerHTML = html;

  document.querySelector<HTMLButtonElement>('#add-btn')?.addEventListener('click', addManualItem);
  document.querySelector<HTMLInputElement>('#goal')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addManualItem();
  });
  document.querySelector<HTMLButtonElement>('#clear-btn')?.addEventListener('click', clearBought);
  document.querySelector<HTMLButtonElement>('#goblin-btn')?.addEventListener('click', handleGoblinIt);

  document.querySelector<HTMLInputElement>('#spice')?.addEventListener('input', () => {
    const spice = document.querySelector<HTMLInputElement>('#spice');
    const label = document.querySelector<HTMLSpanElement>('#spice-label');
    if (spice && label) label.textContent = spice.value;
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
