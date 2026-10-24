import type { JSX } from "react";

export type IconName =
  | "plus"
  | "play"
  | "pause"
  | "prev"
  | "next"
  | "undo"
  | "redo"
  | "trash"
  | "copy"
  | "download"
  | "upload"
  | "image"
  | "shape"
  | "text"
  | "eye"
  | "eye-off"
  | "zoom-in"
  | "zoom-out"
  | "fit"
  | "close"
  | "grip"
  | "layers"
  | "sliders"
  | "sun"
  | "moon"
  | "chevron-down"
  | "move-left"
  | "move-right"
  | "keyboard"
  | "warning"
  | "front"
  | "back"
  | "loop"
  | "logo";

const PATHS: Record<IconName, JSX.Element> = {
  plus: <path d="M8 3v10M3 8h10" />,
  play: <path d="M5 3.5v9l7.5-4.5L5 3.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="4" y="3.5" width="3" height="9" rx="0.8" fill="currentColor" stroke="none" />
      <rect x="9" y="3.5" width="3" height="9" rx="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  prev: (
    <>
      <path d="M5 3.5v9" />
      <path d="M12 4v8L6.5 8 12 4Z" fill="currentColor" stroke="none" />
    </>
  ),
  next: (
    <>
      <path d="M11 3.5v9" />
      <path d="M4 4v8l5.5-4L4 4Z" fill="currentColor" stroke="none" />
    </>
  ),
  undo: <path d="M4 7h6a3 3 0 1 1 0 6H7M4 7l2.5-2.5M4 7l2.5 2.5" />,
  redo: <path d="M12 7H6a3 3 0 1 0 0 6h3M12 7 9.5 4.5M12 7 9.5 9.5" />,
  trash: <path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.6 8h4.8l.6-8M7 7v3.5M9 7v3.5" />,
  copy: (
    <>
      <rect x="5.5" y="5.5" width="7" height="7" rx="1.4" />
      <path d="M10.5 5.5v-2h-7v7h2" />
    </>
  ),
  download: <path d="M8 2.5v7.5M5 7.5 8 10.5 11 7.5M3 12.5h10" />,
  upload: <path d="M8 10.5V3M5 6 8 3l3 3M3 12.5h10" />,
  image: (
    <>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.4" />
      <path d="M2.5 10.5 5.5 8l3 3 2-1.5 2.5 2" />
      <circle cx="6" cy="6.2" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  shape: <rect x="3" y="3" width="10" height="10" rx="1.6" />,
  text: <path d="M3.5 4.5h9M8 4.5V13M6.5 13h3" />,
  eye: (
    <>
      <path d="M1.8 8s2.3-4 6.2-4 6.2 4 6.2 4-2.3 4-6.2 4S1.8 8 1.8 8Z" />
      <circle cx="8" cy="8" r="1.8" />
    </>
  ),
  "eye-off": <path d="M3 3l10 10M4.8 5.2C2.9 6.4 1.8 8 1.8 8s2.3 4 6.2 4c1 0 1.9-.2 2.7-.6M7 4.2c.3 0 .6-.1 1-.1 3.9 0 6.2 4 6.2 4s-.5.9-1.5 1.9M9.9 9.9a1.8 1.8 0 0 1-2.5-2.5" />,
  "zoom-in": (
    <>
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2 13.5 13.5M7 5.2v3.6M5.2 7h3.6" />
    </>
  ),
  "zoom-out": (
    <>
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2 13.5 13.5M5.2 7h3.6" />
    </>
  ),
  fit: <path d="M2.5 5.5v-3h3M13.5 5.5v-3h-3M2.5 10.5v3h3M13.5 10.5v3h-3" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  grip: (
    <>
      <circle cx="6" cy="4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="6" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  layers: <path d="M8 2.5 14 6 8 9.5 2 6l6-3.5ZM3.5 8.5 8 11l4.5-2.5M3.5 11 8 13.5 12.5 11" />,
  sliders: <path d="M3 5h6M11 5h2M3 10.5h2M7 10.5h6M9 3.2v3.6M5 8.7v3.6" />,
  sun: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
    </>
  ),
  moon: <path d="M12.8 9.5A5.3 5.3 0 0 1 6.5 3.2a5.3 5.3 0 1 0 6.3 6.3Z" />,
  "chevron-down": <path d="M4.5 6.5 8 10l3.5-3.5" />,
  "move-left": <path d="M10.5 3.5 6 8l4.5 4.5M6 8h7" />,
  "move-right": <path d="M5.5 3.5 10 8l-4.5 4.5M10 8H3" />,
  keyboard: (
    <>
      <rect x="2" y="4.5" width="12" height="7" rx="1.4" />
      <path d="M4.5 7h.01M6.8 7h.01M9.1 7h.01M11.4 7h.01M5.5 9.2h5" />
    </>
  ),
  warning: <path d="M8 2.5 14.5 13h-13L8 2.5ZM8 6.5v3M8 11.4v.2" />,
  front: (
    <>
      <rect x="5.5" y="2.5" width="8" height="8" rx="1.2" />
      <path d="M2.5 5.5v6a2 2 0 0 0 2 2h6" strokeDasharray="2 1.6" />
    </>
  ),
  back: (
    <>
      <rect x="2.5" y="5.5" width="8" height="8" rx="1.2" strokeDasharray="2 1.6" />
      <path d="M5.5 2.5h6a2 2 0 0 1 2 2v6" />
    </>
  ),
  loop: <path d="M4 6.5a4 4 0 0 1 8 0M12 9.5a4 4 0 0 1-8 0M12 3.5v3h-3M4 12.5v-3h3" />,
  logo: (
    <>
      <rect x="1.8" y="3" width="12.4" height="10" rx="1.6" />
      <path d="M1.8 5.8h12.4" strokeDasharray="2.2 1.8" />
    </>
  ),
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
