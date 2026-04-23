const axios = require('axios');

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const resolveGroqApiKey = () => (
	process.env.GROQ_API_KEY ||
	process.env.CHATBOT_API_KEY ||
	process.env.GROQ_API ||
	process.env.GROQ_KEY ||
	''
);

const toSafeNumber = (value) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};

const normalizeContext = (context = {}) => {
	const data = context && typeof context === 'object' ? context : {};
	const summary = data.summary && typeof data.summary === 'object' ? data.summary : {};

	return {
		assistantMode: data.assistantMode,
		dateRange: data.dateRange || { from: '', to: '' },
		summary: {
			totalSales: toSafeNumber(summary.totalSales),
			totalOrders: toSafeNumber(summary.totalOrders),
			totalItemsSold: toSafeNumber(summary.totalItemsSold),
			avgOrderValue: toSafeNumber(summary.avgOrderValue),
			cogs: toSafeNumber(summary.cogs),
			grossProfit: toSafeNumber(summary.grossProfit),
			grossMargin: toSafeNumber(summary.grossMargin),
			totalPurchaseCost: toSafeNumber(summary.totalPurchaseCost),
			outstandingReceivables: toSafeNumber(summary.outstandingReceivables),
			outstandingPayables: toSafeNumber(summary.outstandingPayables),
			scheduledTotal: toSafeNumber(summary.scheduledTotal),
		},
		fastMovingProducts: Array.isArray(data.fastMovingProducts) ? data.fastMovingProducts.slice(0, 15) : [],
		profitableProducts: Array.isArray(data.profitableProducts) ? data.profitableProducts.slice(0, 15) : [],
		lowStockItems: Array.isArray(data.lowStockItems) ? data.lowStockItems.slice(0, 20) : [],
		topSuppliers: Array.isArray(data.topSuppliers) ? data.topSuppliers.slice(0, 10) : [],
		categorySales: Array.isArray(data.categorySales) ? data.categorySales.slice(0, 12) : [],
		dailySalesData: Array.isArray(data.dailySalesData) ? data.dailySalesData.slice(-30) : [],
		customerRetention: data.customerRetention || null,
	};
};

const detectMode = (context = {}) => {
	if (context.assistantMode === 'sales' || context.assistantMode === 'stock' || context.assistantMode === 'staff') {
		return context.assistantMode;
	}

	if (context.customerRetention?.overview) return 'staff';
	if ((context.lowStockItems || []).length > 0 && (context.topSuppliers || []).length === 0) return 'stock';
	return 'sales';
};

const buildSystemPrompt = (mode = 'sales') => {
	const sectionMap = {
		sales: [
			'1. Executive Summary',
			'2. Sales Performance',
			'3. Fast-Moving Products',
			'4. Profitable Products',
			'5. Risks and Alerts',
			'6. Recommended Actions',
			'7. Follow-Up Questions',
		],
		stock: [
			'1. Executive Summary',
			'2. Inventory Performance',
			'3. Fast-Moving Stock',
			'4. Low-Stock and Dead-Stock Risks',
			'5. Margin and Category Insights',
			'6. Recommended Actions',
			'7. Follow-Up Questions',
		],
		staff: [
			'1. Executive Summary',
			'2. Staff Performance',
			'3. Activity and Consistency',
			'4. Team Composition Insights',
			'5. Risks and Alerts',
			'6. Recommended Actions',
			'7. Follow-Up Questions',
		],
	};

	return `You are BizTrack AI, a business analyst for a retail and inventory management system.

Current report mode: ${mode.toUpperCase()}.

Rules:
- Use the provided business data snapshot as the source of truth.
- Do not invent numbers. If a metric is unavailable, explicitly say which metric is missing.
- Ground each key finding in concrete values from the snapshot.
- Keep answers concise, practical, and action-oriented.
- Prefer markdown headings and bullet points.
- Always use Nepali Rupee formatting for money values: "Rs <amount>".
- Never use "$", "USD", or other currency symbols.
- Use this section structure:
${sectionMap[mode].map((s) => `- ${s}`).join('\n')}
- Adapt wording to the mode. For staff mode, discuss staff/team metrics, not product or inventory metrics.
- Never output the phrase "No additional data requested".
- If the user asks for rankings, list top 3 with exact values.
- End with 1 to 3 concise action items.`;
};

