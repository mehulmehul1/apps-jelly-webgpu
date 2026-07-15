import type { PresetId } from '../jellyfish/creatures';
import { PRESETS } from '../jellyfish/creatures';

export interface CreatureSelectMenuOptions {
  initial: PresetId;
  onSelect: (id: PresetId) => void;
  onMutate?: () => void;
  onRandomize?: () => void;
}

/**
 * Maps archetype ids to human-readable group labels shown in the optgroup.
 */
const ARCHETYPE_LABELS: Record<string, string> = {
  jellyfish: 'Jellyfish',
  fish: 'Fish',
  anemone: 'Anemone',
};

/** Group preset IDs by their archetype, preserving insertion order. */
function groupByArchetype(): { archetype: string; presets: PresetId[] }[] {
  const groups = new Map<string, PresetId[]>();

  for (const id of Object.keys(PRESETS) as PresetId[]) {
    const preset = PRESETS[id];
    const archetype = preset.spec.archetypeId;
    if (!groups.has(archetype)) {
      groups.set(archetype, []);
    }
    groups.get(archetype)!.push(id);
  }

  return Array.from(groups.entries()).map(([archetype, presets]) => ({
    archetype,
    presets,
  }));
}

export class CreatureSelectMenu {
  private root: HTMLDivElement;
  private select: HTMLSelectElement;
  private onSelect: (id: PresetId) => void;
  private onChange: () => void;
  private mutateBtn?: HTMLButtonElement;
  private randomBtn?: HTMLButtonElement;
  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(options: CreatureSelectMenuOptions) {
    this.onSelect = options.onSelect;

    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1002;
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: #ffffff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      user-select: none;
    `;

    const label = document.createElement('span');
    label.textContent = 'Creature';
    label.style.opacity = '0.9';
    this.root.appendChild(label);

    this.select = document.createElement('select');
    this.select.style.cssText = `
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(10, 10, 20, 0.65);
      color: #ffffff;
      padding: 6px 26px 6px 10px;
      border-radius: 8px;
      outline: none;
      cursor: pointer;
      letter-spacing: 0.2px;
      min-width: 160px;
    `;

    // Build groups of presets by archetype
    const groups = groupByArchetype();

    for (const group of groups) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = ARCHETYPE_LABELS[group.archetype] ?? group.archetype;

      for (const id of group.presets) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = PRESETS[id].name;
        optgroup.appendChild(opt);
      }

      this.select.appendChild(optgroup);
    }

    this.select.value = options.initial;

    // Add a small chevron
    const chevron = document.createElement('span');
    chevron.textContent = '▾';
    chevron.style.cssText = `
      margin-left: -22px;
      pointer-events: none;
      opacity: 0.85;
    `;

    this.root.appendChild(this.select);
    this.root.appendChild(chevron);

    const mkButton = (labelText: string) => {
      const btn = document.createElement('button');
      btn.textContent = labelText;
      btn.style.cssText = `
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255, 255, 255, 0.06);
        color: #ffffff;
        padding: 6px 10px;
        border-radius: 8px;
        cursor: pointer;
        font: inherit;
        letter-spacing: 0.2px;
      `;
      btn.addEventListener('mouseenter', () => (btn.style.background = 'rgba(255,255,255,0.1)'));
      btn.addEventListener('mouseleave', () => (btn.style.background = 'rgba(255,255,255,0.06)'));
      return btn;
    };

    if (options.onMutate) {
      this.mutateBtn = mkButton('Mutate (M)');
      this.mutateBtn.addEventListener('click', () => options.onMutate?.());
      this.root.appendChild(this.mutateBtn);
    }

    if (options.onRandomize) {
      this.randomBtn = mkButton('Random (R)');
      this.randomBtn.addEventListener('click', () => options.onRandomize?.());
      this.root.appendChild(this.randomBtn);
    }

    document.body.appendChild(this.root);

    this.onChange = () => {
      const next = (this.select.value as PresetId) || options.initial;
      this.onSelect(next);
    };
    this.select.addEventListener('change', this.onChange);

    this.keyHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'm' && options.onMutate) options.onMutate();
      if (key === 'r' && options.onRandomize) options.onRandomize();
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  setValue(id: PresetId): void {
    this.select.value = id;
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'flex' : 'none';
  }

  dispose(): void {
    this.select.removeEventListener('change', this.onChange);
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.root.remove();
  }
}

export default CreatureSelectMenu;
