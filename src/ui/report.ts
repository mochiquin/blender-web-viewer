import { PART_TRIANGLE_BUDGET, type PartReport } from '../viewer/partReport';

export interface ReportRow {
  /** true = passed, false = worth a look, null = information only. */
  ok: boolean | null;
  label: string;
  value: string;
}

/** The checklist shown for one inspected part, in the order a technical artist reads it. */
export function reportRows(report: PartReport): ReportRow[] {
  const [x, y, z] = report.size;
  return [
    { ok: report.parts > 0, label: '构件 Meshes', value: `${report.parts} 件` },
    { ok: report.triangles < PART_TRIANGLE_BUDGET, label: '三角面 Tris', value: report.triangles.toLocaleString('en-US') },
    { ok: null, label: '外形尺寸 Size', value: `${x} × ${y} × ${z} m` },
    { ok: report.valid, label: '几何有效 Valid', value: report.valid ? '无空网格 · 坐标正常' : '存在空网格或异常坐标' },
    { ok: report.symmetric, label: '左右对称 Sym.', value: report.symmetric ? '居中' : `偏移 ${report.offset} m` },
    { ok: null, label: '支撑 Support', value: report.grounded ? '落地' : '悬空 / 高位' },
    { ok: report.travel > 0, label: '展开位移 Explode', value: `最大 ${report.travel} m` },
    { ok: null, label: '材质 Materials', value: report.materials.join(' · ') || '—' },
  ];
}

export interface ReportData {
  index: number;
  total: number;
  /** Count of parts looked at so far in this model. */
  checked: number;
  name: string;
  note?: string;
  report: PartReport;
}

export interface ReportHandlers {
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

/** The floating report card for the part being inspected. */
export function createReport(container: HTMLElement, handlers: ReportHandlers) {
  const element = document.createElement('aside');
  element.className = 'report card';
  element.setAttribute('aria-live', 'polite');
  element.hidden = true;
  element.innerHTML = `
    <header class="report-head">
      <span class="report-code"></span>
      <b class="report-name"></b>
      <button type="button" class="report-close" aria-label="结束检查">✕</button>
    </header>
    <p class="report-note"></p>
    <ul class="report-checks"></ul>
    <footer class="report-foot">
      <span class="report-progress"></span>
      <button type="button" class="report-prev" aria-label="上一个部件">←</button>
      <button type="button" class="report-next" aria-label="下一个部件">→</button>
    </footer>`;
  container.append(element);

  const q = <T extends HTMLElement>(selector: string) => element.querySelector<T>(selector)!;
  q('.report-close').addEventListener('click', handlers.onClose);
  q('.report-prev').addEventListener('click', handlers.onPrev);
  q('.report-next').addEventListener('click', handlers.onNext);

  return {
    element,
    show(data: ReportData) {
      q('.report-code').textContent = `P-${String(data.index + 1).padStart(2, '0')}`;
      q('.report-name').textContent = data.name;
      q('.report-note').textContent = data.note ?? '';
      q('.report-note').hidden = !data.note;
      q('.report-progress').textContent = `已检查 ${data.checked} / ${data.total}`;
      const list = q('.report-checks');
      list.replaceChildren();
      for (const row of reportRows(data.report)) {
        const item = document.createElement('li');
        item.className = row.ok === null ? 'plain' : row.ok ? 'ok' : 'warn';
        const mark = document.createElement('i');
        mark.textContent = row.ok === null ? '·' : row.ok ? '✓' : '△';
        const label = document.createElement('span');
        label.textContent = row.label;
        const value = document.createElement('b');
        value.textContent = row.value;
        item.append(mark, label, value);
        list.append(item);
      }
      element.hidden = false;
      // Restart the swap-in animation when stepping between parts.
      element.classList.remove('swap');
      void element.offsetWidth;
      element.classList.add('swap');
    },
    hide() {
      element.hidden = true;
    },
  };
}