const normalizeCurrencyText = (text = '') => String(text)
	.replace(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g, 'Rs $1')
	.replace(/\bUSD\b/gi, 'NPR');

const summarizeContextForPrompt = (context = {}, mode = 'sales') => {
	const summary = context.summary || {};
	const topFast = (context.fastMovingProducts || []).slice(0, 5).map((item) => ({
		name: item.name,
		quantity: toSafeNumber(item.quantity),
		revenue: toSafeNumber(item.revenue),
	}));
	const topProfit = (context.profitableProducts || []).slice(0, 5).map((item) => ({
		name: item.name,
		profit: toSafeNumber(item.estimatedProfit),
		margin: toSafeNumber(item.margin),
		revenue: toSafeNumber(item.revenue),
	}));

	const promptSnapshot = {
		assistantMode: mode,
		dateRange: context.dateRange,
		summary,
		topFastMoving: topFast,
		topProfitable: topProfit,
		lowStockCount: (context.lowStockItems || []).length,
		lowStockItems: (context.lowStockItems || []).slice(0, 8),
		categorySales: (context.categorySales || []).slice(0, 8),
		dailySalesData: (context.dailySalesData || []).slice(-14),
	};

	if (mode === 'staff') {
		promptSnapshot.staffOverview = context.customerRetention?.overview || {};
		promptSnapshot.totalSessions = toSafeNumber(context.customerRetention?.totalSessions);
		promptSnapshot.loginActivityByDate = (context.customerRetention?.loginActivityByDate || []).slice(-14);
	}

	return promptSnapshot;
};

const sanitizeMessages = (messages = []) => {
	if (!Array.isArray(messages)) return [];

	return messages
		.filter((message) => message && typeof message.content === 'string')
		.slice(-12)
		.map((message) => ({
			role: message.role === 'assistant' ? 'assistant' : 'user',
			content: message.content.slice(0, 3000),
		}));
};

