import { useState, useCallback } from 'react';
import type { Block } from '../../types';

interface MapBlockProps {
  block?: Block;
  content?: string;
  onUpdate: (content: string) => void;
  onDelete?: () => void;
}

interface MapData {
  location: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  provider?: 'osm' | 'google' | 'amap' | 'baidu';
}

function parseMapContent(content: string): MapData {
  try {
    const parsed = JSON.parse(content);
    if (parsed.map) {
      return {
        location: parsed.map.location || '',
        lat: parsed.map.lat,
        lng: parsed.map.lng,
        zoom: parsed.map.zoom || 14,
        provider: parsed.map.provider || 'amap',
      };
    }
  } catch {}
  return { location: '', provider: 'amap' };
}

// 生成 OpenStreetMap 嵌入 URL
function getOpenStreetMapUrl(data: MapData): string {
  if (data.lat && data.lng) {
    const bbox = `${data.lng - 0.01},${data.lat - 0.01},${data.lng + 0.01},${data.lat + 0.01}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${data.lat},${data.lng}`;
  }
  return `https://www.openstreetmap.org/export/embed.html?bbox=116.3,39.9,116.5,40.1&layer=mapnik`;
}

// 生成 Google Maps 嵌入 URL
function getGoogleMapUrl(data: MapData): string {
  if (data.lat && data.lng) {
    return `https://maps.google.com/maps?q=${data.lat},${data.lng}&z=${data.zoom || 14}&output=embed`;
  }
  const encodedLocation = encodeURIComponent(data.location);
  return `https://maps.google.com/maps?q=${encodedLocation}&z=${data.zoom || 14}&output=embed`;
}

// 生成高德地图嵌入 URL
function getAmapUrl(data: MapData): string {
  // 高德地图 Web API 嵌入
  if (data.lat && data.lng) {
    return `https://uri.amap.com/marker?position=${data.lng},${data.lat}&name=${encodeURIComponent(data.location)}&coordinate=gaode&callnative=0`;
  }
  // 使用搜索模式
  const encodedLocation = encodeURIComponent(data.location);
  return `https://uri.amap.com/search?keyword=${encodedLocation}&city=`;
}

// 生成百度地图嵌入 URL
function getBaiduMapUrl(data: MapData): string {
  if (data.lat && data.lng) {
    return `https://api.map.baidu.com/marker?location=${data.lat},${data.lng}&title=${encodeURIComponent(data.location)}&content=${encodeURIComponent(data.location)}&output=html&src=daylog`;
  }
  const encodedLocation = encodeURIComponent(data.location);
  return `https://api.map.baidu.com/geocoder?address=${encodedLocation}&output=html&src=daylog`;
}

// 地图提供商配置
const MAP_PROVIDERS = [
  { id: 'amap', name: '高德地图', icon: '🗺️' },
  { id: 'baidu', name: '百度地图', icon: '📍' },
  { id: 'google', name: 'Google Maps', icon: '🌍' },
  { id: 'osm', name: 'OpenStreetMap', icon: '🌐' },
] as const;

export default function MapBlock({
  block,
  content: directContent,
  onUpdate,
  onDelete,
}: MapBlockProps) {
  const content = block?.content || directContent || '{}';
  const mapData = parseMapContent(content);
  const [isEditing, setIsEditing] = useState(!mapData.location);
  const [inputLocation, setInputLocation] = useState(mapData.location);
  const [mapProvider, setMapProvider] = useState<MapData['provider']>(mapData.provider || 'amap');

  const handleSave = useCallback(() => {
    if (inputLocation.trim()) {
      const data: MapData = {
        location: inputLocation.trim(),
        provider: mapProvider,
      };
      onUpdate(JSON.stringify({ map: data }));
      setIsEditing(false);
    }
  }, [inputLocation, mapProvider, onUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputLocation(mapData.location);
    }
  };

  const handleProviderChange = (provider: MapData['provider']) => {
    setMapProvider(provider);
    if (mapData.location) {
      const data: MapData = {
        ...mapData,
        provider,
      };
      onUpdate(JSON.stringify({ map: data }));
    }
  };

  // 获取当前地图 URL
  const getMapUrl = (): string => {
    switch (mapProvider) {
      case 'google':
        return getGoogleMapUrl(mapData);
      case 'baidu':
        return getBaiduMapUrl(mapData);
      case 'osm':
        return getOpenStreetMapUrl(mapData);
      case 'amap':
      default:
        return getAmapUrl(mapData);
    }
  };

  if (isEditing || !mapData.location) {
    return (
      <div className="embed-block p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-[#00D4AA] to-[#5594FF] rounded-xl flex items-center justify-center text-white text-xl">
            🗺️
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)]">嵌入地图</h3>
            <p className="text-xs text-[var(--color-text-muted)]">选择地图提供商并输入地点</p>
          </div>
        </div>

        {/* 地图提供商选择 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {MAP_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setMapProvider(provider.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                mapProvider === provider.id
                  ? 'bg-gradient-to-r from-[rgba(131,47,255,0.1)] to-[rgba(76,83,255,0.1)] border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-medium'
                  : 'bg-[var(--color-bg-secondary)] border-2 border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              <span>{provider.icon}</span>
              <span>{provider.name}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputLocation}
            onChange={(e) => setInputLocation(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入地点名称或地址，如：北京天安门"
            className="flex-1 input text-sm"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!inputLocation.trim()}
            className="btn-primary disabled:opacity-50"
          >
            嵌入
          </button>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            💡 提示：高德地图和百度地图更适合中国地区
          </p>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
            >
              删除
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="embed-block group">
      <div className="embed-block-header">
        <div className="flex items-center gap-2">
          <span>{MAP_PROVIDERS.find(p => p.id === mapProvider)?.icon || '📍'}</span>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{mapData.location}</span>
          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-2 py-0.5 rounded-full">
            {MAP_PROVIDERS.find(p => p.id === mapProvider)?.name || '高德地图'}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 地图提供商切换 */}
          <div className="flex items-center gap-1 mr-2">
            {MAP_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all duration-200 ${
                  mapProvider === provider.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)]'
                }`}
                title={provider.name}
              >
                {provider.icon}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="btn-ghost text-xs"
          >
            编辑
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="btn-ghost text-xs text-red-500 hover:text-red-700"
            >
              删除
            </button>
          )}
        </div>
      </div>
      <div className="embed-block-content">
        <iframe
          src={getMapUrl()}
          title={`地图: ${mapData.location}`}
          className="w-full h-80"
          frameBorder="0"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}
