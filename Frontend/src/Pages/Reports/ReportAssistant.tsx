import React, { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles, Zap, TrendingUp, Package, DollarSign, Target, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { reportAIAPI } from '../../services/api'

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  role: ChatRole
  content: string
}

interface ReportChatbotContext {
  dateRange: { from: string; to: string }
  summary: {
    totalSales: number
    totalOrders: number
    totalItemsSold: number
    avgOrderValue: number
    cogs: number
    grossProfit: number
    grossMargin: number
    totalPurchaseCost: number
    outstandingReceivables: number
    outstandingPayables: number
    scheduledTotal: number
  }
  fastMovingProducts: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  profitableProducts: Array<{
    name: string
    quantity: number
    revenue: number
    estimatedCost: number
    estimatedProfit: number
    margin: number
  }>
  lowStockItems: Array<{
    name: string
    stock: number
    reorderLevel: number
    category?: string
  }>
  topSuppliers: Array<{
    name: string
    spend: number
    orders: number
  }>
  categorySales: Array<{
    name: string
    value: number
  }>
  dailySalesData: Array<{
    date: string
    sales: number
    orders: number
    items: number
  }>
  customerRetention?: any
}

interface ReportChatbotProps {
  reportContext: ReportChatbotContext
}

const starterMessages: ChatMessage[] = [
  {
    role: 'assistant',
    content:
      'I can turn your report data into executive summaries, product recommendations, and decision-ready insights. Ask me for a sales report, profitable products, fast movers, cash-flow risks, or a business action plan.',
  },
]

const promptSuggestions = [
  {
    label: 'Generate sales report',
    icon: <Sparkles className="w-4 h-4" />,
    prompt: 'Generate a concise sales report for this date range with executive summary, fast-moving products, profitable products, and actions I should take next.',
  },
  {
    label: 'Fast-moving products',
    icon: <TrendingUp className="w-4 h-4" />,
    prompt: 'Which products are moving fastest, and what should I reorder or promote to keep sales up?',
  },
  {
    label: 'Profitable products',
    icon: <DollarSign className="w-4 h-4" />,
    prompt: 'Identify the most profitable products and explain which ones deserve more shelf space or marketing focus.',
  },
  {
    label: 'Business insights',
    icon: <Target className="w-4 h-4" />,
    prompt: 'Give me the most important business insights from this report that would help with better decision-making.',
  },
]

const formatCurrency = (value: number) => `Rs ${value.toFixed(2)}`

const buildLocalFallbackResponse = (prompt: string, reportContext: ReportChatbotContext) => {
  const lowerPrompt = prompt.toLowerCase()
  const topFastMovers = reportContext.fastMovingProducts.slice(0, 5)
  const topProfitable = reportContext.profitableProducts.slice(0, 5)
  const lowStock = reportContext.lowStockItems.slice(0, 5)
  const bestSupplier = reportContext.topSuppliers[0]

  const sections = [
    `## Executive Summary\n${reportContext.summary.totalSales > 0 ? `The selected period generated ${formatCurrency(reportContext.summary.totalSales)} in sales across ${reportContext.summary.totalOrders} orders.` : 'No sales were recorded for the selected period.'}`,
    `## Sales Performance\n- Total Sales: ${formatCurrency(reportContext.summary.totalSales)}\n- Orders: ${reportContext.summary.totalOrders}\n- Items Sold: ${reportContext.summary.totalItemsSold}\n- Average Order Value: ${formatCurrency(reportContext.summary.avgOrderValue)}`,
    `## Fast-Moving Products\n${topFastMovers.length > 0 ? topFastMovers.map((item, index) => `${index + 1}. ${item.name} - ${item.quantity} units, ${formatCurrency(item.revenue)}`).join('\n') : 'No fast-moving product data available.'}`,
    `## Profitable Products\n${topProfitable.length > 0 ? topProfitable.map((item, index) => `${index + 1}. ${item.name} - Profit ${formatCurrency(item.estimatedProfit)} (${item.margin.toFixed(1)}% margin)`).join('\n') : 'No profitability data available.'}`,
    `## Risks and Alerts\n- Low stock items: ${lowStock.length}\n- Outstanding receivables: ${formatCurrency(reportContext.summary.outstandingReceivables)}\n- Outstanding payables: ${formatCurrency(reportContext.summary.outstandingPayables)}\n- Scheduled payments: ${formatCurrency(reportContext.summary.scheduledTotal)}`,
    `## Recommended Actions\n${lowStock.length > 0 ? `- Reorder ${lowStock[0].name} and other low stock items soon.` : '- No urgent stock reorder needed from the current snapshot.'}\n${bestSupplier ? `- Review supplier performance and spend with ${bestSupplier.name}.` : '- Review supplier performance and spend trends.'}\n${reportContext.summary.grossMargin < 20 ? '- Improve product mix and pricing to raise gross margin.' : '- Keep promoting profitable and fast-moving products.'}`,
    `## Follow-Up Questions\n- Which product line should I promote next month?\n- Which items should be reordered first?\n- Do you want a week-over-week or month-over-month summary?`,
  ]

  if (lowerPrompt.includes('recommend') || lowerPrompt.includes('suggest') || lowerPrompt.includes('advice')) {
    return `${sections[0]}\n\n${sections[4]}\n\n${sections[5]}`
  }

  if (lowerPrompt.includes('product') || lowerPrompt.includes('top') || lowerPrompt.includes('fast')) {
    return `${sections[0]}\n\n${sections[2]}\n\n${sections[3]}\n\n${sections[5]}`
  }

  if (lowerPrompt.includes('risk') || lowerPrompt.includes('stock') || lowerPrompt.includes('cash') || lowerPrompt.includes('payment')) {
    return `${sections[0]}\n\n${sections[4]}\n\n${sections[5]}`
  }

  return sections.join('\n\n')
}