const generateLocalAnalysis = (rawContext = {}) => {
	const context = normalizeContext(rawContext);
	const mode = detectMode(context);
	const summary = context.summary;

	let analysis = '## Local Report Analysis (No API)\n\n';
	analysis += 'Live AI is unavailable, so this response is generated from local snapshot metrics.\n\n';

	if (mode === 'staff') {
		const staffList = (context.fastMovingProducts || []).slice(0, 5);
		analysis += '### 1. Executive Summary\n';
		analysis += `- Team revenue: Rs ${summary.totalSales.toFixed(2)}\n`;
		analysis += `- Total sales handled: ${summary.totalOrders}\n`;
		analysis += `- Total sessions: ${toSafeNumber(context.customerRetention?.totalSessions)}\n`;
		analysis += '\n### 2. Staff Performance\n';
		if (staffList.length > 0) {
			staffList.slice(0, 3).forEach((staff, index) => {
				analysis += `${index + 1}. ${staff.name}: Rs ${toSafeNumber(staff.revenue).toFixed(2)} revenue, ${toSafeNumber(staff.quantity)} sales\n`;
			});
		} else {
			analysis += '- Staff performance entries are not available in the current snapshot.\n';
		}
		analysis += '\n### 3. Recommended Actions\n';
		analysis += '- Recognize top performers and document their selling patterns.\n';
		analysis += '- Coach low-activity staff using top-performer practices.\n';
		analysis += '- Track session consistency versus revenue contribution weekly.\n';
		return analysis;
	}

	if (mode === 'stock') {
		analysis += '### 1. Executive Summary\n';
		analysis += `- Stock-linked revenue: Rs ${summary.totalSales.toFixed(2)}\n`;
		analysis += `- COGS: Rs ${summary.cogs.toFixed(2)}\n`;
		analysis += `- Gross margin: ${summary.grossMargin.toFixed(2)}%\n`;
		analysis += `- Low-stock items: ${context.lowStockItems.length}\n`;
		analysis += '\n### 2. Inventory Insights\n';
		(context.lowStockItems || []).slice(0, 5).forEach((item, index) => {
			analysis += `${index + 1}. ${item.name}: stock ${toSafeNumber(item.stock)} (reorder level ${toSafeNumber(item.reorderLevel)})\n`;
		});
		analysis += '\n### 3. Recommended Actions\n';
		analysis += '- Reorder highest-demand low-stock items first.\n';
		analysis += '- Reduce dead/slow stock via promotions or bundles.\n';
		analysis += '- Recheck category-level margin before new purchase decisions.\n';
		return analysis;
	}

	analysis += '### 1. Sales Performance\n';
	analysis += `- Total Revenue: Rs ${summary.totalSales.toFixed(2)}\n`;
	analysis += `- Total Orders: ${summary.totalOrders}\n`;
	analysis += `- Average Order Value: Rs ${summary.avgOrderValue.toFixed(2)}\n`;
	analysis += '\n### 2. Top Products\n';
	(context.fastMovingProducts || []).slice(0, 5).forEach((product, index) => {
		analysis += `${index + 1}. ${product.name}: ${toSafeNumber(product.quantity)} units, Rs ${toSafeNumber(product.revenue).toFixed(2)}\n`;
	});
	analysis += '\n### 3. Recommended Actions\n';
	analysis += '- Protect availability of fast-moving products.\n';
	analysis += '- Prioritize high-margin products in promotions.\n';
	analysis += '- Review receivables and payables for cash-flow balance.\n';

	return analysis;
};

exports.chatReportInsights = async (req, res) => {
	try {
		const { message, messages, context } = req.body || {};
		const trimmedMessage = String(message || '').trim();
		const normalizedContext = normalizeContext(context);
		const mode = detectMode(normalizedContext);
		const promptSnapshot = summarizeContextForPrompt(normalizedContext, mode);

		if (!trimmedMessage) {
			return res.status(400).json({ error: 'Message is required' });
		}

		const apiKey = process.env.GROQ_API_KEY || process.env.CHATBOT_API_KEY;

		const resolvedApiKey = resolveGroqApiKey();

		if (!resolvedApiKey) {
			return res.json({
				reply: generateLocalAnalysis(normalizedContext),
				model: 'local-analysis',
				usage: null,
				isLocal: true,
				localReason: 'missing_api_key',
			});
		}

		const payload = {
			model: DEFAULT_MODEL,
			temperature: 0.3,
			max_tokens: 900,
			messages: [
				{ role: 'system', content: buildSystemPrompt(mode) },
				{
					role: 'system',
					content: `Business data snapshot for analysis:\n${JSON.stringify(promptSnapshot, null, 2)}`,
				},
				...sanitizeMessages(messages),
				{ role: 'user', content: trimmedMessage },
			],
		};

		const response = await axios.post(GROQ_CHAT_URL, payload, {
			headers: {
				Authorization: `Bearer ${resolvedApiKey}`,
				'Content-Type': 'application/json',
			},
			timeout: 60000,
		});

		const reply = normalizeCurrencyText(response.data?.choices?.[0]?.message?.content?.trim());
		if (!reply) {
			return res.status(502).json({ error: 'Groq returned an empty response' });
		}

		res.json({
			reply,
			model: response.data?.model || DEFAULT_MODEL,
			usage: response.data?.usage || null,
			isLocal: false,
		});
	} catch (error) {
		console.error('Failed to generate report response:', error?.response?.data || error);

		return res.json({
			reply: generateLocalAnalysis(normalizeContext(req.body?.context || {})),
			model: 'local-analysis-fallback',
			usage: null,
			isLocal: true,
			localReason: 'api_error',
		});
	}
};
