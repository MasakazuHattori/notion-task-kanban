const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const TASK_DB_ID = process.env.TASK_DB_ID;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 今週の月曜日を計算（JST基準）
    var now = new Date();
    var jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    var day = jst.getUTCDay();
    var diffToMonday = day === 0 ? 6 : day - 1;
    var monday = new Date(jst);
    monday.setUTCDate(jst.getUTCDate() - diffToMonday);
    var mondayStr = monday.toISOString().split('T')[0];

    // 今週の日曜日
    var sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    var sundayStr = sunday.toISOString().split('T')[0];

    var filter = {
      and: [
        { property: 'STS', status: { equals: '完了' } },
        { property: '完了日', date: { on_or_after: mondayStr } },
        { property: '完了日', date: { on_or_before: sundayStr } }
      ]
    };

    var allResults = [];
    var cursor = undefined;

    do {
      var response = await notion.databases.query({
        database_id: TASK_DB_ID,
        filter: filter,
        start_cursor: cursor,
        page_size: 100
      });
      allResults = allResults.concat(response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    res.status(200).json({
      count: allResults.length,
      weekStart: mondayStr,
      weekEnd: sundayStr
    });
  } catch (error) {
    console.error('Error fetching weekly completed:', error);
    res.status(500).json({ error: error.message });
  }
};