const ReportAssistant: React.FC<ReportChatbotProps> = ({ reportContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const sendMessage = async (prompt?: string) => {
    const finalPrompt = (prompt ?? input).trim()
    if (!finalPrompt || isSending) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: finalPrompt }]
    setMessages(nextMessages)
    setInput('')
    setIsSending(true)

    try {
      const response = await reportAIAPI.chat({
        message: finalPrompt,
        messages: nextMessages.slice(-10),
        context: reportContext,
      })

      setMessages((current) => [...current, { role: 'assistant', content: response.reply }])
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to generate AI insight'
      console.error('AI assistant request failed:', error)
      toast.error('Using local report analysis', {
        description: errorMessage,
      })
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: buildLocalFallbackResponse(finalPrompt, reportContext),
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void sendMessage()
  }

  return (
    <section className="bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
      <div className="relative p-6 sm:p-7 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 border-b border-slate-800">
        <div className="absolute -top-20 right-[-4rem] h-64 w-64 rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-[-4rem] h-56 w-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
              <Bot className="w-4 h-4" />
              AI Business Assistant
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-white">Ask for reports, recommendations, and decision support</h2>
            <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl">
              Get natural-language answers from your live report data. Use it to generate a sales summary, identify fast-moving and profitable products, spot cash-flow risks, and find the next best action.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full lg:w-[420px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                <Sparkles className="w-4 h-4 text-teal-300" />
                Sales Report
              </div>
              <div className="mt-2 text-lg font-semibold text-white">Beyond charts</div>
              <div className="text-xs text-slate-400 mt-1">Executive summary, trends, and next steps</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                <Package className="w-4 h-4 text-teal-300" />
                Product Focus
              </div>
              <div className="mt-2 text-lg font-semibold text-white">Fast movers & profit</div>
              <div className="text-xs text-slate-400 mt-1">Know what to reorder and promote</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {promptSuggestions.map((item) => (
              <button
                key={item.label}
                onClick={() => void sendMessage(item.prompt)}
                disabled={isSending}
                className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 transition-colors hover:bg-teal-400/20 disabled:opacity-60"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap border ${
                    message.role === 'user'
                      ? 'bg-teal-500 text-white border-teal-400/40'
                      : 'bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-300" />
                    Analyzing sales and inventory data...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask for a sales report, product recommendations, or business insights..."
              rows={3}
              className="flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Zap className="w-4 h-4 text-teal-300" />
              Context snapshot
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-950/70 p-3">
                <div className="text-xs text-slate-400">Sales</div>
                <div className="mt-1 text-lg font-bold text-white">Rs {reportContext.summary.totalSales.toFixed(2)}</div>
              </div>
              <div className="rounded-xl bg-slate-950/70 p-3">
                <div className="text-xs text-slate-400">Profit</div>
                <div className="mt-1 text-lg font-bold text-white">Rs {reportContext.summary.grossProfit.toFixed(2)}</div>
              </div>
              <div className="rounded-xl bg-slate-950/70 p-3">
                <div className="text-xs text-slate-400">Fast movers</div>
                <div className="mt-1 text-lg font-bold text-white">{reportContext.fastMovingProducts.length}</div>
              </div>
              <div className="rounded-xl bg-slate-950/70 p-3">
                <div className="text-xs text-slate-400">Low stock</div>
                <div className="mt-1 text-lg font-bold text-white">{reportContext.lowStockItems.length}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <TrendingUp className="w-4 h-4 text-teal-300" />
              What it can answer
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>Executive sales summaries for the selected date range.</li>
              <li>Products to reorder, promote, or stop focusing on.</li>
              <li>Profitability and margin analysis.</li>
              <li>Cash-flow, receivable, and payable warnings.</li>
              <li>Actionable next steps for better decisions.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default ReportAssistant
