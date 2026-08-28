export type DiffPart = {
  value: string;
  changed: boolean;
};

export type DiffSegment = {
  type: "equal" | "added" | "removed";
  text: string;
};

export function diffCharacters(oldText: string, newText: string): DiffSegment[] {
  const original = [...oldText];
  const revised = [...newText];
  const dp = Array.from({ length: original.length + 1 }, () =>
    Array(revised.length + 1).fill(0),
  );

  for (let i = original.length - 1; i >= 0; i -= 1) {
    for (let j = revised.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        original[i] === revised[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;

  const pushSegment = (type: DiffSegment["type"], char: string) => {
    const previous = segments.at(-1);
    if (previous?.type === type) {
      previous.text += char;
      return;
    }
    segments.push({ type, text: char });
  };

  while (i < original.length && j < revised.length) {
    if (original[i] === revised[j]) {
      pushSegment("equal", revised[j]);
      i += 1;
      j += 1;
    } else if (dp[i][j + 1] >= dp[i + 1][j]) {
      pushSegment("added", revised[j]);
      j += 1;
    } else {
      pushSegment("removed", original[i]);
      i += 1;
    }
  }

  while (j < revised.length) {
    pushSegment("added", revised[j]);
    j += 1;
  }

  while (i < original.length) {
    pushSegment("removed", original[i]);
    i += 1;
  }

  return segments;
}

export function createDiffParts(
  oldText: string | null,
  newText: string | null,
): DiffPart[] {
  if (newText === null) {
    return [{ value: "（削除）", changed: true }];
  }

  if (oldText === null) {
    return [{ value: newText, changed: newText.length > 0 }];
  }

  if (oldText === newText) {
    return [{ value: newText, changed: false }];
  }

  return mergeDiffParts(
    diffCharacters(oldText, newText)
      .filter((segment) => segment.type !== "removed")
      .map((segment) => ({
        value: segment.text,
        changed: segment.type === "added",
      })),
  );
}

function mergeDiffParts(parts: DiffPart[]): DiffPart[] {
  const merged: DiffPart[] = [];

  for (const part of parts) {
    const previous = merged.at(-1);
    if (previous && previous.changed === part.changed) {
      previous.value += part.value;
      continue;
    }

    merged.push({ ...part });
  }

  return merged;
}
