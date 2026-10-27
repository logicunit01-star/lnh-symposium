/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "6mb" }, serverComponentsExternalPackages: ["pg", "@electric-sql/pglite", "pdf-lib", "nodemailer", "qrcode"] },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default nextConfig;
