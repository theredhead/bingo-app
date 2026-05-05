export const AVATARS: readonly string[] = [
  // Animals
  "🦊",
  "🐻",
  "🐯",
  "🦁",
  "🐺",
  "🦝",
  "🐸",
  "🐙",
  "🦄",
  "🐲",
  "🦋",
  "🐼",
  "🐨",
  "🦦",
  "🦥",
  "🐮",
  "🐷",
  "🐔",
  "🐧",
  "🦅",
  "🦉",
  "🦇",
  "🐗",
  "🐰",
  "🐹",
  "🐭",
  "🐱",
  "🐶",
  "🦨",
  "🦡",
  "🦫",
  "🦘",
  "🦙",
  "🐪",
  "🦒",
  "🦓",
  "🦏",
  "🐘",
  "🦛",
  "🦍",
  "🦧",
  "🐆",
  "🐅",
  "🐃",
  "🦬",
  "🦌",
  "🐓",
  "🦃",
  "🦤",
  "🦚",
  "🦜",
  "🦢",
  "🦩",
  "🐊",
  "🐢",
  "🦎",
  "🐍",
  "🐉",
  "🦕",
  "🦖",
  "🦈",
  "🐬",
  "🐳",
  "🦭",
  "🦑",
  "🦞",
  "🦀",
  "🐡",
  "🐠",
  // Faces & people
  "👑",
  "🤠",
  "😎",
  "🥷",
  "👻",
  "💀",
  "👽",
  "🤖",
  "🧙",
  "🧛",
  "🧟",
  "🧜",
  "🧝",
  "🧞",
  "🧚",
  "🧑‍🚀",
  "🧑‍🎤",
  "🧑‍🎨",
  "🧑‍⚖️",
  "🧑‍🍳",
  "🧑‍🔬",
  "🧑‍🏫",
  "🧑‍🚒",
  "🧑‍✈️",
  "🥸",
  "🤡",
  "😈",
  "👿",
  "🤑",
  "🤩",
  "🥳",
  "😤",
  // Casino & cards
  "🎩",
  "🃏",
  "🎰",
  "🎲",
  "♠️",
  "♥️",
  "♦️",
  "♣️",
  "🎯",
  "🎭",
  "🎪",
  "🎠",
  // Nature & elements
  "🌵",
  "🍀",
  "🔥",
  "⚡",
  "💎",
  "🌊",
  "❄️",
  "🌪️",
  "🌙",
  "☀️",
  "🌈",
  "⭐",
  "🌟",
  "💥",
  "🍄",
  "🌺",
  "🌸",
  "🌻",
  "🌍",
  "🪐",
  "☄️",
  "🌋",
  "🏔️",
  "🗻",
  // Objects & misc
  "🚀",
  "🛸",
  "⚔️",
  "🛡️",
  "🏆",
  "💰",
  "💣",
  "🎸",
  "🎺",
  "🥁",
  "🎻",
  "🪗",
  "🎷",
  "🎙️",
  "🎤",
  "🎬",
  "🧲",
  "💡",
  "🔮",
  "🧿",
  "🪬",
  "🧸",
  "🪆",
  "🎎",
  "🪅",
  "🎑",
  "🧧",
  "🎀",
  "🎁",
  "🪄",
  "🎃",
  "🪩",
  "🦺",
  "🥊",
  "🤿",
  "🎿",
  "🏋️",
  "🤺",
  "🧗",
  "🏄",
];

/** Extract the leading emoji from a displayName like "🦊 Kris" */
export function avatarOf(name: string): string {
  if (!name) return "👤";
  if (name.startsWith("Bot")) return "🤖";
  const cp = name.codePointAt(0) ?? 0;
  if (cp > 0x00ff) return String.fromCodePoint(cp);
  return "👤";
}

/** Extract just the name part: "🦊 Kris" → "Kris" */
export function nameOf(name: string): string {
  if (!name) return name;
  const cp = name.codePointAt(0) ?? 0;
  if (cp > 0x00ff)
    return name.slice(String.fromCodePoint(cp).length).trimStart();
  return name;
}

export function formatCard(c: string): string {
  if (!c || c.length < 2) return c;
  const rank = c[0] === "T" ? "10" : c[0];
  const suits: Record<string, string> = { h: "♥", d: "♦", c: "♣", s: "♠" };
  return rank + (suits[c[1]] ?? c[1]);
}

export function cardRank(c: string): string {
  return formatCard(c).slice(0, -1);
}

export function cardSuit(c: string): string {
  return formatCard(c).slice(-1);
}

export function isRedCard(c: string): boolean {
  return c?.[1] === "h" || c?.[1] === "d";
}
