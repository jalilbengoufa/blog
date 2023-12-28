---
external: false
draft: true
title: "How optimize images with Cloudflare Worker"
description: "How optimize images using a Cloudflare Worker"
date: 2023-12-30
---

I was using [bunny optimizer](https://bunny.net/optimizer/transform-api/) for a while to reduce images sizes, but I was not happy with the results, because the cost seemed high to me, for the amount of images I was optimizing, so bunny optimizer was not a good option for me, because with with scale, the cost would be very high,

So I decided to create my own image optimizer using Cloudflare Workers, because I already use Cloudflare for my DNS, adn their free tier is very generous, so I decided to give it a try and even if I need to pay, I will pay less than with bunny optimizer with their current plan.

The images are hosted on [Digital Ocean Spaces](https://www.digitalocean.com/products/spaces/), so on my app all I need to do is to change the image hostname to point to the Cloudflare Worker hostname, and the worker with the Cloudflare image optimizer will do the rest.

## Create a Cloudflare Worker

## Update app to use the Cloudflare image optimizer url instead of the DigitalOcean image url
