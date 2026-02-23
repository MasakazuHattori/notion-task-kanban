const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const CATEGORY_DB_ID = process.env.CATEGORY_DB_ID;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // エッジCDNのみ5分キャッシュ（ブラウザはキャッシュしない）
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=60');

  try {
    const response = await notion.databases.query({
      database_id: CATEGORY_DB_ID,
      page_size: 100
    });

    const categories = response.results.map(page => {
      const props = page.properties;
      return {
        id: page.id,
        name: props['カテゴリ名']?.title?.[0]?.plain_text || '',
        colorCode: props['カラーコード']?.rich_text?.[0]?.plain_text || '#6b7280',
        parentCategory: props['親カテゴリ']?.select?.name || ''
      };
    });

    res.status(200).json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
};