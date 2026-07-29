// ============================================================
// 道之自然·命理引擎 — 时区处理
// 独立文件，处理全球时区和中国经纬度
// ============================================================

/**
 * 中国主要城市经度表
 * 用于真太阳时修正的快速查询
 */
export interface CityLocation {
  city: string;
  province: string;
  longitude: number;
  latitude: number;
}

export const CHINA_CITIES: CityLocation[] = [
  { city: '北京', province: '北京', longitude: 116.4, latitude: 39.9 },
  { city: '上海', province: '上海', longitude: 121.5, latitude: 31.2 },
  { city: '广州', province: '广东', longitude: 113.3, latitude: 23.1 },
  { city: '深圳', province: '广东', longitude: 114.1, latitude: 22.5 },
  { city: '杭州', province: '浙江', longitude: 120.2, latitude: 30.3 },
  { city: '南京', province: '江苏', longitude: 118.8, latitude: 32.1 },
  { city: '成都', province: '四川', longitude: 104.1, latitude: 30.6 },
  { city: '武汉', province: '湖北', longitude: 114.3, latitude: 30.6 },
  { city: '重庆', province: '重庆', longitude: 106.5, latitude: 29.6 },
  { city: '西安', province: '陕西', longitude: 108.9, latitude: 34.3 },
  { city: '天津', province: '天津', longitude: 117.2, latitude: 39.1 },
  { city: '长沙', province: '湖南', longitude: 112.9, latitude: 28.2 },
  { city: '郑州', province: '河南', longitude: 113.7, latitude: 34.8 },
  { city: '沈阳', province: '辽宁', longitude: 123.4, latitude: 41.8 },
  { city: '哈尔滨', province: '黑龙江', longitude: 126.6, latitude: 45.8 },
  { city: '乌鲁木齐', province: '新疆', longitude: 87.6, latitude: 43.8 },
  { city: '拉萨', province: '西藏', longitude: 91.1, latitude: 29.6 },
  { city: '昆明', province: '云南', longitude: 102.7, latitude: 25.0 },
  { city: '贵阳', province: '贵州', longitude: 106.7, latitude: 26.6 },
  { city: '南宁', province: '广西', longitude: 108.4, latitude: 22.8 },
  { city: '海口', province: '海南', longitude: 110.3, latitude: 20.0 },
  { city: '福州', province: '福建', longitude: 119.3, latitude: 26.1 },
  { city: '济南', province: '山东', longitude: 117.0, latitude: 36.7 },
  { city: '合肥', province: '安徽', longitude: 117.3, latitude: 31.9 },
  { city: '南昌', province: '江西', longitude: 115.9, latitude: 28.7 },
  { city: '太原', province: '山西', longitude: 112.5, latitude: 37.9 },
  { city: '石家庄', province: '河北', longitude: 114.5, latitude: 38.0 },
  { city: '呼和浩特', province: '内蒙古', longitude: 111.8, latitude: 40.8 },
  { city: '兰州', province: '甘肃', longitude: 103.8, latitude: 36.0 },
  { city: '西宁', province: '青海', longitude: 101.8, latitude: 36.6 },
  { city: '银川', province: '宁夏', longitude: 106.3, latitude: 38.5 },
  { city: '台北', province: '台湾', longitude: 121.5, latitude: 25.0 },
  { city: '香港', province: '香港', longitude: 114.2, latitude: 22.3 },
  { city: '澳门', province: '澳门', longitude: 113.5, latitude: 22.2 },
];

/**
 * 中国标准时区
 * 东八区 (UTC+8)
 */
export const CHINA_STANDARD_LONGITUDE = 120;
export const CHINA_TIMEZONE = 'Asia/Shanghai';
export const CHINA_UTC_OFFSET = 8; // UTC+8

/**
 * 获取经度对应的标准时区中央经线
 * 中国统一使用东八区（东经120°）
 */
export function getStandardLongitude(timezone?: string): number {
  // 中国全境统一使用东八区
  return CHINA_STANDARD_LONGITUDE;
}

/**
 * 按城市名搜索经纬度
 */
export function searchCity(name: string): CityLocation | null {
  const found = CHINA_CITIES.find(
    c => c.city.includes(name) || c.province.includes(name)
  );
  return found || null;
}

/**
 * 地理位置 → 真太阳时修正（分钟）
 * 公式：修正值 = (本地经度 - 时区中央经度) × 4
 */
export function getLongitudeOffset(longitude: number): number {
  return (longitude - CHINA_STANDARD_LONGITUDE) * 4;
}

/**
 * 判断是否在新疆/西藏等西部（经度<100°E）
 */
export function isWesternRegion(longitude: number): boolean {
  return longitude < 100;
}

/**
 * 获取时区字符串
 */
export function getTimezoneString(offset: number): string {
  const sign = offset >= 0 ? '+' : '-';
  return `UTC${sign}${Math.abs(offset)}`;
}
