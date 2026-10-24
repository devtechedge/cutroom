import { UI_MONO } from "./fonts";
import type { FrameArt, Primitive } from "./primitives";

function pathRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (radius <= 0 || typeof ctx.roundRect === "function") {
    if (radius <= 0) {
      ctx.rect(x, y, w, h);
    } else {
      ctx.roundRect(x, y, w, h, radius);
    }
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

export function drawPrimitive(ctx: CanvasRenderingContext2D, p: Primitive, images: Map<string, HTMLImageElement>): void {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  switch (p.type) {
    case "rect": {
      pathRoundedRect(ctx, p.x, p.y, p.w, p.h, p.radius);
      if (p.fill) {
        ctx.fillStyle = p.fill;
        ctx.fill();
      }
      if (p.stroke && p.strokeWidth > 0) {
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = p.strokeWidth;
        ctx.stroke();
      }
      break;
    }
    case "ellipse": {
      ctx.beginPath();
      ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2);
      if (p.fill) {
        ctx.fillStyle = p.fill;
        ctx.fill();
      }
      if (p.stroke && p.strokeWidth > 0) {
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = p.strokeWidth;
        ctx.stroke();
      }
      break;
    }
    case "line": {
      ctx.beginPath();
      ctx.moveTo(p.x1, p.y1);
      ctx.lineTo(p.x2, p.y2);
      ctx.strokeStyle = p.stroke;
      ctx.lineWidth = p.strokeWidth;
      ctx.lineCap = "round";
      ctx.stroke();
      break;
    }
    case "triangle": {
      ctx.beginPath();
      ctx.moveTo(p.x + p.w / 2, p.y);
      ctx.lineTo(p.x + p.w, p.y + p.h);
      ctx.lineTo(p.x, p.y + p.h);
      ctx.closePath();
      if (p.fill) {
        ctx.fillStyle = p.fill;
        ctx.fill();
      }
      if (p.stroke && p.strokeWidth > 0) {
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = p.strokeWidth;
        ctx.lineJoin = "round";
        ctx.stroke();
      }
      break;
    }
    case "image": {
      const img = images.get(p.href);
      if (img) {
        pathRoundedRect(ctx, p.clipX, p.clipY, p.clipW, p.clipH, p.radius);
        ctx.clip();
        ctx.drawImage(img, p.x, p.y, p.w, p.h);
        if (p.borderWidth > 0) {
          ctx.strokeStyle = p.borderColor;
          ctx.lineWidth = p.borderWidth;
          pathRoundedRect(ctx, p.clipX, p.clipY, p.clipW, p.clipH, p.radius);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = "#8d8672";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(p.clipX, p.clipY, p.clipW, p.clipH);
      }
      break;
    }
    case "text": {
      const lineH = p.fontSize * p.lineHeight;
      ctx.font = `${p.fontWeight} ${p.fontSize}px ${p.fontFamily}`;
      ctx.fillStyle = p.color;
      ctx.textBaseline = "middle";
      ctx.textAlign = p.align === "center" ? "center" : p.align === "right" ? "right" : "left";
      if ("letterSpacing" in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${p.letterSpacing}px`;
      }
      const tx = p.align === "center" ? p.x + p.boxW / 2 : p.align === "right" ? p.x + p.boxW : p.x;
      p.lines.forEach((line, i) => {
        ctx.fillText(line, tx, p.y + (i + 0.5) * lineH);
      });
      break;
    }
    case "placeholder": {
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#8d8672";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.setLineDash([]);
      ctx.fillStyle = "#8d8672";
      ctx.font = `500 ${Math.max(11, Math.min(16, p.w / 20))}px ${UI_MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, p.x + p.w / 2, p.y + p.h / 2);
      break;
    }
  }
  ctx.restore();
}

export function paintArt(ctx: CanvasRenderingContext2D, art: FrameArt, images: Map<string, HTMLImageElement>): void {
  ctx.save();
  ctx.fillStyle = art.background;
  ctx.fillRect(0, 0, art.width, art.height);
  ctx.beginPath();
  ctx.rect(0, 0, art.width, art.height);
  ctx.clip();
  for (const p of art.primitives) drawPrimitive(ctx, p, images);
  ctx.restore();
}

/** Load every dataUrl referenced by the art so drawImage can rasterize it. */
export async function loadImages(art: FrameArt | FrameArt[]): Promise<Map<string, HTMLImageElement>> {
  const arts = Array.isArray(art) ? art : [art];
  const hrefs = new Set<string>();
  for (const a of arts) for (const p of a.primitives) if (p.type === "image") hrefs.add(p.href);
  const entries = await Promise.all(
    [...hrefs].map(
      (href) =>
        new Promise<[string, HTMLImageElement] | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve([href, img]);
          img.onerror = () => resolve(null);
          img.src = href;
        }),
    ),
  );
  const map = new Map<string, HTMLImageElement>();
  for (const e of entries) if (e) map.set(e[0], e[1]);
  return map;
}
