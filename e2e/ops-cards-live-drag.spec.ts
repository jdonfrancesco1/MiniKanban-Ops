import { expect, test, type Locator, type Page } from "@playwright/test"
import { taskShortId } from "../lib/task-short-id"

async function startCardDrag(page: Page, card: Locator) {
  const handle = card.getByTestId("kanban-card-title")
  await handle.scrollIntoViewIfNeeded()
  const box = await handle.boundingBox()
  if (!box) throw new Error("missing card title geometry")
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 16, y + 12, { steps: 8 })
  await expect(page.getByTestId("kanban-drag-overlay")).toBeVisible()
  return { x: x + 16, y: y + 12 }
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
    const persistCalls: string[] = []
    page.on("request", (request) => {
      if (request.method() !== "GET" && !request.url().includes("/_next/")) {
        persistCalls.push(`${request.method()} ${request.url()}`)
      }
    })

    await page.goto("/preview/ops-cards")
    await expect(page.getByTestId("kanban-board")).toBeVisible()
    const card = page.locator('[data-testid="ops-task-card"][data-task-id="done-rotate"]')
    const dest = page.locator('[data-testid="kanban-column-drop"][data-column-id="need-you"]')
    await expect(card).toBeVisible()

    const start = await startCardDrag(page, card)
    const destBox = await dest.boundingBox()
    if (!destBox) throw new Error("missing destination geometry")
    const destX = destBox.x + destBox.width / 2
    const destY = destBox.y + Math.min(80, destBox.height / 2)
    const overlay = page.getByTestId("kanban-drag-overlay")
    await page.mouse.move((start.x + destX) / 2, (start.y + destY) / 2, { steps: 12 })
    const overlayBox = await overlay.boundingBox()
    if (!overlayBox) throw new Error("overlay had no box")
    expect(Math.abs(overlayBox.x + overlayBox.width / 2 - (start.x + destX) / 2)).toBeLessThan(160)
    await page.mouse.move(destX, destY, { steps: 14 })
    await page.mouse.up()

    await expect(page.locator('[data-column-id="need-you"] [data-task-id="done-rotate"]')).toBeVisible({
      timeout: 250,
    })
    await expect(page.locator('[data-column-id="done"] [data-task-id="done-rotate"]')).toHaveCount(0)
    expect(persistCalls.filter((url) => /\/api\/ops\/|moveTask/.test(url))).toEqual([])
  })

  test("in-column reorder updates order immediately", async ({ page }) => {
    await page.goto("/preview/ops-cards")
    await expect(page.getByTestId("kanban-board")).toBeVisible()
    const needYou = page.locator('[data-testid="kanban-column-drop"][data-column-id="need-you"]')
    const cards = needYou.locator('[data-testid="ops-task-card"]')
    const first = cards.first()
    const last = cards.last()
    const firstId = await first.getAttribute("data-task-id")
    const lastId = await last.getAttribute("data-task-id")
    expect(firstId && lastId && firstId !== lastId).toBeTruthy()

    await startCardDrag(page, first)
    const to = await last.boundingBox()
    if (!to) throw new Error("missing reorder geometry")
    await page.mouse.move(to.x + to.width / 2, to.y + to.height - 8, { steps: 18 })
    await page.mouse.up()

    await expect
      .poll(async () => needYou.locator('[data-testid="ops-task-card"]').first().getAttribute("data-task-id"), {
        timeout: 250,
      })
      .not.toBe(firstId)
  })
})
