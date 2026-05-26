const escapeHtmlMap = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#039;"],
]);

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => escapeHtmlMap.get(char));
}

export function diffCharacters(originalText, revisedText) {
  const original = [...originalText];
  const revised = [...revisedText];
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

  const segments = [];
  let i = 0;
  let j = 0;

  function pushSegment(type, char) {
    const previous = segments.at(-1);
    if (previous?.type === type) {
      previous.text += char;
      return;
    }
    segments.push({ type, text: char });
  }

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

export function summarizeDiff(segments) {
  return {
    hasDiff: segments.some((segment) => segment.type !== "equal"),
    addedText: segments
      .filter((segment) => segment.type === "added")
      .map((segment) => segment.text)
      .join(""),
    removedText: segments
      .filter((segment) => segment.type === "removed")
      .map((segment) => segment.text)
      .join(""),
  };
}

export function renderRevisedPreviewHtml(segments) {
  return segments
    .filter((segment) => segment.type !== "removed")
    .map((segment) => {
      const text = escapeHtml(segment.text).replace(/\n/g, "<br>");
      if (segment.type === "added") {
        return `<span class="diff-added">${text}</span>`;
      }
      return text;
    })
    .join("");
}

export function renderChangeReviewHtml(segments) {
  return segments
    .map((segment) => {
      const text = escapeHtml(segment.text).replace(/\n/g, "<br>");
      if (segment.type === "added") {
        return `<span class="diff-added">${text}</span>`;
      }
      if (segment.type === "removed") {
        return `<span class="diff-removed">${text}</span>`;
      }
      return text;
    })
    .join("");
}
