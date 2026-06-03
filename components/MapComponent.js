// components/MapComponent.js
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 修复 Leaflet 默认图标问题
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function MapComponent({ data, searchResults, onFeatureClick }) {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // 初始化地图（郫都区中心）
    if (!mapRef.current && document.getElementById('map')) {
      mapRef.current = L.map('map').setView([30.88, 103.90], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>'

      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 更新地图数据图层
  useEffect(() => {
    if (!mapRef.current) return;

    if (layerRef.current) {
      mapRef.current.removeLayer(layerRef.current);
    }

    if (data && data.features && data.features.length > 0) {
      layerRef.current = L.geoJSON(data, {
        style: {
          color: '#4ade80',
          weight: 2,
          fillColor: '#22c55e',
          fillOpacity: 0.5,
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let areaText = '';
          if (props.area_hecta) areaText = `${props.area_hecta.toFixed(2)} 公顷`;
          else if (props.area_sq_m) areaText = `${(props.area_sq_m / 10000).toFixed(2)} 公顷`;
          else if (props.shape_area) areaText = `${(props.shape_area * 12390).toFixed(2)} 公顷`;
          else areaText = '面积未知';

          layer.bindPopup(`
            <div class="p-2">
              <b>${props.name || '未命名'}</b><br/>
              <span>类型: ${props.fclass || props.class}</span><br/>
              <span>年份: ${props.year}</span><br/>
              <span>面积: ${areaText}</span>
            </div>
          `);
          if (onFeatureClick) {
            layer.on('click', () => onFeatureClick(feature));
          }
        },
      }).addTo(mapRef.current);
    }
  }, [data, onFeatureClick]);

  // 更新搜索标记
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach(marker => mapRef.current.removeLayer(marker));
    markersRef.current = [];

    if (searchResults && searchResults.length > 0) {
      searchResults.forEach(result => {
        if (result.center && result.center.length === 2) {
          const marker = L.marker([result.center[1], result.center[0]])
            .bindPopup(`
              <div class="p-2">
                <b>${result.label}</b><br/>
                <span>类型: ${result.category}</span><br/>
                <span>来源: ${result.source === 'green_v' ? 'OSM' : '遥感'}</span><br/>
                <span>年份: ${result.year || '未知'}</span>
              </div>
            `)
            .addTo(mapRef.current);
          markersRef.current.push(marker);
        }
      });

      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        mapRef.current.fitBounds(group.getBounds().pad(0.2));
      }
    }
  }, [searchResults]);

  return <div id="map" style={{ width: '100%', height: '100%', minHeight: '400px' }} />;
}