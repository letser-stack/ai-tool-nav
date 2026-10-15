import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
export default defineConfig({ site: 'https://ai-tool-nav-iota.vercel.app', trailingSlash: 'always', integrations: [sitemap()], build:{inlineStylesheets:'always'} });
