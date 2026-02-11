import type { ArchetypeId } from '../jellyfish/creatures';
import { ARCHETYPES } from '../jellyfish/creatures';

export interface CreatureSelectMenuOptions {
  initial: ArchetypeId;
  onSelect: (id: ArchetypeId) => void;
  onMutate?: () => void;
  onRandomize?: () => void;
}

export class CreatureSelectMenu {
  private root: HTMLDivElement;
  private select: HTMLSelectElement;
  private onSelect: (id: ArchetypeId) => void;
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
    `;

    // Add options
    (Object.keys(ARCHETYPES) as ArchetypeId[]).forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = ARCHETYPES[id].name;
      this.select.appendChild(opt);
    });
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
      const next = (this.select.value as ArchetypeId) || options.initial;
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

  setValue(id: ArchetypeId): void {
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
