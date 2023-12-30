---
external: false
draft: true
title: "How optimize images with Cloudflare Worker"
description: "How optimize images using a Cloudflare Worker"
date: 2023-12-30
---

I was using [bunny optimizer](https://bunny.net/optimizer/transform-api/) for a while to reduce images sizes, but I was not happy with the results, because the cost seemed high to me, for the amount of images I was optimizing, so bunny optimizer was not a good option for me, because with with scale, the cost would be very high,

So I decided to create my own image optimizer using Cloudflare Workers, because I already use Cloudflare for my DNS, and their free tier is very generous, so I decided to give it a try and even if I need to pay, I will pay less than with bunny optimizer with their current plan.

Why do I need to use a worker instead of directly using Cloudflare image optimizer? Because for my use case, the images are hosted on [Digital Ocean Spaces](https://www.digitalocean.com/products/spaces/), and Cloudflare doesn't support for now the option to allow images hosted on another domain to be optimized, and you can't block requests coming from unknown ip addresses. Cloudflare images optimizer have by default the option to allow images hosted on the Cloudflare only or allow all images on the internet.

So I need to use a worker to act as proxy and to that logic for me. Then will be able to allow images hosted on a custom domain to be optimized and also block requests coming from unknown ip addresses.

## Create a Cloudflare Worker

First you need to create a Cloudflare Worker, you can do the by using the Cloudflare dashboard, or by using Wrangler CLI, I will use the CLI, because it's easier to track changes with git and to deploy the worker.

Prerequisites:

- npm
- node
- Cloudflare account

let's create the worker:

```bash
yarn create cloudflare
```

Follow the instructions, create a simple hello world worker and you can use typescript if you want. You don't need to deploy it yet, we will do that later. Now let's add the logic to optimize the images. Go to your worker folder and open the `index.ts` file, and
