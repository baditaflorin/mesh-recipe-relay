async function nextCook(a, b) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await a.locator('[data-turn-state="my-turn"]').isVisible()) return [a, b];
    if (await b.locator('[data-turn-state="my-turn"]').isVisible()) return [b, a];
    await a.waitForTimeout(150);
  }
  throw new Error("No cook received the relay turn");
}

export default async function recipeRelay(a, b) {
  await a.getByLabel("Cook name").fill("Ari");
  await b.getByLabel("Cook name").fill("Bea");
  const [first, second] = await nextCook(a, b);
  await first.getByLabel("Next instruction").fill("Toast the cumin until fragrant.");
  await first.getByRole("button", { name: "Add instruction" }).click();
  await second.waitForTimeout(800);
  await second.getByLabel("Next instruction").fill("Stir in tomatoes and simmer for five minutes.");
  await second.getByRole("button", { name: "Add instruction" }).click();
  await first.waitForTimeout(1200);
}
