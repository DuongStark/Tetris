import { PIECES } from "./pieces";
import type { PieceType } from "./types";

export type RandomFn = () => number;

export class RandomBag {
  private bag: PieceType[] = [];

  constructor(private readonly random: RandomFn = Math.random) {}

  draw(): PieceType {
    if (this.bag.length === 0) {
      this.bag = [...PIECES];
      for (let i = this.bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }

    return this.bag.pop() as PieceType;
  }
}
