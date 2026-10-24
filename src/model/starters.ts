import { newFrame, newShapeObject, newTextObject, newStoryboard } from "./defaults";
import type { Frame, FrameObject, ShapeObject, Storyboard, TextObject } from "./types";

type SP = Partial<ShapeObject>;
type TP = Partial<TextObject>;

const INK = "#201d18";
const PAPER = "#f5f1e6";
const LIME = "#d7f04c";

function rect(p: SP): FrameObject {
  return newShapeObject({ shape: "rect", ...p });
}
function ell(p: SP): FrameObject {
  return newShapeObject({ shape: "ellipse", ...p });
}
function tri(p: SP): FrameObject {
  return newShapeObject({ shape: "triangle", ...p });
}
function line(p: SP): FrameObject {
  return newShapeObject({ shape: "line", strokeWidth: 6, strokeColor: INK, ...p });
}
function txt(p: TP): FrameObject {
  return newTextObject({ color: INK, ...p });
}

function frame(p: Omit<Partial<Frame>, "caption"> & { caption: string; notes?: string }): Frame {
  const { caption, notes, ...rest } = p;
  return newFrame({ ...rest, caption: { text: caption, visible: true }, notes: notes ?? "" });
}

function nightShift(): Storyboard {
  return newStoryboard({
    title: "Night Shift",
    aspect: "16:9",
    paper: "#efe9db",
    brief: "Six beats for a three-minute short: a night-bus driver notices the same passenger every evening and finally says hello.",
    author: "CUTROOM starters",
    frames: [
      frame({
        shot: "WIDE",
        duration: 3,
        background: "#181613",
        caption: "EXT. CITY - NIGHT. Rain just stopped.",
        notes: "Establishing. Slow push in. Street hiss, a distant siren.",
        objects: [
          ell({ x: 760, y: 60, w: 90, h: 90, fill: "#c9c2b0", strokeWidth: 0, opacity: 0.9 }),
          rect({ x: 40, y: 300, w: 110, h: 262, fill: "#26231e", strokeWidth: 0 }),
          rect({ x: 170, y: 220, w: 140, h: 342, fill: "#2e2a25", strokeWidth: 0 }),
          rect({ x: 330, y: 340, w: 90, h: 222, fill: "#26231e", strokeWidth: 0 }),
          rect({ x: 440, y: 180, w: 150, h: 382, fill: "#2e2a25", strokeWidth: 0 }),
          rect({ x: 610, y: 290, w: 120, h: 272, fill: "#26231e", strokeWidth: 0 }),
          rect({ x: 750, y: 230, w: 170, h: 332, fill: "#2e2a25", strokeWidth: 0 }),
          rect({ x: 196, y: 250, w: 18, h: 12, fill: LIME, strokeWidth: 0 }),
          rect({ x: 240, y: 300, w: 18, h: 12, fill: LIME, strokeWidth: 0, opacity: 0.7 }),
          rect({ x: 470, y: 220, w: 18, h: 12, fill: LIME, strokeWidth: 0 }),
          rect({ x: 530, y: 280, w: 18, h: 12, fill: LIME, strokeWidth: 0, opacity: 0.6 }),
          rect({ x: 790, y: 270, w: 18, h: 12, fill: LIME, strokeWidth: 0 }),
          rect({ x: 840, y: 330, w: 18, h: 12, fill: LIME, strokeWidth: 0, opacity: 0.7 }),
          rect({ x: 0, y: 556, w: 1000, h: 8, fill: "#0f0e0c", strokeWidth: 0 }),
        ],
      }),
      frame({
        shot: "MEDIUM",
        duration: 2.5,
        background: "#26231e",
        caption: "The same passenger. Every night, the 11:40.",
        notes: "Cut on her step off the bus. Lamp is the only source.",
        objects: [
          line({ x: 700, y: 60, w: 0, h: 420, strokeWidth: 10, strokeColor: "#4a453c" }),
          tri({ x: 560, y: 66, w: 280, h: 300, fill: LIME, strokeWidth: 0, opacity: 0.16 }),
          ell({ x: 668, y: 46, w: 64, h: 22, fill: LIME, strokeWidth: 0 }),
          ell({ x: 452, y: 250, w: 66, h: 66, fill: "none", strokeColor: "#c9c2b0", strokeWidth: 8 }),
          line({ x: 485, y: 326, w: 0, h: 130, strokeWidth: 10, strokeColor: "#c9c2b0" }),
          line({ x: 485, y: 456, w: -46, h: 100, strokeWidth: 8, strokeColor: "#c9c2b0" }),
          line({ x: 485, y: 456, w: 46, h: 100, strokeWidth: 8, strokeColor: "#c9c2b0" }),
          line({ x: 0, y: 556, w: 1000, h: 0, strokeWidth: 8, strokeColor: "#0f0e0c" }),
        ],
      }),
      frame({
        shot: "INSERT",
        duration: 1.5,
        background: PAPER,
        caption: "INSERT - coffee going cold.",
        notes: "Practical insert, handheld. Steam gone is the point.",
        objects: [
          newShapeObject({ shape: "rect", x: 380, y: 200, w: 240, h: 200, fill: PAPER, strokeColor: INK, strokeWidth: 10, cornerRadius: 0 }),
          ell({ x: 380, y: 176, w: 240, h: 48, fill: "#e2d8bf", strokeColor: INK, strokeWidth: 10 }),
          ell({ x: 420, y: 186, w: 160, h: 28, fill: "#4a453c", strokeWidth: 0 }),
          newShapeObject({ shape: "rect", x: 620, y: 250, w: 70, h: 14, fill: "none", strokeColor: INK, strokeWidth: 10, cornerRadius: 0 }),
          line({ x: 440, y: 120, w: 20, h: 40, strokeWidth: 4, strokeColor: "#8d8672" }),
          line({ x: 490, y: 110, w: 24, h: 50, strokeWidth: 4, strokeColor: "#8d8672" }),
          line({ x: 540, y: 124, w: 16, h: 36, strokeWidth: 4, strokeColor: "#8d8672" }),
        ],
      }),
      frame({
        shot: "CLOSE",
        duration: 2.5,
        background: "#3a3f52",
        caption: "She counts the cars going by.",
        notes: "Rain on glass up. Her reflection half-visible.",
        objects: [
          newShapeObject({ shape: "rect", x: 200, y: 60, w: 600, h: 440, fill: "#6d7ba3", strokeColor: "#f2ede3", strokeWidth: 14, cornerRadius: 6, opacity: 0.5 }),
          line({ x: 280, y: 80, w: -60, h: 180, strokeWidth: 4, strokeColor: "#f2ede3", opacity: 0.7 }),
          line({ x: 420, y: 70, w: -50, h: 220, strokeWidth: 4, strokeColor: "#f2ede3", opacity: 0.6 }),
          line({ x: 560, y: 90, w: -70, h: 160, strokeWidth: 4, strokeColor: "#f2ede3", opacity: 0.7 }),
          line({ x: 700, y: 76, w: -44, h: 200, strokeWidth: 4, strokeColor: "#f2ede3", opacity: 0.5 }),
          line({ x: 160, y: 520, w: 680, h: 0, strokeWidth: 14, strokeColor: "#f2ede3" }),
        ],
      }),
      frame({
        shot: "OTS",
        duration: 3,
        background: "#181613",
        caption: "The door opens. Nobody there.",
        notes: "Hold two beats. No score.",
        transitionIn: "dissolve",
        objects: [
          rect({ x: 420, y: 120, w: 180, h: 400, fill: "#f5f1e6", strokeWidth: 0 }),
          rect({ x: 390, y: 90, w: 24, h: 460, fill: "#2e2a25", strokeWidth: 0 }),
          rect({ x: 610, y: 90, w: 24, h: 460, fill: "#2e2a25", strokeWidth: 0 }),
          ell({ x: 476, y: 210, w: 68, h: 68, fill: "#181613", strokeWidth: 0 }),
          rect({ x: 448, y: 288, w: 124, h: 232, fill: "#181613", strokeWidth: 0 }),
        ],
      }),
      frame({
        shot: "WIDE",
        duration: 4,
        background: "#ece5d2",
        caption: "First light. She waves anyway.",
        notes: "End on the wide. Titles over this frame.",
        transitionIn: "dissolve",
        objects: [
          ell({ x: 120, y: 150, w: 130, h: 130, fill: LIME, strokeWidth: 0 }),
          tri({ x: 430, y: 320, w: 330, h: 200, fill: "#b8c98a", strokeWidth: 0 }),
          tri({ x: 640, y: 350, w: 320, h: 170, fill: "#7d8f5a", strokeWidth: 0 }),
          rect({ x: 0, y: 512, w: 1000, h: 50, fill: "#e2d8bf", strokeWidth: 0 }),
        ],
      }),
    ],
  });
}

