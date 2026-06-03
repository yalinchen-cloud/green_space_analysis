// app/page.js
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

// 动态导入地图组件，避免 SSR 时 window 未定义
const MapComponent = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 flex items-center justify-center rounded-lg">
      加载地图中...
    </div>
  ),
});

export default function Home() {
  // 状态管理
  const [source, setSource] = useState('green_r');        // 'green_v' 或 'green_r'
  const [selectedYear, setSelectedYear] = useState('all'); // 'all' 或具体年份
  const [availableYears, setAvailableYears] = useState([]); // 从 API 获取的年份列表
  const [greenData, setGreenData] = useState(null);        // GeoJSON 数据
  const [statistics, setStatistics] = useState(null);      // 统计数据
  const [searchResults, setSearchResults] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentYearTotalArea, setCurrentYearTotalArea] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState(null);
const handleFeatureClick = useCallback((feature) => {
  setSelectedFeature(feature);
}, []);
  // 获取可用年份（从 green_r 和 green_v 中提取）
  const fetchAvailableYears = useCallback(async () => {
    try {
      // 从 timeline API 获取所有年份
      const res = await fetch('/api/green/timeline');
      const data = await res.json();
      if (data.success) {
        // 提取所有不同的年份（包含 green_v 和 green_r）
        const years = [...new Set(data.data.map(item => item.year))].sort((a,b)=>a-b);
        setAvailableYears(years);
      } else {
        // 降级：硬编码已知年份
        setAvailableYears([2002, 2006, 2009, 2015, 2019, 2025, 2026]);
      }
    } catch (err) {
      console.error('获取年份失败:', err);
      setAvailableYears([2002, 2006, 2009, 2015, 2019, 2025, 2026]);
    }
  }, []);

  // 获取统计数据（用于表格和总面积卡片）
  const fetchStatistics = useCallback(async () => {
    try {
      const res = await fetch('/api/green/statistics?source=green_r');
      const data = await res.json();
      if (data.success) setStatistics(data.data);
    } catch (err) {
      console.error('获取统计失败:', err);
    }
  }, []);

  // 获取绿地数据（地图显示）
  const fetchGreenData = useCallback(async () => {
    setLoading(true);
    try {
      let url;
      if (source === 'green_v') {
        url = selectedYear === 'all'
          ? '/api/green?limit=500'
          : `/api/green?year=${selectedYear}&limit=500`;
      } else {
        url = selectedYear === 'all'
          ? '/api/green-r?limit=500'
          : `/api/green-r?year=${selectedYear}&limit=500`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setGreenData(data.data);
        // 计算当前显示的总面积（公顷）
        if (data.data && data.data.features) {
          let total = 0;
          if (source === 'green_r') {
            total = data.data.features.reduce(
              (sum, f) => sum + (f.properties.area_hecta || 0),
              0
            );
          } else {
            // green_v 的 shape_area 从度平方转换为公顷 (1度² ≈ 12390 公顷)
            total = data.data.features.reduce(
              (sum, f) => sum + (f.properties.shape_area || 0) * 12390,
              0
            );
          }
          setCurrentYearTotalArea(total);
        } else {
          setCurrentYearTotalArea(0);
        }
      }
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [source, selectedYear]);

  // 搜索处理
  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}&limit=20`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch (err) {
      console.error('搜索失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 高亮关键词函数
  const highlightText = (text) => {
    if (!keyword || !text) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300">$1</mark>');
  };

  // 初始化：获取年份列表和统计数据
  useEffect(() => {
    fetchAvailableYears();
    fetchStatistics();
  }, [fetchAvailableYears, fetchStatistics]);

  // 当数据源或年份变化时，重新加载地图数据
  useEffect(() => {
    fetchGreenData();
  }, [fetchGreenData]);
  // 当数据源或年份变化时，清空搜索结果
useEffect(() => {
  setSearchResults([]);
  setKeyword('');
}, [source, selectedYear]);

  // 从统计数据中提取按年份的表格数据（使用 green_r 的数据）
  const yearlyTableData = statistics?.green_r?.yearly_data || [];

  // 总面积卡片显示文本
  const totalAreaText =
    currentYearTotalArea > 0
      ? `${currentYearTotalArea.toFixed(2)} 公顷`
      : loading
      ? '加载中...'
      : '无数据';

  // 年份选择下拉框的选项
  const yearOptions = [
    <option key="all" value="all">全部年份</option>,
    ...availableYears.map((year) => (
      <option key={year} value={year}>
        {year}年
      </option>
    )),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-green-700">🌿 城市绿地分析系统</h1>
          <p className="text-gray-600 text-sm">成都郫都区绿地时空变化监测</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 数据源选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数据源
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="green_v">矢量绿地 (OSM)</option>
                <option value="green_r">遥感绿地 (NDVI)</option>
              </select>
            </div>

            {/* 年份选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                年份筛选
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                {yearOptions}
              </select>
            </div>

            {/* 搜索框 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                地名搜索
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="输入地名，如：光华村、公园"
                  className="flex-1 border rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleSearch}
                  className="bg-green-600 text-white px-4 py-2 rounded-r-md hover:bg-green-700"
                >
                  搜索
                </button>
              </div>
            </div>

            {/* 统计卡片 */}
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                {source === 'green_r' ? '遥感绿地总面积' : '矢量绿地总面积'}
                {selectedYear !== 'all' && ` (${selectedYear}年)`}
              </div>
              <div className="text-2xl font-bold text-green-700">
                {totalAreaText}
              </div>
            </div>
          </div>
        </div>

        {/* 地图和搜索结果区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 地图容器 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="h-96">
              <MapComponent
                data={greenData}
                searchResults={searchResults}
                onFeatureClick={handleFeatureClick}
              />
            </div>
          </div>

          {/* 搜索结果列表 */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center justify-between">
              <span>搜索结果</span>
              <span className="text-sm text-gray-500">{searchResults.length} 条</span>
            </h3>
            {loading && <div className="text-gray-500 text-center py-4">加载中...</div>}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <div key={idx} className="border-b pb-3 hover:bg-gray-50 p-2 rounded">
                  <div
                    className="font-medium text-gray-800"
                    dangerouslySetInnerHTML={{ __html: highlightText(item.label) }}
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    类型: {item.category} | 来源: {item.source === 'green_v' ? 'OSM' : '遥感'} | 年份: {item.year}
                  </div>
                  {item.center && (
                    <div className="text-xs text-gray-400 mt-1">
                      坐标: {item.center[1].toFixed(6)}, {item.center[0].toFixed(6)}
                    </div>
                  )}
                </div>
              ))}
              {searchResults.length === 0 && keyword && (
                <div className="text-gray-500 text-center py-4">
                  未找到“{keyword}”相关结果
                </div>
              )}
              {searchResults.length === 0 && !keyword && (
                <div className="text-gray-400 text-center py-4">
                  输入地名开始搜索
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 统计表格（绿地变化趋势） */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-lg mb-3">📊 绿地变化趋势（遥感数据）</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">年份</th>
                  <th className="px-4 py-2 text-right">地块数量</th>
                  <th className="px-4 py-2 text-right">总面积(公顷)</th>
                  <th className="px-4 py-2 text-right">平均面积(公顷)</th>
                  <th className="px-4 py-2 text-right">平均NDVI</th>
                </tr>
              </thead>
              <tbody>
                {yearlyTableData.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{item.year}</td>
                    <td className="px-4 py-2 text-right">{item.count.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{item.area_hecta.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{(item.area_hecta / item.count).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{item.avg_ndvi?.toFixed(3) || '-'}</td>
                  </tr>
                ))}
                {yearlyTableData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 点击地块详情 */}
        {selectedFeature && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold text-lg mb-3">📍 地块详情</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">名称</div>
                <div className="font-medium">{selectedFeature.properties.name || '未命名'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">类型</div>
                <div>{selectedFeature.properties.fclass || selectedFeature.properties.class}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">年份</div>
                <div>{selectedFeature.properties.year}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">面积</div>
                <div>
                  {selectedFeature.properties.area_hecta
                    ? `${selectedFeature.properties.area_hecta.toFixed(2)} 公顷`
                    : selectedFeature.properties.area_sq_m
                    ? `${(selectedFeature.properties.area_sq_m / 10000).toFixed(2)} 公顷`
                    : selectedFeature.properties.shape_area
                    ? `${(selectedFeature.properties.shape_area * 12390).toFixed(2)} 公顷`
                    : '计算中...'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedFeature(null)}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}