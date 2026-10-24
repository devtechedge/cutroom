import { useId, useMemo, type JSX } from "react";
import { renderFrameArt, type AssetResolver, type Primitive } from "../render/primitives";
import { frameArtToSvg } from "../render/svg";
import type { Frame } from "../model/types";

/** Map a computed primitive to live SVG elements (stage, thumbs, preview). */
function PrimitiveNode({ p, uid, index }: { p: Primitive; uid: string; index: number }): JSX.Element {
  switch (p.type) {
    case "rect":
      return (
        <rect
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          rx={p.radius > 0 ? p.radius : undefined}
          fill={p.fill ?? "none"}
          stroke={p.stroke ?? undefined}
          strokeWidth={p.stroke ? p.strokeWidth : undefined}
          opacity={p.opacity}
        />
      );
    case "ellipse":
      return (
        <ellipse
          cx={p.cx}
          cy={p.cy}
          rx={p.rx}
          ry={p.ry}
          fill={p.fill ?? "none"}
          stroke={p.stroke ?? undefined}
          strokeWidth={p.stroke ? p.strokeWidth : undefined}
          opacity={p.opacity}
        />
      );
    case "triangle":
      return (
        <polygon
          points={`${p.x + p.w / 2},${p.y} ${p.x + p.w},${p.y + p.h} ${p.x},${p.y + p.h}`}
          fill={p.fill ?? "none"}
          stroke={p.stroke ?? undefined}
          strokeWidth={p.stroke ? p.strokeWidth : undefined}
          strokeLinejoin="round"
          opacity={p.opacity}
        />
      );
    case "line":
      return <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" opacity={p.opacity} />;
    case "image": {
      const clipId = `${uid}-clip-${index}`;
      return (
        <g>
          <defs>
            <clipPath id={clipId}>
              <rect x={p.clipX} y={p.clipY} width={p.clipW} height={p.clipH} rx={p.radius > 0 ? p.radius : undefined} />
            </clipPath>
          </defs>
          <image href={p.href} x={p.x} y={p.y} width={p.w} height={p.h} clipPath={`url(#${clipId})`} opacity={p.opacity} preserveAspectRatio="none" />
          {p.borderWidth > 0 && (
            <rect x={p.clipX} y={p.clipY} width={p.clipW} height={p.clipH} rx={p.radius > 0 ? p.radius : undefined} fill="none" stroke={p.borderColor} strokeWidth={p.borderWidth} />
          )}
        </g>
      );
    }
    case "text": {
      const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
      const tx = p.align === "center" ? p.x + p.boxW / 2 : p.align === "right" ? p.x + p.boxW : p.x;
      const lineH = p.fontSize * p.lineHeight;
      return (
        <text
          fontFamily={p.fontFamily}
          fontSize={p.fontSize}
          fontWeight={p.fontWeight}
          fill={p.color}
          textAnchor={anchor}
          letterSpacing={p.letterSpacing}
          opacity={p.opacity}
        >
          {p.lines.map((line, i) => (
            <tspan key={i} x={tx} y={p.y + (i + 0.5) * lineH} dominantBaseline="central">
              {line}
            </tspan>
          ))}
        </text>
      );
    }
    case "placeholder":
      return (
        <g opacity={p.opacity}>
          <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="none" stroke="#8d8672" strokeWidth={1.5} strokeDasharray="6 4" />
          <text x={p.x + p.w / 2} y={p.y + p.h / 2} fontFamily="monospace" fontSize={13} fill="#8d8672" textAnchor="middle" dominantBaseline="central">
            {p.label}
          </text>
        </g>
      );
  }
}

export interface FrameArtViewProps {
  frame: Frame;
  aspect: string;
  resolve: AssetResolver;
  title?: string;
}

/**
 * Live SVG rendering of a frame's art. Scales to its container; wrap it in
 * a sized element. Shares primitives with the export backends.
 */
export function FrameArtView({ frame, aspect, resolve, title }: FrameArtViewProps): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const art = useMemo(() => renderFrameArt(frame, aspect, 1000, resolve), [frame, aspect, resolve]);
  return (
    <svg
      viewBox={`0 0 ${art.width} ${art.height}`}
      width="100%"
      height="100%"
      style={{ display: "block" }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width={art.width} height={art.height} fill={art.background} />
      {art.primitives.map((p, i) => (
        <PrimitiveNode key={i} p={p} uid={uid} index={i} />
      ))}
    </svg>
  );
}

export interface FrameImageViewProps {
  frame: Frame;
  aspect: string;
  resolve: AssetResolver;
  width?: number;
}

/**
 * Image-backed thumbnail for buttons and cards. The SVG is rendered as an
 * image, so its text is not part of the button's visible label.
 */
export function FrameImageView({ frame, aspect, resolve, width = 1000 }: FrameImageViewProps): JSX.Element {
  const svg = useMemo(() => frameArtToSvg(renderFrameArt(frame, aspect, width, resolve)), [frame, aspect, width, resolve]);
  return (
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      alt=""
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}
