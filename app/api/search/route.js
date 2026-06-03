// app/api/search/route.js
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit')) || 50;
    const type = searchParams.get('type') || 'all'; // all, green, road

    if (!keyword.trim()) {
      return Response.json({ success: false, message: '请输入搜索关键词' }, { status: 400 });
    }

    const searchTerm = `%${keyword}%`;
    const results = [];

    // 1. 搜索绿地 (green_v) - 按名称或分类搜索
    if (type === 'all' || type === 'green') {
      const greenVSql = `
        SELECT
          gid, 
          name as label, 
          fclass as category,
          'green_v' as source, 
          year,
          ST_AsGeoJSON(geom)::json as geometry,
          ST_X(ST_Centroid(geom)) as lng,
          ST_Y(ST_Centroid(geom)) as lat
        FROM green_v
        WHERE (name ILIKE $1 OR fclass ILIKE $1)
          AND name IS NOT NULL 
          AND name != ''
        LIMIT $2
      `;
      const vResult = await query(greenVSql, [searchTerm, limit]);
      results.push(...vResult.rows);
    }

    // 2. 搜索遥感绿地 (green_r) - 按分类搜索
    if (type === 'all' || type === 'green') {
      const greenRSql = `
        SELECT
          gid, 
          class as label, 
          class as category,
          'green_r' as source, 
          year,
          ST_AsGeoJSON(geom)::json as geometry,
          ST_X(ST_Centroid(geom)) as lng,
          ST_Y(ST_Centroid(geom)) as lat,
          area_hecta,
          ndvi_mean
        FROM green_r
        WHERE class ILIKE $1
          AND class IS NOT NULL
          AND class != ''
        LIMIT $2
      `;
      const rResult = await query(greenRSql, [searchTerm, limit]);
      results.push(...rResult.rows);
    }

    // 注意：当前数据库中没有单独的道路表，道路数据可能包含在 green_v 中（fclass='road' 或类似）
    // 如果需要搜索道路，可以从 green_v 中筛选 fclass 包含 'road' 的记录
    if (type === 'all' || type === 'road') {
      const roadSql = `
        SELECT
          gid, 
          name as label, 
          fclass as category,
          'road' as source, 
          year,
          ST_AsGeoJSON(geom)::json as geometry,
          ST_X(ST_Centroid(geom)) as lng,
          ST_Y(ST_Centroid(geom)) as lat
        FROM green_v
        WHERE (name ILIKE $1 OR fclass ILIKE $1)
          AND (fclass ILIKE '%road%' OR fclass ILIKE '%street%' OR fclass ILIKE '%way%')
          AND name IS NOT NULL
        LIMIT $2
      `;
      const roadResult = await query(roadSql, [searchTerm, limit]);
      results.push(...roadResult.rows);
    }

    return Response.json({
      success: true,
      keyword: keyword,
      count: results.length,
      data: results.map(row => ({
        gid: row.gid,
        label: row.label,
        category: row.category,
        source: row.source,
        year: row.year,
        geometry: row.geometry,
        center: row.lng && row.lat ? [row.lng, row.lat] : null,
        area_hecta: row.area_hecta,
        ndvi_mean: row.ndvi_mean,
      })),
    });

  } catch (error) {
    console.error('搜索错误:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}