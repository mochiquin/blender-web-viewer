# 美术资产 · Art assets

Drop files into these folders; the site picks them up on the next `npm run dev` / build.
Files containing `.placeholder.` are templates for size and layout and are never shown.

| Folder | What | Name | Size / format |
| --- | --- | --- | --- |
| `poster/` | Hero poster layers, stacked with the code-drawn sheets | `NN-name.webp` (`NN` 00 far … 99 near) | full 1000 × 1000 canvas exported at 2000 × 2000, transparent; `.svg`, `.webp`, `.png` |
| `covers/` | Catalogue card art (replaces the drawn emblem) | `<entry id>.webp`, e.g. `sanctum.webp` | 1040 × 1040; `.webp`, `.png`, `.jpg`, `.svg` |
| `backdrops/` | Extra inspect-room backdrops, selectable in the panel | `name.webp`, `name-dark.webp`, `name.webm` | 2560 × 1440 image, or a 5–10 s seamless `.webm` / `.mp4` loop |

3D models go in `public/models/` (see the main README).
To use a custom backdrop by default for an entry, set `backdrop: 'name'` in `src/projects.ts`.
Official / third-party graphics go in `public/assets/third-party/`, which is never committed.

**中文速查**
- `poster/`：在 PS 里用 `00-layout.placeholder.svg` 当参考层，每个图层按整张画布（2000×2000、透明）导出，文件名前面的数字越大越靠前。
- `covers/`：用对应的 `xxx.placeholder.svg` 当尺寸参考，导出同名的 `xxx.webp` 放进来就会替换卡片图案。
- `backdrops/`：放 2560×1440 的图片或循环视频，文件名就是背景名字；暗色背景在名字后加 `-dark`。
