# 美术资产 · Art assets

Drop files into these folders; the site picks them up on the next `npm run dev` / build.
Files containing `.placeholder.` are templates for size and layout and are never shown.
Real art files here are git-ignored (only the templates and this README are tracked); keep your
originals in `art-source/`.

| Folder | What | Name | Size / format |
| --- | --- | --- | --- |
| `poster/` | Hero poster layers, stacked with the code-drawn sheets | `NN-name.webp` (`NN` 00 far … 99 near) | full 1000 × 1000 canvas exported at 2000 × 2000, transparent; `.svg`, `.webp`, `.png` |
| `covers/` | Catalogue card art (replaces the drawn emblem) | `<entry id>.webp`, e.g. `sanctum.webp` | 1040 × 1040; `.webp`, `.png`, `.jpg`, `.svg` |
| `backdrops/` | Extra inspect-room backdrops, selectable in the panel | `name.webp`, `name-dark.webp`, `name.webm` | 2560 × 1440 image, or a 5–10 s seamless `.webm` / `.mp4` loop |

3D models go in `public/models/` (see the main README).
To use a custom backdrop by default, set `DEFAULT_BACKDROP` (or an entry's `backdrop`) in `src/projects.ts`.
Official / third-party graphics go in `public/assets/third-party/`, which is never committed.

## 设计规范 · Design rules

**Palette** (match it, so the code-drawn graphics and your art sit together)

| Role | Colour |
| --- | --- |
| Cobalt, the one strong colour | `#2a3fe0` |
| Ink, lines and text | `#1f3036` |
| Paper, light ground | `#e6ece9` / `#eef2f0` |
| Accent, used sparingly (a spark, a mark) | `#d9465f` |

**Look**: white matte subject on pale paper, cobalt for graphic shapes only (arcs, discs, frames,
rings, sparkles), thin hand-drawn construction lines, halftone dots, small framed detail crops.
Keep large areas calm; put the detail in the subject and the small frames.

**Where things sit**
- Subject centred; keep important parts inside the template's dashed circle or red crop line.
- The card and the site add their own numbers, titles and frames: **do not bake text into the art**.
- Backdrops: keep the middle empty (the model sits there) and the corners low-contrast (panels cover them).

**Code-drawn, no file needed**: the hero poster base (disc, halftone, rays, ring text, birds,
numeral), the catalogue card frame, number, title and barcode, the built-in backdrops, callouts,
and the interaction effects below.

**Interaction effects on top of your art** (automatic; nothing to supply)
- A turning cobalt ring over each cover: hover turns it, press turns it further.
- Click marks anywhere on the page: ring, crosshair, stamped letter and coordinates, fading out.
- Poster layers drift with the pointer by their number (far moves least, near moves most).

## 素材清单 · Checklist

| Slot | File | Status | Template to work from |
| --- | --- | --- | --- |
| Cover, sanctum | `covers/sanctum.webp` | done | `covers/sanctum.placeholder.svg` |
| Cover, figure | `covers/figure.webp` | done | `covers/figure.placeholder.svg` |
| Cover, blade | `covers/blade.webp` | done | `covers/blade.placeholder.svg` |
| Backdrop (default) | `backdrops/orbital-blueprint.webp` | done | `backdrops/example.placeholder.svg` |
| Poster far | `poster/10-ruins.webp` | **to make** | `poster/10-far.placeholder.svg` |
| Poster subject | `poster/45-subject.webp` | **to make** | `poster/45-subject.placeholder.svg` |
| Poster detail frames | `poster/75-details.webp` | **to make** | `poster/75-detail.placeholder.svg` |
| Poster foreground | `poster/92-near.webp` | **to make** | `poster/92-near.placeholder.svg` |
| Backdrop, dark variant | `backdrops/<name>-dark.webp` | optional | `backdrops/example.placeholder.svg` |
| 3D models | `public/models/<id>.glb` | **to make** | see the main README |

The four poster layers are all optional and independent: add any subset, in any order. The code
sheets sit at 08 back · 20 dots · 26 rays · 30 ring text · 40 disc · 59 halo · 66 collage · 76 birds
· 89 numeral, and your numbers slot in between them.

**中文速查**
- `poster/`：在 PS 里用对应的 `NN-xxx.placeholder.svg` 当参考层，每个图层按整张画布（2000×2000、透明）导出，文件名前面的数字越大越靠前。目前建议做四层：`10-ruins`（远景淡剪影）、`45-subject`（主体抠图，放在圆盘上）、`75-details`（细节放大框）、`92-near`（前景虚化物）。
- `covers/`：用对应的 `xxx.placeholder.svg` 当尺寸参考，导出同名的 `xxx.webp` 放进来就会替换卡片图案。
- `backdrops/`：放 2560×1440 的图片或循环视频，文件名就是背景名；暗色背景在名字后加 `-dark`。
- 图里**不要放文字**：编号、标题、边框都由网站自己叠加。
- 原图放在 `art-source/`，这个文件夹和真实素材都不会提交到 git。
