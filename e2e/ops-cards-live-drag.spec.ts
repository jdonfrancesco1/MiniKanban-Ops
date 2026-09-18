import { expect, test, type Page } from "@playwright/test"
import { taskShortId } from "../lib/task-short-id"

async function dragCard(page: Page, cardId: string, destColumnId: string) {
  const card = page.locator(`[data-testid="ops-task-card"][data-task-id="${cardId}"]`)
  const dest = page.locator(`[data-testid="kanban-column-drop"][data-column-id="${destColumnId}"]`)
  const from = await card.boundingBox()
  const to = await dest.boundingBox()
  if (!from || !to) throw new Error("missing drag geometry")

  const startX = from.x + from.width / 2
  const startY = from.y + Math.min(24, from.height / 2)
  const destX = to.x + to.width / 2
  const destY = to.y + Math.min(40, to.height / 2)

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  const midX = startX + (destX - startX) * 0.55
  const midY = startY + (destY - startY) * 0.55
  await page.mouse.move(midX, midY, { steps: 16 })
  const overlay = page.getByTestId("kanban-drag-overlay")
  await expect(overlay).toBeVisible()
  const overlayBox = await overlay.boundingBox()
  if (!overlayBox) throw new Error("overlay had no box")
  expect(Math.abs(overlayBox.x + overlayBox.width / 2 - midX)).toBeLessThan(140)
  expect(Math.abs(overlayBox.y + overlayBox.height / 2 - midY)).toBeLessThan(160)
  await page.mouse.move(destX, destY, { steps: 12 })
  await page.mouse.up()
}

test.describe("ops cards live drag + short ids", () => {
  test("every card shows a stable MKB- short id", async ({ page }) => {
    await page.goto("/preview/ops-cards")
    const cards = page.locator('[data-testid="ops-task-card"]')
    await expect(cards.first()).toBeVisible()
    const count = await cards.count()
    expect(count).toBeGreaterThan(3)

    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index)
      const taskId = await card.getAttribute("data-task-id")
      expect(taskId).toBeTruthy()
      const badge = card.getByTestId("task-short-id")
      await expect(badge).toHaveText(taskShortId(taskId!))
      await expect(badge).toHaveAttribute("data-short-id", taskShortId(taskId!))
    }
  })

  test("cross-column drop updates the destination before any network round-trip", async ({ page }) => {
    const networkCalls: string[] = []
    page.on("request", (request) => {
      if (request.method() !== "GET" && !request.url().includes("/_next/")) {
        networkCalls.push(`${request.method()} ${request.url()}`)
      }
    })

    await page.goto("/preview/ops-cards")
    const done = page.locator('[data-column-id="done"]')
    const needYou = page.locator('[data-column-id="need-you"]')
    await expect(done.locator('[data-task-id="done-rotate"]')).toBeVisible()

    await dragCard(page, "done-rotate", "need-you")

    await expect(needYou.locator('[data-task-id="done-rotate"]')).toBeVisible({ timeout: 250 })
    await expect(done.locator('[data-task-id="done-rotate"]')).toHaveCount(0)
    expect(networkCalls.filter((url) => /\/api\/|\/boards\//.test(url))).toEqual([])
  })

  test("in-column reorder updates order immediately", async ({ page }) => {
    await page.goto("/preview/ops-cards")
    const needYou = page.locator('[data-testid="kanban-column-drop"][data-column-id="need-you"]')
    const cards = needYou.locator('[data-testid="ops-task-card"]')
    const firstId = await cards.first().getAttribute("data-task-id")
    const lastId = await cards.last().getAttribute("data-task-id")
    expect(firstId && lastId && firstId !== lastId).toBeTruthy()

    const from = await cards.first().boundingBox()
    const to = await cards.last().boundingBox()
    if (!from || !to) throw new Error("missing reorder geometry")

    await page.mouse.move(from.x + from.width / 2, from.y + 16)
    await page.mouse.down()
    await page.mouse.move(to.x + to.width / 2, to.y + to.height - 6, { steps: 18 })
    await expect(page.getByTestId("kanban-drag-overlay")).toBeVisible()
    await page.mouse.up()

    await expect.poll(async () => {
      return needYou.locator('[data-testid="ops-task-card"]').first().getAttribute("data-task-id")
    }, { timeout: 250 }).not.toBe(firstId)
  })
})
