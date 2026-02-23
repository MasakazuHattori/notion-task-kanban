const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const WORK_DB_ID = process.env.WORK_DB_ID;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = jst.toISOString().split('T')[0];
    const tomorrow = new Date(jst);
    tomorrow.setUTCDate(jst.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const filter = {
      and: [
        { property: '実行日時', date: { on_or_after: today } },
        { property: '実行日時', date: { before: tomorrowStr } }
      ]
    };

    let allResults = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: WORK_DB_ID,
        filter,
        sorts: [{ property: '実行日時', direction: 'ascending' }],
        start_cursor: cursor,
        page_size: 100
      });
      allResults = allResults.concat(response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const logs = allResults.map(page => {
      const props = page.properties;
      return {
        title: props['レコード']?.title?.[0]?.plain_text || '',
        taskId: props['TaskID']?.rich_text?.[0]?.plain_text || '',
        start: props['実行日時']?.date?.start || null,
        end: props['実行日時']?.date?.end || null
      };
    });

    let totalMs = 0;
    logs.forEach(log => {
      if (log.start && log.end) {
        const diff = new Date(log.end) - new Date(log.start);
        if (diff > 0) totalMs += diff;
      }
    });

    res.status(200).json({ logs, totalMinutes: Math.round(totalMs / 60000) });
  } catch (error) {
    console.error('Error fetching daily log:', error);
    res.status(500).json({ error: error.message });
  }
};