function fieldnoteLaunch(): Storyboard {
  return newStoryboard({
    title: "Fieldnote One - Launch",
    aspect: "16:9",
    paper: "#f7f3e8",
    brief: "Launch board for Fieldnote One, a pocket research notebook. Five frames for the social cut.",
    author: "CUTROOM starters",
    frames: [
      frame({
        duration: 2,
        background: LIME,
        caption: "Hook: the name card.",
        notes: "Hold 2s. No motion; the cut is the effect.",
        objects: [
          txt({ text: "FIELDNOTE", x: 80, y: 180, w: 840, size: 120, weight: 700, align: "center", letterSpacing: 0.01 }),
          txt({ text: "the pocket research notebook", x: 80, y: 330, w: 840, size: 34, weight: 400, align: "center", font: "mono", color: "#31402a" }),
        ],
      }),
      frame({
        duration: 2.5,
        background: PAPER,
        caption: "Research lives in twelve places.",
        notes: "Show the mess before the fix.",
        objects: [
          newShapeObject({ shape: "rect", x: 120, y: 130, w: 220, h: 280, fill: "#ece5d2", strokeColor: "#8d8672", strokeWidth: 4, cornerRadius: 8 }),
          newShapeObject({ shape: "rect", x: 400, y: 90, w: 200, h: 260, fill: "#e2d8bf", strokeColor: "#8d8672", strokeWidth: 4, cornerRadius: 8 }),
          newShapeObject({ shape: "rect", x: 660, y: 160, w: 230, h: 300, fill: "#ece5d2", strokeColor: "#8d8672", strokeWidth: 4, cornerRadius: 8 }),
          line({ x: 150, y: 200, w: 160, h: 0, strokeWidth: 8, strokeColor: "#c96f4a" }),
          line({ x: 430, y: 160, w: 140, h: 0, strokeWidth: 8, strokeColor: "#c96f4a" }),
          line({ x: 700, y: 230, w: 150, h: 0, strokeWidth: 8, strokeColor: "#c96f4a" }),
          txt({ text: "?", x: 440, y: 330, w: 120, size: 90, weight: 600, align: "center", color: "#c96f4a" }),
        ],
      }),
      frame({
        duration: 2.5,
        background: "#e9e3d3",
        caption: "One pocket notebook. Offline first.",
        transitionIn: "slide",
        objects: [
          newShapeObject({ shape: "rect", x: 380, y: 60, w: 240, h: 440, fill: INK, strokeWidth: 0, cornerRadius: 28 }),
          newShapeObject({ shape: "rect", x: 400, y: 90, w: 200, h: 380, fill: PAPER, strokeWidth: 0, cornerRadius: 10 }),
          rect({ x: 420, y: 120, w: 160, h: 16, fill: "#b8b09a", strokeWidth: 0 }),
          rect({ x: 420, y: 156, w: 130, h: 16, fill: "#b8b09a", strokeWidth: 0 }),
          rect({ x: 420, y: 210, w: 160, h: 90, fill: LIME, strokeWidth: 0, opacity: 0.5 }),
          rect({ x: 420, y: 320, w: 160, h: 16, fill: "#b8b09a", strokeWidth: 0 }),
        ],
      }),
      frame({
        duration: 3,
        background: PAPER,
        caption: "Clip, tag, find.",
        notes: "Three beats, one per card.",
        objects: [
          newShapeObject({ shape: "rect", x: 80, y: 140, w: 240, h: 280, fill: "#f7f3e8", strokeColor: INK, strokeWidth: 6, cornerRadius: 12 }),
          newShapeObject({ shape: "rect", x: 380, y: 140, w: 240, h: 280, fill: "#f7f3e8", strokeColor: INK, strokeWidth: 6, cornerRadius: 12 }),
          newShapeObject({ shape: "rect", x: 680, y: 140, w: 240, h: 280, fill: "#f7f3e8", strokeColor: INK, strokeWidth: 6, cornerRadius: 12 }),
          ell({ x: 170, y: 180, w: 60, h: 60, fill: "none", strokeColor: INK, strokeWidth: 8 }),
          line({ x: 470, y: 180, w: 60, h: 60, strokeWidth: 8 }),
          newShapeObject({ shape: "rect", x: 760, y: 180, w: 70, h: 60, fill: "none", strokeColor: INK, strokeWidth: 8, cornerRadius: 6 }),
          txt({ text: "CLIP", x: 80, y: 300, w: 240, size: 40, weight: 600, align: "center" }),
          txt({ text: "TAG", x: 380, y: 300, w: 240, size: 40, weight: 600, align: "center" }),
          txt({ text: "FIND", x: 680, y: 300, w: 240, size: 40, weight: 600, align: "center" }),
        ],
      }),
      frame({
        duration: 2.5,
        background: INK,
        caption: "End card.",
        transitionIn: "dissolve",
        objects: [
          txt({ text: "Field notes, kept.", x: 80, y: 190, w: 840, size: 72, weight: 600, align: "center", color: PAPER }),
          txt({ text: "fieldnote.example", x: 80, y: 320, w: 840, size: 30, weight: 400, align: "center", font: "mono", color: LIME }),
        ],
      }),
    ],
  });
}

