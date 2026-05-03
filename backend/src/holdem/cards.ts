const RANKS = "23456789TJQKA";
const SUITS = "hdcs";

export function makeDeck(): string[] {
  const deck: string[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(r + s);
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rankVal(r: string): number {
  return RANKS.indexOf(r);
}

function evaluateFiveCards(cards: string[]): number {
  const rv = cards.map((c) => rankVal(c[0])).sort((a, b) => b - a);
  const sv = cards.map((c) => c[1]);
  const isFlush = sv.every((s) => s === sv[0]);
  const isWheel =
    rv[0] === 12 && rv[1] === 3 && rv[2] === 2 && rv[3] === 1 && rv[4] === 0;
  const isStraight =
    rv.every((v, i) => i === 0 || v === rv[i - 1] - 1) || isWheel;

  const counts = new Map<number, number>();
  for (const v of rv) counts.set(v, (counts.get(v) || 0) + 1);
  const groups = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );
  const g = groups.map((x) => x[1]);

  const top = isWheel ? 3 : groups[0][0]; // wheel straight tops at 5-high
  const base = rv.reduce((s, v, i) => s + v * Math.pow(13, 4 - i), 0);

  if (isFlush && isStraight) return 8e10 + top;
  if (g[0] === 4) return 7e10 + groups[0][0] * 1e8 + groups[1][0];
  if (g[0] === 3 && g[1] === 2) return 6e10 + groups[0][0] * 1e8 + groups[1][0];
  if (isFlush) return 5e10 + base;
  if (isStraight) return 4e10 + top;
  if (g[0] === 3)
    return 3e10 + groups[0][0] * 1e8 + groups[1][0] * 1e4 + groups[2][0];
  if (g[0] === 2 && g[1] === 2) {
    const hi = Math.max(groups[0][0], groups[1][0]);
    const lo = Math.min(groups[0][0], groups[1][0]);
    return 2e10 + hi * 1e8 + lo * 1e4 + groups[2][0];
  }
  if (g[0] === 2)
    return (
      1e10 +
      groups[0][0] * 1e8 +
      groups[1][0] * 1e6 +
      groups[2][0] * 1e4 +
      groups[3][0]
    );
  return base;
}

export function bestHandScore(cards: string[]): number {
  const n = cards.length;
  let best = -1;
  for (let i = 0; i < n - 4; i++)
    for (let j = i + 1; j < n - 3; j++)
      for (let k = j + 1; k < n - 2; k++)
        for (let l = k + 1; l < n - 1; l++)
          for (let m = l + 1; m < n; m++) {
            const s = evaluateFiveCards([
              cards[i],
              cards[j],
              cards[k],
              cards[l],
              cards[m],
            ]);
            if (s > best) best = s;
          }
  return best;
}

export function handName(score: number): string {
  const cat = Math.floor(score / 1e10);
  return (
    [
      "High Card",
      "One Pair",
      "Two Pair",
      "Three of a Kind",
      "Straight",
      "Flush",
      "Full House",
      "Four of a Kind",
      "Straight Flush",
    ][cat] || "High Card"
  );
}
