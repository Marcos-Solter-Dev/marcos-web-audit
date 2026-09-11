export function compareReports(previous, current) {
  const previousCategories = previous.categoryScores ?? {};
  const currentCategories = current.categoryScores ?? {};
  const categoryNames = [...new Set([...Object.keys(previousCategories), ...Object.keys(currentCategories)])].sort();

  return {
    scoreDelta: current.score - Number(previous.score ?? 0),
    previousScore: Number(previous.score ?? 0),
    currentScore: current.score,
    categories: categoryNames.map((category) => ({
      category,
      previous: previousCategories[category] ?? null,
      current: currentCategories[category] ?? null,
      delta: previousCategories[category] == null || currentCategories[category] == null
        ? null
        : currentCategories[category] - previousCategories[category]
    })),
    newIssues: issueKeys(current.items).filter((key) => !issueKeys(previous.items ?? []).includes(key)),
    fixedIssues: issueKeys(previous.items ?? []).filter((key) => !issueKeys(current.items).includes(key))
  };
}

function issueKeys(items) {
  return items
    .filter((item) => item.severity === 'warning' || item.severity === 'fail')
    .map((item) => `${item.category}:${item.id}`);
}