function seedsLesson(): Storyboard {
  return newStoryboard({
    title: "How Seeds Travel",
    aspect: "4:3",
    paper: "#f5f1e6",
    brief: "A five-board explainer for a primary-school science lesson on seed dispersal.",
    author: "CUTROOM starters",
    frames: [
      frame({
        duration: 3,
        background: "#ece5d2",
        caption: "Lesson 4: how do seeds travel?",
        notes: "Ask the class before revealing the next boards.",
        objects: [
          ell({ x: 760, y: 70, w: 120, h: 120, fill: LIME, strokeWidth: 0 }),
          rect({ x: 0, y: 660, w: 1000, h: 90, fill: "#cfc4a6", strokeWidth: 0 }),
          ell({ x: 200, y: 640, w: 40, h: 40, fill: "#4a5a38", strokeWidth: 0 }),
          ell({ x: 420, y: 655, w: 34, h: 34, fill: "#4a5a38", strokeWidth: 0 }),
          ell({ x: 610, y: 632, w: 44, h: 44, fill: "#4a5a38", strokeWidth: 0 }),
          txt({ text: "How do seeds travel?", x: 100, y: 220, w: 800, size: 84, weight: 700, align: "center", font: "serif" }),
          txt({ text: "three ways, one field trip", x: 100, y: 360, w: 800, size: 32, weight: 400, align: "center", font: "mono", color: "#4a453c" }),
        ],
      }),
      frame({
        duration: 4,
        background: "#f5f1e6",
        caption: "Wind carries the light ones.",
        objects: [
          line({ x: 160, y: 200, w: 260, h: -40, strokeWidth: 6, strokeColor: "#8d8672" }),
          line({ x: 160, y: 300, w: 320, h: -30, strokeWidth: 6, strokeColor: "#8d8672" }),
          line({ x: 160, y: 400, w: 240, h: -20, strokeWidth: 6, strokeColor: "#8d8672" }),
          ell({ x: 520, y: 250, w: 56, h: 56, fill: "#4a5a38", strokeWidth: 0 }),
          line({ x: 548, y: 250, w: -60, h: -60, strokeWidth: 4, strokeColor: "#4a5a38" }),
          line({ x: 548, y: 250, w: 60, h: -60, strokeWidth: 4, strokeColor: "#4a5a38" }),
          line({ x: 548, y: 250, w: 0, h: -90, strokeWidth: 4, strokeColor: "#4a5a38" }),
          tri({ x: 700, y: 380, w: 130, h: 100, fill: "#8d8672", strokeWidth: 0 }),
          txt({ text: "dandelion", x: 480, y: 340, w: 180, size: 26, weight: 400, align: "center", font: "mono", color: "#4a453c" }),
        ],
      }),
      frame({
        duration: 4,
        background: "#e9e3d3",
        caption: "Water rafts them across.",
        objects: [
          line({ x: 80, y: 480, w: 840, h: 0, strokeWidth: 10, strokeColor: "#6d7ba3" }),
          line({ x: 140, y: 520, w: 720, h: 0, strokeWidth: 8, strokeColor: "#6d7ba3", opacity: 0.6 }),
          line({ x: 240, y: 560, w: 520, h: 0, strokeWidth: 6, strokeColor: "#6d7ba3", opacity: 0.4 }),
          ell({ x: 460, y: 430, w: 80, h: 46, fill: "#4a5a38", strokeWidth: 0 }),
          newShapeObject({ shape: "rect", x: 380, y: 300, w: 240, h: 120, fill: "#8a6b3a", strokeWidth: 0, cornerRadius: 10, opacity: 0.9 }),
          line({ x: 500, y: 300, w: 0, h: -110, strokeWidth: 8, strokeColor: "#8a6b3a" }),
          line({ x: 500, y: 190, w: 110, h: 70, strokeWidth: 6, strokeColor: "#8a6b3a" }),
        ],
      }),
      frame({
        duration: 4,
        background: "#f5f1e6",
        caption: "Animals carry and drop them.",
        objects: [
          rect({ x: 700, y: 240, w: 70, h: 300, fill: "#4a453c", strokeWidth: 0 }),
          ell({ x: 620, y: 120, w: 230, h: 180, fill: "#4a5a38", strokeWidth: 0 }),
          ell({ x: 300, y: 420, w: 56, h: 56, fill: "none", strokeColor: INK, strokeWidth: 8 }),
          line({ x: 328, y: 476, w: 0, h: 120, strokeWidth: 10 }),
          line({ x: 328, y: 510, w: -60, h: 60, strokeWidth: 8 }),
          line({ x: 328, y: 510, w: 60, h: 60, strokeWidth: 8 }),
          ell({ x: 420, y: 560, w: 36, h: 36, fill: "#c96f4a", strokeWidth: 0 }),
          line({ x: 400, y: 640, w: 100, h: 0, strokeWidth: 5, strokeColor: "#4a453c" }),
        ],
      }),
      frame({
        duration: 3,
        background: LIME,
        caption: "Wind, water, animals.",
        notes: "Class prompt: which seed travels farthest, and why?",
        objects: [
          newShapeObject({ shape: "rect", x: 90, y: 180, w: 240, h: 240, fill: "#f5f1e6", strokeColor: INK, strokeWidth: 6, cornerRadius: 10 }),
          newShapeObject({ shape: "rect", x: 380, y: 180, w: 240, h: 240, fill: "#f5f1e6", strokeColor: INK, strokeWidth: 6, cornerRadius: 10 }),
          newShapeObject({ shape: "rect", x: 670, y: 180, w: 240, h: 240, fill: "#f5f1e6", strokeColor: INK, strokeWidth: 6, cornerRadius: 10 }),
          line({ x: 140, y: 280, w: 140, h: -60, strokeWidth: 8 }),
          line({ x: 430, y: 340, w: 140, h: 0, strokeWidth: 8 }),
          ell({ x: 740, y: 280, w: 100, h: 100, fill: "none", strokeColor: INK, strokeWidth: 8 }),
          txt({ text: "WIND", x: 90, y: 480, w: 240, size: 40, weight: 600, align: "center" }),
          txt({ text: "WATER", x: 380, y: 480, w: 240, size: 40, weight: 600, align: "center" }),
          txt({ text: "ANIMALS", x: 670, y: 480, w: 240, size: 40, weight: 600, align: "center" }),
        ],
      }),
    ],
  });
}

