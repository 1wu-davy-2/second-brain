import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite 是 WASM 包、ws 带可选原生扩展，都必须留在 Node 运行时直接 require
  serverExternalPackages: ["@electric-sql/pglite", "ws"],
  experimental: {
    // Server Action 里上传/提交的字段限制
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // PGlite 的 WAL 文件会持续写入 .data/，不排除会触发 dev 无限重编译
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/.data/**", "**/.playwright-cli/**", "**/shots/**", "**/.git/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
