import { Pane } from 'tweakpane';
import type { LookConfig } from './look-presets';
import { applyLookPreset } from './look-presets';

export interface JellyfishLookEditorOptions {
  title?: string;
  startHidden?: boolean;
  onChange: (config: LookConfig) => void;
}

export class JellyfishLookEditor {
  private pane: Pane;
  private config: LookConfig;
  private onChange: (config: LookConfig) => void;
  private fileInput: HTMLInputElement;
  private isHidden: boolean;
  private keyHandler: (event: KeyboardEvent) => void;

  constructor(config: LookConfig, options: JellyfishLookEditorOptions) {
    this.config = config;
    this.onChange = options.onChange;
    this.isHidden = options.startHidden ?? false;

    this.pane = new Pane({
      title: options.title ?? 'Jellyfish Look',
      expanded: true,
    });
    this.pane.element.style.position = 'fixed';
    this.pane.element.style.top = '10px';
    this.pane.element.style.right = '10px';
    this.pane.element.style.zIndex = '1001';

    this.fileInput = this.createFileInput();
    this.buildPane();

    this.keyHandler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'h') {
        this.toggle();
      }
    };

    window.addEventListener('keydown', this.keyHandler);

    if (this.isHidden) {
      this.setHidden(true);
    }
  }

  private createFileInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async (event) => {
      const target = event.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) {
        return;
      }
      const file = target.files[0];
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        applyLookPreset(this.config, parsed);
        this.pane.refresh();
        this.onChange(this.config);
      } catch (error) {
        console.warn('[LookEditor] Failed to load preset:', error);
      } finally {
        target.value = '';
      }
    });
    return input;
  }

  private buildPane(): void {
    this.pane.on('change', () => {
      this.onChange(this.config);
    });

    const sceneFolder = this.pane.addFolder({ title: 'Scene' });
    sceneFolder.addBinding(this.config.scene, 'background', { view: 'color' });

    const cameraFolder = this.pane.addFolder({ title: 'Camera' });
    cameraFolder.addBinding(this.config.camera, 'distance', { min: 40, max: 240, step: 1 });
    cameraFolder.addBinding(this.config.camera, 'autoRotateSpeed', { min: 0, max: 0.02, step: 0.0005 });

    const pulseFolder = this.pane.addFolder({ title: 'Pulse' });
    pulseFolder.addBinding(this.config.pulse, 'speed', { min: 0.2, max: 3.0, step: 0.05 });
    pulseFolder.addBinding(this.config.pulse, 'amplitude', { min: 0, max: 0.4, step: 0.01 });

    const bulbFolder = this.pane.addFolder({ title: 'Bulb' });
    bulbFolder.addBinding(this.config.bulb, 'colorA', { view: 'color' });
    bulbFolder.addBinding(this.config.bulb, 'colorB', { view: 'color' });
    bulbFolder.addBinding(this.config.bulb, 'opacity', { min: 0, max: 1, step: 0.01 });
    bulbFolder.addBinding(this.config.bulb, 'patternScale0', { min: 0.5, max: 2.5, step: 0.01 });
    bulbFolder.addBinding(this.config.bulb, 'patternScale1', { min: 0.5, max: 2.5, step: 0.01 });
    bulbFolder.addBinding(this.config.bulb, 'rimBoost', { min: 0.1, max: 3.0, step: 0.05 });

    const gelFolder = this.pane.addFolder({ title: 'Gel' });
    gelFolder.addBinding(this.config.gel, 'color', { view: 'color' });
    gelFolder.addBinding(this.config.gel, 'opacity', { min: 0, max: 1, step: 0.01 });

    const tailFolder = this.pane.addFolder({ title: 'Tail' });
    tailFolder.addBinding(this.config.tail, 'colorA', { view: 'color' });
    tailFolder.addBinding(this.config.tail, 'colorB', { view: 'color' });
    tailFolder.addBinding(this.config.tail, 'opacity', { min: 0, max: 1, step: 0.01 });
    tailFolder.addBinding(this.config.tail, 'scale', { min: 0.5, max: 10.0, step: 0.1 });

    const mouthFolder = this.pane.addFolder({ title: 'Mouth' });
    mouthFolder.addBinding(this.config.mouth, 'colorA', { view: 'color' });
    mouthFolder.addBinding(this.config.mouth, 'colorB', { view: 'color' });
    mouthFolder.addBinding(this.config.mouth, 'opacity', { min: 0, max: 1, step: 0.01 });
    mouthFolder.addBinding(this.config.mouth, 'scale', { min: 0.5, max: 10.0, step: 0.1 });

    const tentacleFolder = this.pane.addFolder({ title: 'Tentacles' });
    tentacleFolder.addBinding(this.config.tentacle, 'color', { view: 'color' });
    tentacleFolder.addBinding(this.config.tentacle, 'opacity', { min: 0, max: 1, step: 0.01 });
    tentacleFolder.addBinding(this.config.tentacle, 'area', { min: 500, max: 6000, step: 50 });

    const dustFolder = this.pane.addFolder({ title: 'Dust' });
    dustFolder.addBinding(this.config.dust, 'color', { view: 'color' });
    dustFolder.addBinding(this.config.dust, 'opacity', { min: 0, max: 1, step: 0.01 });
    dustFolder.addBinding(this.config.dust, 'size', { min: 1, max: 64, step: 1 });
    dustFolder.addBinding(this.config.dust, 'scale', { min: 50, max: 300, step: 5 });
    dustFolder.addBinding(this.config.dust, 'area', { min: 100, max: 600, step: 10 });
    dustFolder.addBinding(this.config.dust, 'count', { min: 1000, max: 20000, step: 500 });

    const postFolder = this.pane.addFolder({ title: 'Post' });
    postFolder.addBinding(this.config.post, 'bloomStrength', { min: 0, max: 2.0, step: 0.05 });
    postFolder.addBinding(this.config.post, 'bloomRadius', { min: 1, max: 60, step: 1 });
    postFolder.addBinding(this.config.post, 'bloomThreshold', { min: 0, max: 1.0, step: 0.01 });
    postFolder.addBinding(this.config.post, 'lensDirtOpacity', { min: 0, max: 1.0, step: 0.01 });
    postFolder.addBinding(this.config.post, 'lensDirtFadeRate', { min: 0.9, max: 0.999, step: 0.001 });
    postFolder.addBinding(this.config.post, 'lensDirtSpawnSpread', { min: 0.05, max: 1.0, step: 0.05 });
    postFolder.addBinding(this.config.post, 'lensDirtMaxScale', { min: 0.05, max: 0.5, step: 0.01 });
    postFolder.addBinding(this.config.post, 'vignetteDarkness', { min: 0, max: 1.0, step: 0.01 });
    postFolder.addBinding(this.config.post, 'vignetteOffset', { min: 0.5, max: 2.5, step: 0.05 });
    postFolder.addBinding(this.config.post, 'vignetteColor', { view: 'color' });

    const presetFolder = this.pane.addFolder({ title: 'Presets' });
    presetFolder.addButton({ title: 'Save preset JSON' }).on('click', () => {
      this.downloadPreset();
    });
    presetFolder.addButton({ title: 'Load preset JSON' }).on('click', () => {
      this.fileInput.click();
    });
    presetFolder.addButton({ title: 'Toggle UI (H)' }).on('click', () => {
      this.toggle();
    });
  }

  private downloadPreset(): void {
    const json = JSON.stringify(this.config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'jellyfish-look.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  public toggle(): void {
    this.setHidden(!this.isHidden);
  }

  public setHidden(hidden: boolean): void {
    this.isHidden = hidden;
    this.pane.element.style.display = hidden ? 'none' : 'block';
  }

  public refresh(): void {
    // Tweakpane versions/types can drift; refresh exists at runtime.
    (this.pane as any).refresh?.();
  }

  public dispose(): void {
    this.pane.dispose();
    this.fileInput.remove();
    window.removeEventListener('keydown', this.keyHandler);
  }
}

export default JellyfishLookEditor;