function lastLightGame(): Storyboard {
  return newStoryboard({
    title: "Last Light - Boss Intro",
    aspect: "16:9",
    paper: "#1d1b18",
    brief: "Cinematic intro for the lighthouse keeper fight. Five boards for the team review build.",
    author: "CUTROOM starters",
    frames: [
      frame({
        shot: "WIDE",
        duration: 3,
        background: "#14120f",
        caption: "EXT. LIGHTHOUSE ARENA - DUSK.",
        notes: "Slow crane down. Wind loop starts under the logo sting.",
        objects: [
          rect({ x: 60, y: 180, w: 60, h: 380, fill: "#26231e", strokeWidth: 0 }),
          rect({ x: 880, y: 140, w: 70, h: 420, fill: "#26231e", strokeWidth: 0 }),
          rect({ x: 950, y: 120, w: 30, h: 60, fill: "#26231e", strokeWidth: 0 }),
          line({ x: 0, y: 470, w: 1000, h: 0, strokeWidth: 4, strokeColor: "#3a362f" }),
          line({ x: 120, y: 540, w: 760, h: 0, strokeWidth: 3, strokeColor: "#3a362f" }),
          ell({ x: 300, y: 420, w: 400, h: 130, fill: "none", strokeColor: "#3a362f", strokeWidth: 4 }),
          rect({ x: 470, y: 90, w: 60, h: 380, fill: "#2e2a25", strokeWidth: 0 }),
          ell({ x: 450, y: 70, w: 100, h: 40, fill: LIME, strokeWidth: 0, opacity: 0.9 }),
        ],
      }),
      frame({
        shot: "MEDIUM",
        duration: 2.5,
        background: "#1d1b18",
        caption: "The keeper wakes.",
        notes: "Scale contrast is the shot: she is small, it is not.",
        transitionIn: "dissolve",
        objects: [
          ell({ x: 150, y: 300, w: 60, h: 60, fill: "none", strokeColor: "#c9c2b0", strokeWidth: 6 }),
          line({ x: 180, y: 360, w: 0, h: 110, strokeWidth: 8, strokeColor: "#c9c2b0" }),
          line({ x: 180, y: 470, w: -40, h: 90, strokeWidth: 6, strokeColor: "#c9c2b0" }),
          line({ x: 180, y: 470, w: 40, h: 90, strokeWidth: 6, strokeColor: "#c9c2b0" }),
          newShapeObject({ shape: "rect", x: 560, y: 60, w: 320, h: 500, fill: "#0f0e0c", strokeColor: "#3a362f", strokeWidth: 6, cornerRadius: 40 }),
          ell({ x: 660, y: 150, w: 120, h: 44, fill: LIME, strokeWidth: 0 }),
        ],
      }),
      frame({
        shot: "INSERT",
        duration: 1.5,
        background: "#14120f",
        caption: "UI: the boss bar reveals.",
        objects: [
          newShapeObject({ shape: "rect", x: 140, y: 200, w: 720, h: 130, fill: "#1d1b18", strokeColor: "#4a453c", strokeWidth: 4, cornerRadius: 8 }),
          txt({ text: "THE KEEPER", x: 170, y: 225, w: 400, size: 36, weight: 600, font: "mono", color: "#f2ede3", letterSpacing: 0.08 }),
          rect({ x: 170, y: 280, w: 660, h: 20, fill: "#3a362f", strokeWidth: 0 }),
          rect({ x: 170, y: 280, w: 430, h: 20, fill: LIME, strokeWidth: 0 }),
        ],
      }),
      frame({
        shot: "CLOSE",
        duration: 0.6,
        background: LIME,
        caption: "CLASH - one white flash.",
        notes: "Single-frame flash. Cut, do not fade.",
        transitionIn: "cut",
        objects: [
          line({ x: 500, y: 280, w: -360, h: 0, strokeWidth: 10, strokeColor: INK }),
          line({ x: 500, y: 280, w: 360, h: 0, strokeWidth: 10, strokeColor: INK }),
          line({ x: 500, y: 280, w: 0, h: -220, strokeWidth: 10, strokeColor: INK }),
          line({ x: 500, y: 280, w: 0, h: 220, strokeWidth: 10, strokeColor: INK }),
          line({ x: 500, y: 280, w: -240, h: -160, strokeWidth: 8, strokeColor: INK }),
          line({ x: 500, y: 280, w: 240, h: -160, strokeWidth: 8, strokeColor: INK }),
          line({ x: 500, y: 280, w: -240, h: 160, strokeWidth: 8, strokeColor: INK }),
          line({ x: 500, y: 280, w: 240, h: 160, strokeWidth: 8, strokeColor: INK }),
          ell({ x: 460, y: 240, w: 80, h: 80, fill: INK, strokeWidth: 0 }),
        ],
      }),
      frame({
        shot: "WIDE",
        duration: 3.5,
        background: "#14120f",
        caption: "The light goes out.",
        notes: "Smoke drifts left. Beam off. Hold for the title.",
        transitionIn: "dissolve",
        objects: [
          rect({ x: 470, y: 90, w: 60, h: 380, fill: "#26231e", strokeWidth: 0 }),
          tri({ x: 430, y: 100, w: 140, h: 90, fill: "#26231e", strokeWidth: 0 }),
          ell({ x: 240, y: 420, w: 260, h: 90, fill: "#3a362f", strokeWidth: 0, opacity: 0.7 }),
          ell({ x: 520, y: 450, w: 320, h: 80, fill: "#3a362f", strokeWidth: 0, opacity: 0.5 }),
          ell({ x: 100, y: 470, w: 200, h: 60, fill: "#3a362f", strokeWidth: 0, opacity: 0.4 }),
          line({ x: 0, y: 540, w: 1000, h: 0, strokeWidth: 4, strokeColor: "#0f0e0c" }),
        ],
      }),
    ],
  });
}

export interface StarterTemplate {
  id: string;
  label: string;
  description: string;
  build: () => Storyboard;
}

export const STARTER_TEMPLATES: readonly StarterTemplate[] = [
  { id: "short-film", label: "Short-film beats", description: "Six frames, night exterior to dawn. 16:9.", build: nightShift },
  { id: "product-launch", label: "Product launch", description: "Five frames for a launch social cut. 16:9.", build: fieldnoteLaunch },
  { id: "lesson", label: "Lesson explainer", description: "Five teaching boards with a class prompt. 4:3.", build: seedsLesson },
  { id: "game-cinematic", label: "Game cinematic", description: "Boss-intro boards with a flash frame. 16:9.", build: lastLightGame },
];

export function buildStarterLibrary(): Storyboard[] {
  return STARTER_TEMPLATES.map((t) => t.build());
}
