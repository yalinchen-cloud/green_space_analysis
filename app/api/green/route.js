// app/api/green/route.js
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 100;
    const offset = (page - 1) * limit;
    const year = searchParams.get('year');

    // 基础查询，不包含任何聚合函数
    let sql = `
      SELECT 
        gid, year, osm_id, code, fclass, name, 
        shape_length, shape_area,
        ST_AsGeoJSON(geom)::json as geometry
      FROM green_v
    `;
    
    const params = [];
    if (year) {
      sql += ` WHERE year = $1`;
      params.push(parseInt(year));
    }
    
    sql += ` ORDER BY gid LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // 总数统计（同样无聚合）
    let countSql = 'SELECT COUNT(*) as total FROM green_v';
    const countParams = [];
    if (year) {
      countSql = 'SELECT COUNT(*) as total FROM green_v WHERE year = $1';
      countParams.push(parseInt(year));
    }
    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        gid: row.gid,
        year: row.year,
        osm_id: row.osm_id,
        code: row.code,
        fclass: row.fclass,
        name: row.name || '未命名',
        shape_length: row.shape_length,
        shape_area: row.shape_area,
      },
    }));

    return Response.json({
      success: true,
      data: {
        type: 'FeatureCollection',
        features: features,
      },
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('获取绿地数据错误:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}