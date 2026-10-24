import type { FrameArt, Primitive } from "./primitives";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function n(v: number): string {
  return String(Math.round(v * 100) / 100);
}

function primitiveToSvg(p: Primitive, clipId: string | null): { defs: string; body: string } {
  switch (p.type) {
    case "rect": {
      const fill = p.fill ? ` fill="${p.fill}"` : ' fill="none"';
      const stroke = p.stroke && p.strokeWidth > 0 ? ` stroke="${p.stroke}" stroke-width="${n(p.strokeWidth)}"` : "";
      const radius = p.radius > 0 ? ` rx="${n(p.radius)}" ry="${n(p.radius)}"` : "";
      return { defs: "", body: `<rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.w)}" height="${n(p.h)}"${radius}${fill}${stroke} opacity="${p.opacity}"/>` };
    }
    case "ellipse": {
      const fill = p.fill ? ` fill="${p.fill}"` : ' fill="none"';
      const stroke = p.stroke && p.strokeWidth > 0 ? ` stroke="${p.stroke}" stroke-width="${n(p.strokeWidth)}"` : "";
      return { defs: "", body: `<ellipse cx="${n(p.cx)}" cy="${n(p.cy)}" rx="${n(p.rx)}" ry="${n(p.ry)}"${fill}${stroke} opacity="${p.opacity}"/>` };
    }
    case "line":
      return {
        defs: "",
        body: `<line x1="${n(p.x1)}" y1="${n(p.y1)}" x2="${n(p.x2)}" y2="${n(p.y2)}" stroke="${p.stroke}" stroke-width="${n(p.strokeWidth)}" stroke-linecap="round" opacity="${p.opacity}"/>`,
      };
    case "triangle": {
      const fill = p.fill ? ` fill="${p.fill}"` : ' fill="none"';
      const stroke = p.stroke && p.strokeWidth > 0 ? ` stroke="${p.stroke}" stroke-width="${n(p.strokeWidth)}" stroke-linejoin="round"` : "";
      const points = `${n(p.x + p.w / 2)},${n(p.y)} ${n(p.x + p.w)},${n(p.y + p.h)} ${n(p.x)},${n(p.y + p.h)}`;
      return { defs: "", body: `<polygon points="${points}"${fill}${stroke} opacity="${p.opacity}"/>` };
    }
    case "image": {
      if (!clipId) return { defs: "", body: "" };
      const radiusAttr = p.radius > 0 ? ` rx="${n(p.radius)}" ry="${n(p.radius)}"` : "";
      const defs = `<clipPath id="${clipId}"><rect x="${n(p.clipX)}" y="${n(p.clipY)}" width="${n(p.clipW)}" height="${n(p.clipH)}"${radiusAttr}/></clipPath>`;
      const image = `<image href="${esc(p.href)}" x="${n(p.x)}" y="${n(p.y)}" width="${n(p.w)}" height="${n(p.h)}" preserveAspectRatio="none" opacity="${p.opacity}"/>`;
      const border =
        p.borderWidth > 0
          ? `<rect x="${n(p.clipX)}" y="${n(p.clipY)}" width="${n(p.clipW)}" height="${n(p.clipH)}"${radiusAttr} fill="none" stroke="${p.borderColor}" stroke-width="${n(p.borderWidth)}"/>`
          : "";
      return { defs, body: `<g clip-path="url(#${clipId})">${image}</g>${border}` };
    }
    case "text": {
      const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
      const tx = p.align === "center" ? p.x + p.boxW / 2 : p.align === "right" ? p.x + p.boxW : p.x;
      const lineH = p.fontSize * p.lineHeight;
      const tspans = p.lines
        .map((line, i) => `<tspan x="${n(tx)}" y="${n(p.y + (i + 0.5) * lineH)}" dominant-baseline="central">${esc(line)}</tspan>`)
        .join("");
      return {
        defs: "",
        body: `<text font-family="${esc(p.fontFamily)}" font-size="${n(p.fontSize)}" font-weight="${p.fontWeight}" fill="${p.color}" text-anchor="${anchor}" letter-spacing="${n(p.letterSpacing)}" opacity="${p.opacity}">${tspans}</text>`,
      };
    }
    case "placeholder":
      return {
        defs: "",
        body: `<g opacity="${p.opacity}"><rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.w)}" height="${n(p.h)}" fill="none" stroke="#8d8672" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${n(p.x + p.w / 2)}" y="${n(p.y + p.h / 2)}" font-family="monospace" font-size="13" fill="#8d8672" text-anchor="middle" dominant-baseline="central">${esc(p.label)}</text></g>`,
      };
  }
}

/** Deterministic standalone SVG for one frame's art. */
export function frameArtToSvg(art: FrameArt): string {
  const defs: string[] = [];
  const body: string[] = [];
  let clipIndex = 0;
  for (const p of art.primitives) {
    if (p.type === "image") {
      const { defs: d, body: b } = primitiveToSvg(p, `clip-${clipIndex++}`);
      if (d) defs.push(d);
      if (b) body.push(b);
    } else {
      body.push(primitiveToSvg(p, null).body);
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(art.width)} ${n(art.height)}" width="${n(art.width)}" height="${n(art.height)}">`,
    defs.length > 0 ? `<defs>${defs.join("")}</defs>` : "",
    `<rect width="${n(art.width)}" height="${n(art.height)}" fill="${art.background}"/>`,
    ...body,
    `</svg>`,
  ].join("\n");
}
