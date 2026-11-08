/** @type {import('next').NextConfig} */

const nextConfig: import("next").NextConfig = {
  transpilePackages: ["@primer/react"],
  turbopack: {
    resolveAlias: {
      "@primer/react/dist/Card":
        "./node_modules/@primer/react/dist/Card/index.js",
    },
  },
};

export default nextConfig;
