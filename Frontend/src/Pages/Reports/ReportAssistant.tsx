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
  mode?: 'sales' | 'stock' | 'staff'
}

const modeConfig = {
  sales: {
    starter:
      'I can turn your sales report data into executive summaries, product recommendations, and decision-ready insights. Ask me for a sales report, profitable products, fast movers, cash-flow risks, or a business action plan.',
    title: 'Ask for reports, recommendations, and decision support',
    description:
      'Get natural-language answers from your live sales report data. Use it to generate a sales summary, identify fast-moving and profitable products, spot cash-flow risks, and find the next best action.',
    loadingText: 'Analyzing sales and inventory data...',
    placeholder: 'Ask for a sales report, product recommendations, or business insights...',
    badges: [
      {
        label: 'Sales Report',
        heading: 'Beyond charts',
        description: 'Executive summary, trends, and next steps',
        icon: <Sparkles className="w-4 h-4 text-teal-300" />,
      },
      {
        label: 'Product Focus',
        heading: 'Fast movers & profit',
        description: 'Know what to reorder and promote',
        icon: <Package className="w-4 h-4 text-teal-300" />,
      },
    ],
    prompts: [
      {
        label: 'Generate sales report',
        icon: <Sparkles className="w-4 h-4" />,
        prompt:
          'Generate a concise sales report for this date range with executive summary, fast-moving products, profitable products, and actions I should take next.',
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
    ],
    canAnswer: [
      'Executive sales summaries for the selected date range.',
      'Products to reorder, promote, or stop focusing on.',
      'Profitability and margin analysis.',
      'Cash-flow, receivable, and payable warnings.',
      'Actionable next steps for better decisions.',
    ],
  },
  stock: {
    starter:
      'I can analyze your stock report data and provide inventory-focused recommendations. Ask me about low-stock risks, dead stock, turnover trends, reorder priorities, and margin opportunities.',
    title: 'Ask for stock insights and inventory actions',
    description:
      'Get natural-language answers from your stock and inventory data. Use it to identify low-stock risks, dead stock, turnover opportunities, and clear reorder priorities.',
    loadingText: 'Analyzing stock and inventory data...',
    placeholder: 'Ask about low stock, dead stock, turnover rate, or reorder priorities...',
    badges: [
      {
        label: 'Stock Report',
        heading: 'Inventory clarity',
        description: 'COGS, margins, and stock health in one view',
        icon: <Package className="w-4 h-4 text-teal-300" />,
      },
      {
        label: 'Reorder Focus',
        heading: 'What to refill first',
        description: 'Prioritize fast movers and prevent stockouts',
        icon: <TrendingUp className="w-4 h-4 text-teal-300" />,
      },
    ],
    prompts: [
      {
        label: 'Stock summary',
        icon: <Sparkles className="w-4 h-4" />,
        prompt: 'Give me a stock report summary for this date range with key risks and inventory actions.',
      },
      {
        label: 'Reorder priorities',
        icon: <TrendingUp className="w-4 h-4" />,
        prompt: 'Which low-stock items should be reordered first based on demand and revenue impact?',
      },
      {
        label: 'Dead stock analysis',
        icon: <Target className="w-4 h-4" />,
        prompt: 'Analyze dead stock and recommend what to discount, bundle, or stop purchasing.',
      },
      {
        label: 'Margin improvement',
        icon: <DollarSign className="w-4 h-4" />,
        prompt: 'How can I improve gross margin from current stock and product performance?',
      },
    ],
    canAnswer: [
      'Stock health summary for the selected period.',
      'Low-stock and stockout reorder priorities.',
      'Dead stock reduction recommendations.',
      'Turnover and category-level inventory performance.',
      'Margin and profitability actions from stock data.',
    ],
  },
  staff: {
    starter:
      'I can analyze your staff analytics data and generate team-performance insights. Ask me about top performers, activity trends, coaching opportunities, and workforce planning actions.',
    title: 'Ask for staff performance and team insights',
    description:
      'Get natural-language answers from your staff analytics data. Use it to identify top performers, workload patterns, activity gaps, and practical team actions.',
    loadingText: 'Analyzing staff performance data...',
    placeholder: 'Ask about top performers, low performers, sessions, or staffing actions...',
    badges: [
      {
        label: 'Staff Analytics',
        heading: 'Team performance',
        description: 'Revenue, sales, and session trends by staff',
        icon: <Sparkles className="w-4 h-4 text-teal-300" />,
      },
      {
        label: 'Workforce Focus',
        heading: 'Coaching & planning',
        description: 'See who needs support and where to improve',
        icon: <Target className="w-4 h-4 text-teal-300" />,
      },
    ],
    prompts: [
      {
        label: 'Staff summary',
        icon: <Sparkles className="w-4 h-4" />,
        prompt: 'Generate a staff analytics summary for this date range with top performers and improvement areas.',
      },
      {
        label: 'Top performers',
        icon: <TrendingUp className="w-4 h-4" />,
        prompt: 'Who are the top staff performers by revenue, sales, and consistency, and why?',
      },
      {
        label: 'Coaching targets',
        icon: <Target className="w-4 h-4" />,
        prompt: 'Which team members need coaching support and what actions should I take?',
      },
      {
        label: 'Team activity risks',
        icon: <Zap className="w-4 h-4" />,
        prompt: 'Highlight staff activity risks from sessions and login trends, with practical next steps.',
      },
    ],
    canAnswer: [
      'Staff performance summaries for the selected period.',
      'Top and low performers with role-based context.',
      'Session duration and login activity insights.',
      'Team coaching and workload balancing actions.',
      'Operational next steps to improve staff outcomes.',
    ],
  },
} as const

const formatCurrency = (value: number) => `Rs ${value.toFixed(2)}`

const normalizeCurrencyText = (text: string) =>
  text
    .replace(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g, 'Rs $1')
    .replace(/\bUSD\b/gi, 'NPR')

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

const ReportAssistant: React.FC<ReportChatbotProps> = ({ reportContext, mode = 'sales' }) => {
  const config = modeConfig[mode]
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: config.starter }])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUsingLocalMode, setIsUsingLocalMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMessages([{ role: 'assistant', content: config.starter }])
  }, [mode])

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

      if ((response as any)?.isLocal) {
        setIsUsingLocalMode(true)
        const reason = (response as any)?.localReason
        const reasonText =
          reason === 'missing_api_key'
            ? 'Groq key is not detected on backend.'
            : 'Groq request failed, so local analysis is being used.'
        toast.warning('AI fallback active', {
          description: reasonText,
        })
      } else {
        setIsUsingLocalMode(false)
      }

      setMessages((current) => [...current, { role: 'assistant', content: normalizeCurrencyText(response.reply) }])
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
    <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(246,250,249,0.94)_100%)] text-slate-900 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.45)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-5rem] h-72 w-72 rounded-full bg-teal-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-[-5rem] h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="biz-grid-overlay opacity-30" />
      </div>

      <div className="relative border-b border-white/70 bg-[linear-gradient(135deg,rgba(8,47,73,0.98)_0%,rgba(13,148,136,0.95)_55%,rgba(6,182,212,0.9)_100%)] p-6 sm:p-7">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/95 backdrop-blur-md">
              <Bot className="w-4 h-4" />
              AI Business Assistant
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-white">{config.title}</h2>
            <p className="mt-2 text-sm sm:text-base text-teal-50 max-w-2xl">
              {config.description}
            </p>
            {isUsingLocalMode && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Local analysis mode active
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full lg:w-[420px]">
            {config.badges.map((badge) => (
              <div key={badge.label} className="rounded-3xl border border-white/20 bg-white/15 p-4 backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/20">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-teal-50/90">
                  {badge.icon}
                  {badge.label}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">{badge.heading}</div>
                <div className="text-xs text-teal-100/90 mt-1">{badge.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-4 sm:p-5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap gap-2 mb-4">
            {config.prompts.map((item) => (
              <button
                key={item.label}
                onClick={() => void sendMessage(item.prompt)}
                disabled={isSending}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50 disabled:opacity-60"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1 rounded-[24px] border border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(248,250,252,0.96)_100%)] p-2 sm:p-3 shadow-inner shadow-slate-100/70">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap border ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-teal-400/40 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 shadow-sm'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-300" />
                    {config.loadingText}
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
              placeholder={config.placeholder}
              rows={3}
              className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:from-teal-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-4 sm:p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Zap className="w-4 h-4 text-teal-300" />
              Context snapshot
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {mode === 'sales' && (
                <>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Sales</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">Rs {reportContext.summary.totalSales.toFixed(2)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Profit</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">Rs {reportContext.summary.grossProfit.toFixed(2)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Fast movers</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{reportContext.fastMovingProducts.length}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Low stock</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{reportContext.lowStockItems.length}</div>
                  </div>
                </>
              )}

              {mode === 'stock' && (
                <>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Revenue</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">Rs {reportContext.summary.totalSales.toFixed(2)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">COGS</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">Rs {reportContext.summary.cogs.toFixed(2)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Gross Margin</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{reportContext.summary.grossMargin.toFixed(1)}%</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Low stock items</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{reportContext.lowStockItems.length}</div>
                  </div>
                </>
              )}

              {mode === 'staff' && (
                <>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Team Revenue</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">Rs {reportContext.summary.totalSales.toFixed(2)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Total Sales</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{reportContext.summary.totalOrders}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Active Staff</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{reportContext.customerRetention?.overview?.activeStaff || 0}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Total Sessions</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{reportContext.customerRetention?.totalSessions || 0}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-4 sm:p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <TrendingUp className="w-4 h-4 text-teal-300" />
              What it can answer
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {config.canAnswer.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default ReportAssistant
