// app/api/green/timeline/route.js
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. green_v 按年份统计
    const vStats = await query(`
      SELECT 
        year, 
        COUNT(*) as count,
        SUM(shape_area) as total_area,
        source
      FROM green_v
      GROUP BY year, source
      ORDER BY year
    `);

    // 2. green_r 按年份统计
    const rStats = await query(`
      SELECT 
        year, 
        COUNT(*) as count,
        SUM(area_sq_m) as total_area_sqm,
        SUM(area_hecta) as total_area_hecta,
        ROUND(AVG(ndvi_mean)::numeric, 3) as avg_ndvi,
        source
      FROM green_r
      GROUP BY year, source
      ORDER BY year
    `);

    // 合并数据
    const timeline = [];

    // green_r 数据
    rStats.rows.forEach(row => {
      timeline.push({
        year: row.year,
        source: 'green_r (遥感)',
        count: parseInt(row.count),
        total_area_sqm: parseFloat(row.total_area_sqm),
        total_area_hecta: parseFloat(row.total_area_hecta),
        avg_ndvi: parseFloat(row.avg_ndvi),
      });
    });

    // green_v 数据 (shape_area 是度数，需提示已转换为近似面积)
    vStats.rows.forEach(row => {
      timeline.push({
        year: row.year,
        source: 'green_v (OSM)',
        count: parseInt(row.count),
        total_area_deg: parseFloat(row.total_area),
        // 可粗略换算：1度≈111km，平方度≈12321 km²，可根据需要在前端处理
        note: 'shape_area 单位为平方度，非平方米',
      });
    });

    // 按年份排序
    timeline.sort((a, b) => a.year - b.year);

    return Response.json({
      success: true,
      data: timeline,
    });

  } catch (error) {
    console.error('时序统计错误:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}