const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

function getNextBusinessDay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay(); // 0=日, 1=月, ..., 5=金, 6=土
  let addDays;
  switch (day) {
    case 5: addDays = 3; break; // 金 → 月
    case 6: addDays = 2; break; // 土 → 月
    default: addDays = 1; break; // 日～木 → 翌日
  }
  date.setDate(date.getDate() + addDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { pageId } = req.body;
    if (!pageId) return res.status(400).json({ error: 'pageId is required' });

    // 現在の実施予定を取得
    const page = await notion.pages.retrieve({ page_id: pageId });
    const currentDate = page.properties['実施予定']?.date?.start;

    // 基準日：実施予定があればその日、なければ今日
    const baseDate = currentDate
      ? (currentDate.includes('T') ? currentDate.split('T')[0] : currentDate)
      : new Date().toISOString().split('T')[0];

    const nextDate = getNextBusinessDay(baseDate);

    await notion.pages.update({
      page_id: pageId,
      properties: {
        '実施予定': { date: { start: nextDate } }
      }
    });

    res.status(200).json({ success: true, newDate: nextDate });
  } catch (error) {
    console.error('Error postponing task:', error);
    res.status(500).json({ error: error.message });
  }
};