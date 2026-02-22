const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const WORK_DB_ID = process.env.WORK_DB_ID;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { pageId, taskTitle } = req.body;
    if (!pageId) return res.status(400).json({ error: 'pageId is required' });

    // 1. 現在のタスク情報を取得
    const page = await notion.pages.retrieve({ page_id: pageId });
    const execStart = page.properties['実行日時']?.date?.start;
    if (!execStart) return res.status(400).json({ error: 'タスクは実行中ではありません' });

    const now = new Date();
    const isoDatetime = now.toISOString();
    const isoDate = isoDatetime.split('T')[0];

    // 2. 実行日時のendを現在時刻に設定
    await notion.pages.update({
      page_id: pageId,
      properties: {
        '実行日時': { date: { start: execStart, end: isoDatetime } }
      }
    });

    // 3. WorkDBにレコード追加
    const taskIdNum = page.properties['ID']?.unique_id?.number || '';
    const execDate = isoDatetime.split('T')[0].replace(/-/g, '/');
    const keyValue = `${taskIdNum}#${execDate}`;
    const title = taskTitle || page.properties['タスク名']?.title?.[0]?.plain_text || '';

    await notion.pages.create({
      parent: { database_id: WORK_DB_ID },
      properties: {
        'レコード': { title: [{ type: 'text', text: { content: title } }] },
        'TaskID': { rich_text: [{ type: 'text', text: { content: String(taskIdNum) } }] },
        'キー': { rich_text: [{ type: 'text', text: { content: keyValue } }] },
        'タスク': { relation: [{ id: pageId }] },
        '実行日時': { date: { start: execStart, end: isoDatetime } }
      }
    });

    // 4. STS=完了、完了日=当日、実行日時クリア
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'STS': { status: { name: '完了' } },
        '完了日': { date: { start: isoDate } },
        '実行日時': { date: null }
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error finishing task:', error);
    res.status(500).json({ error: error.message });
  }
};