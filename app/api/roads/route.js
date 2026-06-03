// app/api/roads/route.js
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 100;
    const offset = (page - 1) * limit;
    const roadType = searchParams.get('fclass');

    let sql = `SELECT gid, osm_id, code, fclass, name, shape_length, ST_AsGeoJSON(geom)::json as geometry FROM roads`;
    const params = [];

    if (roadType) {
      sql += ` WHERE fclass = $1`;
      params.push(roadType);
    }

    sql += ` ORDER BY gid LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    let countSql = 'SELECT COUNT(*) as total FROM roads';
    if (roadType) countSql += ` WHERE fclass = $1`;
    const countResult = await query(countSql, roadType ? [roadType] : []);
    const total = parseInt(countResult.rows[0].total);

    return Response.json({
      success: true,
      data: {
        type: 'FeatureCollection',
        features: result.rows.map(row => ({
          type: 'Feature',
          geometry: row.geometry,
          properties: {
            gid: row.gid, osm_id: row.osm_id, code: row.code,
            fclass: row.fclass, name: row.name, shape_length: row.shape_length,
          },
        })),
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });

  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}