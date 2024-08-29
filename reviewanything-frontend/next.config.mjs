// @ts-check
 
/** @type {import('next').NextConfig} */
const nextConfig = {

  async rewrites() {

  return [

      {

      source: "/callollama",

      destination: `http://host.containers.internal:11434/api/chat`,

      },

  ];

  },

  trailingSlash: true

  }

export default nextConfig
