// Add these functions to components/rich-text-editor.tsx

// Helper to apply formats (bold, italic) to content string
// This is a simplified version; a proper one would handle overlapping/nested formats.
const applyHtmlFormats = (content: string, formats: RichTextBlock["formats"]): string => {
  let result = content
  // Ensure formats exist and are arrays
  const italics = Array.isArray(formats?.italic) ? formats.italic : []
  const bolds = Array.isArray(formats?.bold) ? formats.bold : []

  // Apply italic first, then bold, by sorting descending by start index to avoid index shifts
  ;[...italics]
    .sort((a, b) => b[0] - a[0])
    .forEach((range) => {
      if (range.length === 2 && typeof range[0] === "number" && typeof range[1] === "number") {
        result =
          result.slice(0, range[0]) + `<em>` + result.slice(range[0], range[1]) + `</em>` + result.slice(range[1])
      }
    })
  ;[...bolds]
    .sort((a, b) => b[0] - a[0])
    .forEach((range) => {
      if (range.length === 2 && typeof range[0] === "number" && typeof range[1] === "number") {
        result =
          result.slice(0, range[0]) +
          `<strong>` +
          result.slice(range[0], range[1]) +
          `</strong>` +
          result.slice(range[1])
      }
    })
  return result
}

export const renderBlocksToHtml = (blocks: RichTextBlock[]): string => {
  if (!blocks || blocks.length === 0) return ""

  let html = ""
  let currentListType: "bulletList" | "numberedList" | null = null
  let listIndentLevel = 0

  blocks.forEach((block) => {
    const style: string[] = []
    if (block.alignment && block.alignment !== "left") {
      style.push(`text-align: ${block.alignment};`)
    }
    // Indentation for list items is handled by nesting <ul>/<ol> or CSS if flat
    // For paragraphs, margin-left can be used.
    if (block.type === "paragraph" && block.indentLevel > 0) {
      style.push(`margin-left: ${block.indentLevel * 20}px;`)
    }
    const styleAttr = style.length > 0 ? ` style="${style.join(" ")}"` : ""
    const formattedContent = applyHtmlFormats(block.content, block.formats)

    if (block.type === "bulletList" || block.type === "numberedList") {
      const listTag = block.type === "bulletList" ? "ul" : "ol"
      const closeListTag = block.type === "bulletList" ? "</ul>" : "</ol>"

      if (block.type !== currentListType || block.indentLevel !== listIndentLevel) {
        // Close existing lists if type changes or indent level decreases
        while (listIndentLevel >= block.indentLevel || (currentListType && block.type !== currentListType)) {
          if (!currentListType) break // Should not happen if listIndentLevel > 0
          html += currentListType === "bulletList" ? `</ul>` : `</ol>`
          listIndentLevel--
          if (listIndentLevel < 0) listIndentLevel = 0 // Safety
          // If indent level is 0, currentListType should be null
          if (listIndentLevel === 0) currentListType = null
          // If indent level still > 0, we need to know the type of the parent list. This simplified logic might not perfectly reconstruct parent list type.
          // For now, assume if indent level changes, we reset type.
        }
        // Open new lists if indent level increases
        while (listIndentLevel < block.indentLevel) {
          html += `<${listTag}>` // Use current block's list type
          listIndentLevel++
        }
        // If type changed at same indent level, or starting a new list
        if (block.type !== currentListType) {
          if (currentListType) html += currentListType === "bulletList" ? `</ul>` : `</ol>` // Close previous type
          html += `<${listTag}>` // Open new type
        }
        currentListType = block.type
        listIndentLevel = block.indentLevel // Set current indent
      }
      html += `<li${styleAttr}>${formattedContent}</li>` // Style attribute might be redundant if using nested lists for indent
    } else {
      // paragraph
      // Close any open list
      while (listIndentLevel > 0 && currentListType) {
        html += currentListType === "bulletList" ? `</ul>` : `</ol>`
        listIndentLevel--
      }
      currentListType = null
      listIndentLevel = 0
      html += `<p${styleAttr}>${formattedContent}</p>`
    }
  })

  // Close any remaining open lists
  while (listIndentLevel > 0 && currentListType) {
    html += currentListType === "bulletList" ? `</ul>` : `</ol>`
    listIndentLevel--
  }
  return html
}
