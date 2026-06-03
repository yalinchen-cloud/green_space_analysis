// app/api/green/statistics/route.js
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'both';

    const result = {};

    if (source === 'both' || source === 'green_r') {
      // 只对数值字段进行聚合
      const summary = await query(`
        SELECT 
          COUNT(*) as total_count,
          COUNT(DISTINCT year) as year_count,
          MIN(year) as min_year,
          MAX(year) as max_year,
          COUNT(DISTINCT class) as class_count,
          SUM(area_hecta) as total_area_hecta,
          AVG(ndvi_mean) as avg_ndvi
        FROM green_r
      `);

      const yearly = await query(`
        SELECT 
          year,
          COUNT(*) as count,
          SUM(area_hecta) as area_hecta,
          ROUND(AVG(ndvi_mean)::numeric, 3) as avg_ndvi
        FROM green_r
        GROUP BY year
        ORDER BY year
      `);

      result.green_r = {
        summary: {
          total_count: parseInt(summary.rows[0].total_count),
          year_count: parseInt(summary.rows[0].year_count),
          year_range: { min: summary.rows[0].min_year, max: summary.rows[0].max_year },
          class_count: parseInt(summary.rows[0].class_count),
          total_area_hecta: parseFloat(summary.rows[0].total_area_hecta || 0),
          avg_ndvi: parseFloat(summary.rows[0].avg_ndvi || 0),
        },
        yearly_data: yearly.rows.map(row => ({
          year: row.year,
          count: parseInt(row.count),
          area_hecta: parseFloat(row.area_hecta || 0),
          avg_ndvi: parseFloat(row.avg_ndvi || 0),
        })),
      };
    }

    if (source === 'both' || source === 'green_v') {
      const vStats = await query(`
        SELECT COUNT(*) as total_count FROM green_v
      `);
      result.green_v = { total_count: parseInt(vStats.rows[0].total_count), note: '来自 OSM' };
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('统计错误:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}