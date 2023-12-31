---
external: false
draft: false
title: "How to Optimize Images with Cloudflare Worker"
description: "Learn how to optimize images using a Cloudflare Worker"
date: 2023-12-31
---

I was using [bunny optimizer](https://bunny.net/optimizer/transform-api/) for a while to reduce image sizes, but I was not happy with the results. The cost seemed high for the number of images I was optimizing. Therefore, the bunny optimizer was not a suitable option for me, especially considering that costs would escalate with scale.

Consequently, I decided to create my own image optimizer using Cloudflare Workers. I already use Cloudflare for my DNS, and their free tier is very generous. Even if I need to pay, it will cost less than what bunny optimizer charges on their current plan.

Why do I need to use a worker instead of directly using Cloudflare's image optimizer? In my case, the images are hosted on [Digital Ocean Spaces](https://www.digitalocean.com/products/spaces/), and Cloudflare does not currently support optimizing images hosted on other domains. Also, you cannot block requests coming from unknown IP addresses. Cloudflare's image optimizer, by default, allows images hosted on Cloudflare only or permits all images on the internet.

Therefore, I need a worker to act as a proxy to implement this logic for me. This approach enables the optimization of images hosted on a custom domain and blocks requests from unknown IP addresses.

## Create a Cloudflare Worker

First, you need to create a Cloudflare Worker. This can be done using the Cloudflare dashboard or the Wrangler CLI. I prefer the CLI, as it's easier to track changes with git and deploy the worker.

Prerequisites:

- npm
- yarn
- node
- Cloudflare account

let's create the worker:

```bash
yarn create cloudflare
```

Follow the instructions, create a simple "hello world" worker, and use TypeScript if you prefer. Don't deploy it yet; we'll do that later.

Now, let's add the logic to optimize the images. Go to your worker folder and open the `src/index.ts` file in the created worker project.
We can start the logic from [this simple](https://developers.cloudflare.com/images/image-resizing/resize-with-workers/#an-example-worker) code found on the Cloudflare docs.

Let's add the following code to the `src/index.ts` file:

```typescript
export interface Env {}

type FIT_TYPE = "scale-down" | "contain" | "cover" | "crop" | "pad";
type FORMAT_TYPE = "avif" | "webp" | "json" | "jpeg" | "png";
type OUTPUT_TYPE = "thumbnail" | "small" | "medium" | "large";

const ALLOWED_SOURCE_ORIGINS = ["images.unsplash.com"];
const ALLOWED_IP_LIST = ["00.00.00.00"];

const OUTPUT_SIZES: { [key in OUTPUT_TYPE]: number } = {
  thumbnail: 150,
  small: 320,
  medium: 640,
  large: 1024,
};

interface ImageOptions {
  cf: {
    image: {
      fit?: FIT_TYPE;
      width?: number;
      height?: number;
      quality?: number;
      format?: FORMAT_TYPE;
    };
  };
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return handleRequest(request);
  },
};

async function handleRequest(request: Request): Promise<Response> {
  const ip = request.headers.get("cf-connecting-ip");

  if (!ip) {
    return new Response("Missing ip header", { status: 400 });
  }

  if (!ALLOWED_IP_LIST.includes(ip)) {
    return new Response("Unauthorized", { status: 400 });
  }

  const url = new URL(request.url);
  const options: ImageOptions = { cf: { image: {} } };

  const outputType = url.searchParams.get("type");
  const quality = url.searchParams.get("quality");

  if (outputType) {
    const size = OUTPUT_SIZES[outputType as OUTPUT_TYPE];
    options.cf.image.width = size;
    options.cf.image.height = size;
  }

  if (quality) {
    options.cf.image.quality = parseInt(quality, 10);
  }

  const accept = request.headers.get("Accept");
  if (accept && /image\/avif/.test(accept)) {
    options.cf.image.format = "avif";
  } else if (accept && /image\/webp/.test(accept)) {
    options.cf.image.format = "webp";
  }

  let imageURL = url.searchParams.get("image");
  if (!imageURL) return new Response('Missing "image" value', { status: 400 });
  imageURL = decodeURIComponent(imageURL);

  try {
    const { hostname } = new URL(imageURL);
    if (!ALLOWED_SOURCE_ORIGINS.includes(hostname)) {
      return new Response("Invalid source image URL", { status: 403 });
    }
  } catch (err) {
    return new Response('Invalid "image URL" value', { status: 400 });
  }

  const imageRequest = new Request(imageURL, {
    headers: request.headers,
  });

  return fetch(imageRequest, options);
}
```

Let's go through the code. First, we define the allowed origins for images and IP addresses. You can add more if needed. For example, I want to allow only images from `images.unsplash.com` to be optimized, and I want to permit requests only from my IP address, such as the IP of the server where your backend is deployed. This way, you can block requests from other IP addresses.

```typescript
const ALLOWED_SOURCE_ORIGINS = ["images.unsplash.com"];
const ALLOWED_IP_LIST = ["00.00.00.00"];
```

Then we define the output sizes. You can add more if you want. We will use the `type` query parameter to define the image's size. For example, `type=small` will return an image with a size of 320px. Feel free to modify the sizes as needed.

```typescript
const OUTPUT_SIZES: { [key in OUTPUT_TYPE]: number } = {
  thumbnail: 150,
  small: 320,
  medium: 640,
  large: 1024,
};
```

We define the options for the image using the Cloudflare image optimizer options. More information about these options can be found [here](https://developers.cloudflare.com/images/image-resizing/resize-with-workers/).
For this example we will use the following options:

- quality
- width
- height

We check if the request comes from an allowed IP address; if not, we return a 400 status code.

```typescript
const ip = request.headers.get("cf-connecting-ip");

if (!ip) {
  return new Response("Missing ip header", { status: 400 });
}

if (!ALLOWED_IP_LIST.includes(ip)) {
  return new Response("Unauthorized", { status: 400 });
}
```

We determine the accepted image type in the headers, decode the image URL, and verify if the image is hosted on an allowed origin. If not, we return a 403 status code.

```typescript
const accept = request.headers.get("Accept");
if (accept && /image\/avif/.test(accept)) {
  options.cf.image.format = "avif";
} else if (accept && /image\/webp/.test(accept)) {
  options.cf.image.format = "webp";
}

let imageURL = url.searchParams.get("image");
if (!imageURL) return new Response('Missing "image" value', { status: 400 });
imageURL = decodeURIComponent(imageURL);

try {
  const { hostname } = new URL(imageURL);
  if (!ALLOWED_SOURCE_ORIGINS.includes(hostname)) {
    return new Response("Invalid source image URL", { status: 403 });
  }
} catch (err) {
  return new Response('Invalid "image URL" value', { status: 400 });
}
```

Finally, we fetch the image with the optimization options and return the response.

```typescript
const imageRequest = new Request(imageURL, {
  headers: request.headers,
});

return fetch(imageRequest, options);
```

Now we are ready, let's deploy the worker, it's very easy to deploy, just run the following command, it should generate a URL or open a browser window with the URL and ask you to login with your Cloudflare account. When you accept a cloudflare worker will be created and deployed.

You need to enable image optimization in your Cloudflare dashboard, go to the speed tab and enable image optimization. Resize images from any origin should disabled!

```bash
yarn deploy
```

You should have now a cloudflare worker deployed, you can check it by going to your Cloudflare dashboard and click on workers, you should see your worker there. the worker should be deployed with the subdomain
`cloudflare-images-optimizer.{domain}.workers.dev`, let's test it by adding an image url to the end of the url by editing the size and quality of the image.

Let's use this image as an example: `https://images.unsplash.com/photo-1682687218147-9806132dc697`, you can try another image if you want.
we should encode the image url, so we can pass it as a query parameter, you can use this [tool](https://www.urlencoder.org/) to encode the url or you can do this in javascript with the following code:

```javascript
const encodedImageUrl = encodeURIComponent(
  "https://images.unsplash.com/photo-1682687218147-9806132dc697"
);
```

Open this url with your domain in a browser :

```url
https://cloudflare-images-optimizer.{domain}.workers.dev/?type=small&quality=40&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1682687218147-9806132dc697
```

The images should not be optimized yet because the image is hosted on a different domain from the where optimization is activated on CLoudflare (`workers.dev`), we need to add a subdomain to the worker, so it can allow the image to be optimized.

In the Cloudflare dashboard go to workers, triggers tab and add a custom domain to the worker, for example `images-optimizer.{domain}`.

Now you can try to open the url again with the custom subdomain, it should work now, you should see the optimized image:

```url
https://images-optimizer.{domain}/?type=small&quality=40&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1682687218147-9806132dc697
```

The code for the worker can be found here

```url
https://github.com/jalilbengoufa/cloudflare-images-optimizer
```

For contact or feedback you can reach me by email bellow or on twitter, LinkedIn, links are in the footer.

```txt
iamrootin@proton.me
```
