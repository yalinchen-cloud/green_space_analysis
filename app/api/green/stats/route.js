// app/api/green/stats/route.js
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. 总体统计 - 对 shape_area 进行类型转换
    const overall = await query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(shape_area::numeric) as total_area,
        ROUND(AVG(shape_area::numeric)::numeric, 6) as avg_area,
        MAX(shape_area::numeric) as max_area,
        MIN(shape_area::numeric) as min_area
      FROM green_v
    `);
    const o = overall.rows[0];

    // 2. 按绿地类型统计
    const byClass = await query(`
      SELECT fclass, COUNT(*) as count, SUM(shape_area::numeric) as total_area
      FROM green_v
      GROUP BY fclass
      ORDER BY total_area DESC
    `);

    // 3. 按年份统计
    const byYear = await query(`
      SELECT year, COUNT(*) as count, SUM(shape_area::numeric) as total_area
      FROM green_v
      GROUP BY year
      ORDER BY year
    `);

    // 4. 面积分布 - 注意这里也需要转换
    const distribution = await query(`
      SELECT area_range, COUNT(*) as count, SUM(shape_area::numeric) as total_area
      FROM (
        SELECT shape_area::numeric,
          CASE 
            WHEN shape_area::numeric < 0.000001 THEN '极小(<1e-6)'
            WHEN shape_area::numeric < 0.00001 THEN '小(1e-6~1e-5)'
            WHEN shape_area::numeric < 0.0001 THEN '中(1e-5~1e-4)'
            WHEN shape_area::numeric < 0.001 THEN '大(1e-4~1e-3)'
            ELSE '超大(>1e-3)'
          END as area_range
        FROM green_v
      ) t
      GROUP BY area_range
      ORDER BY MIN(shape_area::numeric)
    `);

    const totalArea = parseFloat(o.total_area);

    return Response.json({
      success: true,
      data: {
        overall: {
          total_count: parseInt(o.total_count),
          total_area: totalArea,
          avg_area: parseFloat(o.avg_area),
          max_area: parseFloat(o.max_area),
          min_area: parseFloat(o.min_area),
        },
        by_class: byClass.rows.map(r => ({
          fclass: r.fclass,
          count: parseInt(r.count),
          total_area: parseFloat(r.total_area),
          percentage: ((parseFloat(r.total_area) / totalArea) * 100).toFixed(2),
        })),
        by_year: byYear.rows.map(r => ({
          year: r.year,
          count: parseInt(r.count),
          total_area: parseFloat(r.total_area),
        })),
        distribution: distribution.rows.map(r => ({
          range: r.area_range,
          count: parseInt(r.count),
          total_area: parseFloat(r.total_area),
        })),
      },
    });

  } catch (error) {
    console.error('统计错误:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}