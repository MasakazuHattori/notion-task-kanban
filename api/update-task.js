const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { pageId, properties } = req.body;
    if (!pageId) return res.status(400).json({ error: 'pageId is required' });

    const notionProps = {};

    if (properties.status !== undefined) {
      notionProps['STS'] = { status: { name: properties.status } };
    }
    if (properties.phaseDataChange !== undefined) {
      notionProps['フェーズ（データ変更）'] = properties.phaseDataChange
        ? { select: { name: properties.phaseDataChange } }
        : { select: null };
    }
    if (properties.phaseInquiry !== undefined) {
      notionProps['フェーズ（問合せ）'] = properties.phaseInquiry
        ? { select: { name: properties.phaseInquiry } }
        : { select: null };
    }
    if (properties.memo !== undefined) {
      notionProps['備考'] = {
        rich_text: properties.memo
          ? [{ type: 'text', text: { content: properties.memo } }]
          : []
      };
    }
    if (properties.completionDate !== undefined) {
      notionProps['完了日'] = properties.completionDate
        ? { date: { start: properties.completionDate } }
        : { date: null };
    }

    await notion.pages.update({ page_id: pageId, properties: notionProps });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
};