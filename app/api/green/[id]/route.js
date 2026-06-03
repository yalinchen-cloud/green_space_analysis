// app/api/green/[id]/route.js
import { query } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const greenId = parseInt(id);
    
    if (isNaN(greenId)) {
      return Response.json({ success: false, message: '无效的 ID' }, { status: 400 });
    }

    const sql = `
      SELECT 
        gid, year, osm_id, code, fclass, name, 
        shape_length, shape_area,
        ST_AsGeoJSON(geom)::json as geometry,
        ST_Area(geom::geography) as area_sqm,
        ST_Perimeter(geom::geography) as perimeter_m,
        ST_NPoints(geom) as vertex_count
      FROM green_v
      WHERE gid = $1
    `;

    const result = await query(sql, [greenId]);

    if (result.rows.length === 0) {
      return Response.json({ success: false, message: '绿地不存在' }, { status: 404 });
    }

    const row = result.rows[0];

    return Response.json({
      success: true,
      data: {
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          gid: row.gid,
          year: row.year,
          osm_id: row.osm_id,
          code: row.code,
          fclass: row.fclass,
          name: row.name,
          shape_length: row.shape_length,
          shape_area: row.shape_area,
          area_sqm: row.area_sqm,
          perimeter_m: row.perimeter_m,
          vertex_count: row.vertex_count,
        },
      },
    });

  } catch (error) {
    console.error('获取绿地详情错误:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}