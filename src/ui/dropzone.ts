const MODEL_EXTENSIONS = ['.glb', '.gltf'];

export function isModelFile(name: string): boolean {
  const lower = name.toLowerCase();
  return MODEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Let people drag a .glb from their desktop onto the page to preview it. Nothing is uploaded:
 * the file is read locally through an object URL.
 */
export function enableDropZone(overlay: HTMLElement, onFile: (file: File) => void, onReject: (name: string) => void): void {
  let depth = 0; // dragenter/dragleave fire for every child element, so count them

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    overlay.hidden = false;
  });
  window.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  window.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) overlay.hidden = true;
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    depth = 0;
    overlay.hidden = true;
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    if (isModelFile(file.name)) onFile(file);
    else onReject(file.name);
  });
}
