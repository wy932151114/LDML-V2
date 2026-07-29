// Docker 部署时通过环境变量指定后端地址，本地开发使用默认 localhost
const API_V1_URL = process.env.API_V1_URL || 'http://server:4000';
const API_V2_URL = process.env.API_V2_URL || 'http://server-v2:5000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['echarts', 'echarts-for-react'],
  images: {
    unoptimized: true,
  },
  // 开发模式下使用 rewrite 代理到后端
  async rewrites() {
    return [
      {
        source: '/api/v2/report/:path*',
        destination: `${API_V1_URL}/api/v1/report/:path*`,
      },
      {
        source: '/api/v2/:path*',
        destination: `${API_V2_URL}/api/v2/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${API_V1_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
