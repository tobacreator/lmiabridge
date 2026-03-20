/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ['agentops', '@opentelemetry/sdk-node', '@opentelemetry/exporter-jaeger'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('agentops', '@opentelemetry/sdk-node', '@opentelemetry/exporter-jaeger');
    }
    return config;
  },
};

module.exports = nextConfig;
