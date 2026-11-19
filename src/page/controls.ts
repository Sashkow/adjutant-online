import { GROUP_LABELS, PARAM_SPECS, type ParamGroup, type ParamKey, type Settings } from '../effect/params';

export interface Controls {
  /** Reflect new values in the sliders without firing onChange. */
  set(settings: Settings): void;
}

const format = (value: number, step: number, unit: string) => {
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`.replace(' ×', '×');
};

/** Build one labelled slider per parameter, grouped by stage, straight from the schema. */
export function buildControls(
  container: HTMLElement,
  initial: Settings,
  onChange: (key: ParamKey, value: number) => void,
  groupNote: Partial<Record<ParamGroup, string>> = {},
): Controls {
  const inputs = new Map<ParamKey, { input: HTMLInputElement; out: HTMLOutputElement }>();
  const groups = new Map<ParamGroup, HTMLElement>();

  for (const s of PARAM_SPECS) {
    let group = groups.get(s.group);
    if (!group) {
      group = document.createElement('fieldset');
      group.className = 'param-group';
      const legend = document.createElement('legend');
      legend.textContent = GROUP_LABELS[s.group];
      group.append(legend);
      const note = groupNote[s.group];
      if (note) {
        const p = document.createElement('p');
        p.className = 'param-note';
        p.textContent = note;
        group.append(p);
      }
      groups.set(s.group, group);
      container.append(group);
    }

    const id = `param-${s.key}`;
    const row = document.createElement('div');
    row.className = 'param';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = s.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = String(s.min);
    input.max = String(s.max);
    input.step = String(s.step);
    input.value = String(initial[s.key]);
    const out = document.createElement('output');
    out.htmlFor.add(id);
    out.textContent = format(initial[s.key], s.step, s.unit);
    input.addEventListener('input', () => {
      const v = input.valueAsNumber;
      out.textContent = format(v, s.step, s.unit);
      onChange(s.key, v);
    });
    row.append(label, input, out);
    group.append(row);
    inputs.set(s.key, { input, out });
  }

  return {
    set(settings) {
      for (const s of PARAM_SPECS) {
        const el = inputs.get(s.key)!;
        el.input.value = String(settings[s.key]);
        el.out.textContent = format(settings[s.key], s.step, s.unit);
      }
    },
  };
}
