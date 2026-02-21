const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const TASK_DB_ID = process.env.TASK_DB_ID;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { title, assignee, categoryId, dueDate, scheduledDate, type, priority } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const properties = {
      'タスク名': { title: [{ type: 'text', text: { content: title } }] },
      'STS': { status: { name: '未着手' } }
    };

    if (assignee) properties['担当'] = { select: { name: assignee } };
    if (categoryId) properties['カテゴリ(R)'] = { relation: [{ id: categoryId }] };
    if (dueDate) properties['期限'] = { date: { start: dueDate } };
    if (scheduledDate) properties['実施予定'] = { date: { start: scheduledDate } };
    if (type) properties['種別'] = { select: { name: type } };
    if (priority) properties['重要度'] = { select: { name: priority } };

    const page = await notion.pages.create({
      parent: { database_id: TASK_DB_ID },
      properties
    });

    res.status(200).json({ success: true, id: page.id });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
};