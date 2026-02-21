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
    if (properties.title !== undefined) {
      notionProps['タスク名'] = {
        title: properties.title
          ? [{ type: 'text', text: { content: properties.title } }]
          : []
      };
    }
    if (properties.assignee !== undefined) {
      notionProps['担当'] = properties.assignee
        ? { select: { name: properties.assignee } }
        : { select: null };
    }
    if (properties.categoryId !== undefined) {
      notionProps['カテゴリ(R)'] = properties.categoryId
        ? { relation: [{ id: properties.categoryId }] }
        : { relation: [] };
    }
    if (properties.dueDate !== undefined) {
      notionProps['期限'] = properties.dueDate
        ? { date: { start: properties.dueDate } }
        : { date: null };
    }
    if (properties.scheduledDate !== undefined) {
      notionProps['実施予定'] = properties.scheduledDate
        ? { date: { start: properties.scheduledDate } }
        : { date: null };
    }
    if (properties.priority !== undefined) {
      notionProps['重要度'] = properties.priority
        ? { select: { name: properties.priority } }
        : { select: null };
    }
    if (properties.url !== undefined) {
      notionProps['URL'] = {
        rich_text: properties.url
          ? [{ type: 'text', text: { content: properties.url } }]
          : []
      };
    }

    await notion.pages.update({ page_id: pageId, properties: notionProps });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
};