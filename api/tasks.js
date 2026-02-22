const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const TASK_DB_ID = process.env.TASK_DB_ID;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const today = new Date().toISOString().split('T')[0];

    const filter = {
      or: [
        { property: 'STS', status: { does_not_equal: '完了' } },
        {
          and: [
            { property: 'STS', status: { equals: '完了' } },
            { property: '完了日', date: { equals: today } }
          ]
        }
      ]
    };

    let allResults = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: TASK_DB_ID,
        filter,
        start_cursor: cursor,
        page_size: 100
      });
      allResults = allResults.concat(response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const tasks = allResults.map(page => {
      const props = page.properties;
      return {
        id: page.id,
        title: props['タスク名']?.title?.[0]?.plain_text || '',
        status: props['STS']?.status?.name || '',
        assignee: props['担当']?.select?.name || '',
        categoryRelation: props['カテゴリ(R)']?.relation?.[0]?.id || null,
        dueDate: props['期限']?.date?.start || null,
        scheduledDate: props['実施予定']?.date?.start || null,
        completionDate: props['完了日']?.date?.start || null,
        executionDate: props['実行日時']?.date?.start || null,
        executionDateEnd: props['実行日時']?.date?.end || null,
        url: props['URL']?.rich_text?.[0]?.plain_text || '',
        memo: props['備考']?.rich_text?.[0]?.plain_text || '',
        phaseDataChange: props['フェーズ（データ変更）']?.select?.name || '',
        phaseInquiry: props['フェーズ（問合せ）']?.select?.name || '',
        phaseReview: props['フェーズ（レビュー）']?.select?.name || '',
        startTrigger: props['開始トリガー']?.checkbox || false,
        priority: props['重要度']?.select?.name || ''
      };
    });

    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
};