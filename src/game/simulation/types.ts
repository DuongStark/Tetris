export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const NEXT_QUEUE_SIZE = 5;

export type PieceType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
export type Rotation = 0 | 1 | 2 | 3;
export type BoardCell = PieceType | null;
export type Board = BoardCell[][];

export type InputAction =
  | "moveLeft"
  | "moveRight"
  | "softDrop"
  | "rotateCW"
  | "hardDrop"
  | "hold"
  | "pause"
  | "restart";

export type GameStatus = "ready" | "playing" | "paused" | "gameOver";

export interface ActivePiece {
  type: PieceType;
  x: number;
  y: number;
  rotation: Rotation;
}

export interface Settings {
  motionIntensity: "full" | "reduced";
  sound: boolean;
  reducedMotion: boolean;
  controlScale: number;
}

export interface GameState {
  board: Board;
  active: ActivePiece;
  hold: PieceType | null;
  holdUsed: boolean;
  next: PieceType[];
  score: number;
  level: number;
  lines: number;
  combo: number;
  status: GameStatus;
}

export type GameEvent =
  | { type: "pieceLocked"; piece: PieceType }
  | { type: "lineCleared"; lines: number; rows: number[] }
  | { type: "tetris"; rows: number[] }
  | { type: "comboChanged"; combo: number }
  | { type: "levelUp"; level: number }
  | { type: "holdUsed"; hold: PieceType; active: PieceType }
  | { type: "gameOver" };

export interface CellPosition {
  x: number;
  y: number;
}
