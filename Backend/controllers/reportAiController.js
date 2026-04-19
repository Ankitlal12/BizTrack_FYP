const axios = require('axios');

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const buildSystemPrompt = () => `You are BizTrack AI, a business analyst for a retail and inventory management system.

Your job is to help the user with:
- AI-based sales report generation beyond charts
- Product recommendations based on fast-moving and profitable products
- Business insights for better decision-making

Rules:
- Use the provided business data snapshot as the primary source of truth.
- Do not invent numbers that are not present in the snapshot.
- When data is missing, say so clearly and give a safe recommendation.
- Be concise, practical, and action-oriented.
- Prefer markdown with short headings and bullets.
- Always respond in this fixed business-report format when possible:
	1. Executive Summary
	2. Sales Performance
	3. Fast-Moving Products
	4. Profitable Products
	5. Risks and Alerts
	6. Recommended Actions
	7. Follow-Up Questions
- If the user asks for only one topic, keep the same structure but make the unrelated sections brief and say "No additional data requested" where appropriate.
- If the user asks for recommendations, rank items by expected business value and label the top 3 clearly.
- If the user asks for insights, focus on trends, cash flow, inventory risks, customer behavior, and next steps.
- End every response with 1 to 3 concise action items.`;

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

const generateLocalAnalysis = (context = {}) => {
	const data = context || {};
	const totalSales = Number(data.totalSales || 0);
	const totalOrders = Number(data.totalOrders || 0);
	const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

	let analysis = '## Local Report Analysis (No API)\n\n';
	analysis += 'AI insights are unavailable. Showing local metrics analysis.\n\n';

	analysis += '### 1. Sales Performance\n';
	analysis += `- Total Revenue: Rs ${totalSales.toFixed(2)}\n`;
	analysis += `- Total Orders: ${totalOrders}\n`;
	analysis += `- Average Order Value: Rs ${avgOrderValue.toFixed(2)}\n`;

	if (data.prevRevenue !== undefined) {
		const prevRevenue = Number(data.prevRevenue || 0);
		const growthPercent = prevRevenue > 0 ? ((totalSales - prevRevenue) / prevRevenue) * 100 : 0;
		analysis += `- Growth vs Previous Period: ${growthPercent.toFixed(1)}%\n`;
	}

	if (Array.isArray(data.topProducts) && data.topProducts.length > 0) {
		analysis += '\n### 2. Top Performing Products\n';
		data.topProducts.slice(0, 3).forEach((product, index) => {
			analysis += `${index + 1}. ${product.name} - Rs ${(Number(product.revenue || 0)).toFixed(2)} (${Number(product.quantity || 0)} units)\n`;
		});
	}

	if (Array.isArray(data.lowStockItems) && data.lowStockItems.length > 0) {
		analysis += '\n### 3. Inventory Alerts\n';
		analysis += `- Low stock items: ${data.lowStockItems.length}\n`;
		data.lowStockItems.slice(0, 3).forEach((item) => {
			analysis += `  - ${item.name}: ${item.stock} units (Min: ${item.reorderLevel})\n`;
		});
	}

	analysis += '\n### 4. Recommended Actions\n';
	analysis += '- Monitor top-performing products for stock levels\n';
	analysis += '- Review pricing strategy to improve average order value\n';
	analysis += '- Focus on repeat customer retention\n';

	return analysis;
};

exports.chatReportInsights = async (req, res) => {
	try {
		const { message, messages, context } = req.body || {};
		const trimmedMessage = String(message || '').trim();

		if (!trimmedMessage) {
			return res.status(400).json({ error: 'Message is required' });
		}

		const apiKey = process.env.GROQ_API_KEY || process.env.CHATBOT_API_KEY;

		if (!apiKey) {
			return res.json({
				reply: generateLocalAnalysis(context),
				model: 'local-analysis',
				usage: null,
				isLocal: true,
			});
		}

		const payload = {
			model: DEFAULT_MODEL,
			temperature: 0.3,
			max_tokens: 900,
			messages: [
				{ role: 'system', content: buildSystemPrompt() },
				{
					role: 'system',
					content: `Business data snapshot for analysis:\n${JSON.stringify(context || {}, null, 2)}`,
				},
				...sanitizeMessages(messages),
				{ role: 'user', content: trimmedMessage },
			],
		};

		const response = await axios.post(GROQ_CHAT_URL, payload, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			timeout: 60000,
		});

		const reply = response.data?.choices?.[0]?.message?.content?.trim();
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
			reply: generateLocalAnalysis(req.body?.context || {}),
			model: 'local-analysis-fallback',
			usage: null,
			isLocal: true,
		});
	}
};
