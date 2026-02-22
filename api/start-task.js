const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { pageId, statusUpdate, phaseUpdate } = req.body;
    if (!pageId) return res.status(400).json({ error: 'pageId is required' });

    const now = new Date();
    const isoDatetime = now.toISOString();
    const isoDate = isoDatetime.split('T')[0];

    const properties = {
      '実行日時': { date: { start: isoDatetime } },
      '実施予定': { date: { start: isoDate } },
      '開始トリガー': { checkbox: true }
    };

    // STS変更（未着手/劣後 → 進行中）
    if (statusUpdate) {
      properties['STS'] = { status: { name: statusUpdate } };
    }

    // フェーズ自動設定
    if (phaseUpdate) {
      if (phaseUpdate.phaseDataChange) {
        properties['フェーズ（データ変更）'] = { select: { name: phaseUpdate.phaseDataChange } };
      }
      if (phaseUpdate.phaseInquiry) {
        properties['フェーズ（問合せ）'] = { select: { name: phaseUpdate.phaseInquiry } };
      }
      if (phaseUpdate.phaseReview) {
        properties['フェーズ（レビュー）'] = { select: { name: phaseUpdate.phaseReview } };
      }
    }

    await notion.pages.update({ page_id: pageId, properties });

    res.status(200).json({ success: true, startedAt: isoDatetime });
  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({ error: error.message });
  }
};