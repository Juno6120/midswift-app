/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/export/annual": ["./src/templates/**/*"],
  },
};
module.exports = nextConfig;
