// app/api/green-r/route.js
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 100;
    const offset = (page - 1) * limit;
    const year = searchParams.get('year');
    const classFilter = searchParams.get('class');

    let sql = `
      SELECT
        gid, year, class, area_sq_m, area_hecta,
        ndvi_mean, density, source,
        ST_AsGeoJSON(geom)::json as geometry
      FROM green_r
    `;
    
    const conditions = [];
    const params = [];

    if (year) {
      conditions.push(`year = $${params.length + 1}`);
      params.push(parseInt(year));
    }

    if (classFilter) {
      conditions.push(`class ILIKE $${params.length + 1}`);
      params.push(`%${classFilter}%`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY year, gid LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // 总数统计
    let countSql = 'SELECT COUNT(*) as total FROM green_r';
    const countParams = [];
    
    if (year) {
      countSql += ` WHERE year = $${countParams.length + 1}`;
      countParams.push(parseInt(year));
    }
    if (classFilter && countParams.length === 0) {
      countSql += ` WHERE class ILIKE $${countParams.length + 1}`;
      countParams.push(`%${classFilter}%`);
    } else if (classFilter) {
      countSql += ` AND class ILIKE $${countParams.length + 1}`;
      countParams.push(`%${classFilter}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    return Response.json({
      success: true,
      data: {
        type: 'FeatureCollection',
        features: result.rows.map(row => ({
          type: 'Feature',
          geometry: row.geometry,
          properties: {
            gid: row.gid,
            year: row.year,
            class: row.class,
            area_sq_m: row.area_sq_m,
            area_hecta: row.area_hecta,
            ndvi_mean: row.ndvi_mean,
            density: row.density,
            source: row.source,
          },
        })),
      },
      pagination: { 
        page, limit, total, 
        totalPages: Math.ceil(total / limit) 
      },
    });

  } catch (error) {
    console.error('获取遥感绿地错误:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}