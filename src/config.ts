// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = "jail's Blog";
export const SITE_DESCRIPTION =
  "Welcome to my blog! I write about stuff I do and stuff I like.";
export const TWITTER_HANDLE = "@geniustaiga1";
export const MY_NAME = "Jalil";

// setup in astro.config.mjs
const BASE_URL = new URL(import.meta.env.SITE);
export const SITE_URL = BASE_URL.origin;
