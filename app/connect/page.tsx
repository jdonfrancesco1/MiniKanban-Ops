import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { MCP_ALIAS_PATH, MCP_AUTOSCALE_URL, MCP_PUBLIC_PATH } from "@/lib/mcp/lookup"
import { MCP_TOOL_NAMES } from "@/lib/mcp/tools"

const CURSOR_SNIPPET = `{
  "mcpServers": {
    "minikanban-ops": {
      "url": "${MCP_AUTOSCALE_URL}",
      "headers": {
        "Authorization": "Bearer <OPS_BOARD_SECRET>"
      }
    }
  }
}`

const GROK_SNIPPET = `AddMcpServer
  name: minikanban-ops
  url: ${MCP_AUTOSCALE_URL}
  transport: streamable-http
  headers:
    Authorization: Bearer <OPS_BOARD_SECRET from connector env>`

export default function ConnectPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a0b2e] text-white">
      <SiteHeader />
      <main className="flex-1">
        <section className="w-full py-16 md:py-20">
          <div className="container px-4 md:px-6 max-w-3xl space-y-10">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.2em] text-pink-300">Remote MCP</p>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Connect Grok Bot / Cursor
              </h1>
              <p className="text-white/70 text-lg max-w-2xl">
                CRUD the Ops board without SSH and without putting{" "}
                <code className="text-pink-300">OPS_BOARD_SECRET</code> in chat tool arguments. The
                connector stores the secret; tools never take it as a parameter.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#2a1b3e] p-6 space-y-3">
              <h2 className="text-xl font-semibold text-pink-400">Custom MCP URL</h2>
              <p className="text-white/70">
                Streamable HTTP on Autoscale. Alias:{" "}
                <code className="text-pink-300">https://mini-kanban-ops.replit.app{MCP_ALIAS_PATH}</code>
                .
              </p>
              <pre className="overflow-x-auto rounded-md bg-black/40 p-4 text-sm text-orange-100">
                {MCP_AUTOSCALE_URL}
              </pre>
              <p className="text-white/50 text-sm">
                Local: <code>http://localhost:3000{MCP_PUBLIC_PATH}</code>
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#2a1b3e] p-6 space-y-3">
              <h2 className="text-xl font-semibold text-pink-400">Secret</h2>
              <ul className="list-disc pl-5 space-y-2 text-white/70">
                <li>
                  Env name: <code className="text-pink-300">OPS_BOARD_SECRET</code> (same secret as
                  the board login /{" "}
                  <code className="text-pink-300">/api/ops/*</code>).
                </li>
                <li>
                  Send <code className="text-pink-300">Authorization: Bearer &lt;OPS_BOARD_SECRET&gt;</code>{" "}
                  from the MCP connector or server env only.
                </li>
                <li>Do not paste the secret into chat, tool arguments, or this page.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#2a1b3e] p-6 space-y-3">
              <h2 className="text-xl font-semibold text-pink-400">Cursor</h2>
              <p className="text-white/70">
                Settings → MCP → Add new MCP server (Streamable HTTP). Or merge into{" "}
                <code className="text-pink-300">mcp.json</code>:
              </p>
              <pre className="overflow-x-auto rounded-md bg-black/40 p-4 text-sm text-orange-100">
                {CURSOR_SNIPPET}
              </pre>
              <p className="text-white/50 text-sm">
                Replace the placeholder with the connector-stored secret. Prefer an env interpolation
                your client supports over a hardcoded value.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#2a1b3e] p-6 space-y-3">
              <h2 className="text-xl font-semibold text-pink-400">Grok Bot / Orca</h2>
              <p className="text-white/70">
                AddMcpServer against the Autoscale URL. Store{" "}
                <code className="text-pink-300">OPS_BOARD_SECRET</code> on the connector, not in
                tool args.
              </p>
              <pre className="overflow-x-auto rounded-md bg-black/40 p-4 text-sm text-orange-100">
                {GROK_SNIPPET}
              </pre>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#2a1b3e] p-6 space-y-3">
              <h2 className="text-xl font-semibold text-pink-400">Tools</h2>
              <p className="text-white/70">
                Same Neon / Helium board as <code className="text-pink-300">/api/ops/*</code>:{" "}
                {MCP_TOOL_NAMES.join(", ")}.
              </p>
              <p className="text-white/50 text-sm">
                <code>insert_task</code> is idempotent: an active card with the same title is reused.{" "}
                <code>done_task</code> moves to Done and stamps <code>completed_at</code>.
              </p>
            </div>

            <p className="text-white/50 text-sm">
              Visual board stays at{" "}
              <Link href="/boards/ops" className="text-pink-400 hover:text-pink-300">
                /boards/ops
              </Link>
              . This is dogfood for the Ops board, not a marketplace product.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
