---
preview: "This is a post with custom preview, the text inside is note the same as this preview"
---

# A post which should have a bad preview

Small text

## This should be inside the preview

This is [a link](https://blog.tayzen.dev).

```tsx
/** @jsxImportSource hono/jsx */
// Should be inside the preview
import * as path from "@std/path";
import * as fs from "@std/fs";
import { contentType } from "@std/media-types";
import { type Context, Hono } from "hono";
import { compress } from "hono/compress";
import { Index } from "./templates/index.tsx";
import {
  filterArticlesFTS,
  getArticle,
  getArticles,
  getRSS,
  getSitemap,
} from "./blog.ts";
import { isDirectoryEmpty, getMtime, isUrl } from "./utils.ts";
import { ArticlePage } from "./templates/article.tsx";
import { Articles } from "./templates/components/articles.tsx";
import type { App } from "@smallweb/types";
import { storeArticle } from "./article_generator.ts";
import { generateCli } from "./cli.ts";
import { CustomPage } from "./templates/customPage.tsx";

/**
 * The options to create your blog.
 */
export type SmallblogOptions = {
  /** The folder where your posts are located (default: `posts/`). The name of the folder will be
   * used for the routes (ex: of you named your folder `abcd`, the route to a post will be
   * `/abcd/my_post`). */
  postsFolder?: string;
  /** The folder where your drafts are located (default: `drafts/`). The name of the folder will be
   * used for the routes (ex: of you named your folder `abcd`, the route to a post will be
   * `/abcd/my_post`). */
  draftsFolder?: string;
  /** The folder where your custom pages are located (default: `pages/`). These pages are displayed
   * inside the navbar and their route starts with `/`, following by the name of the file without
   * extension. */
  pagesFolder?: string;
  /** The path or URL to your favicon (default: empty). */
  favicon?: string;
  /** The title of your blog (default: `Smallblog`). */
  siteTitle?: string;
  /** The description of your blog (default: `The blog: ${siteTitle}`). */
  siteDescription?: string;
  /** The title of the index page (ex: `A blog about nothing`, no default). */
  indexTitle?: string;
  /** The subtitle of the index page (ex: `A nice demo of smallblog`, no default). */
  indexSubtitle?: string;
  /** The message to display when there are no articles (ex: `Coming soon!`, default is a message
   * to help you starting). */
  noArticlesMessage?: string;
  /** The locale of your blog. */
  locale?: string;
  /** The script to add to the header of your blog. */
  customHeaderScript?: string;
  /** The script to add to the body of your blog. */
  customBodyScript?: string;
  /** Whether to cache the responses or not. */
  cacheEnabled?: boolean;
};

function getBaseUrl(c: Context): string {
  return new URL(c.req.url).origin;
}

function servePage(
  c: Context,
  name: string,
  folder: string,
  faviconIsUrl: boolean,
  customPages: { name: string; path: string; external: boolean }[] = [],
  opts: SmallblogOptions,
  article: boolean = true,
) {
  const {
    siteTitle = "Smallblog",
    locale,
    customHeaderScript,
    customBodyScript,
    favicon,
  } = opts;

  const page = getArticle(name, folder);
  const renderedPage = page.html;

  if (!renderedPage) {
    return new Response("Page not found", { status: 404 });
  }

  if (article) {
    return c.html(
      `<!DOCTYPE html>` +
      (
        <ArticlePage
          article={page}
          siteTitle={siteTitle}
          url={c.req.url}
          locale={locale}
          bodyScript={customBodyScript}
          headScript={customHeaderScript}
          favicon={!!favicon}
          faviconLink={faviconIsUrl ? favicon : undefined}
          customPages={customPages}
        />
      ),
    );
  }
  return c.html(
    `<!DOCTYPE html>` +
    (
      <CustomPage
        article={page}
        siteTitle={siteTitle}
        url={c.req.url}
        locale={locale}
        bodyScript={customBodyScript}
        headScript={customHeaderScript}
        favicon={!!favicon}
        faviconLink={faviconIsUrl ? favicon : undefined}
        customPages={customPages}
      />
    ),
  );
}

function serveStaticFile(name?: string, folder?: string) {
  if (!name) {
    return new Response("Not found", { status: 404 });
  }
  try {
    let file;
    if (folder) {
      file = Deno.readFileSync(path.join(folder, name));
    } else {
      file = Deno.readFileSync(name);
    }
    return new Response(file, {
      headers: {
        "content-type":
          contentType(name.substring(name.lastIndexOf("."))) ||
          "application/octet-stream",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function getNoArticlesMessage(opts: SmallblogOptions) {
  const { noArticlesMessage, postsFolder, draftsFolder } = opts;

  if (noArticlesMessage) {
    return noArticlesMessage;
  }

  const baseMessage = `<p>You have no articles yet, you can add them by creating a folder <code>${postsFolder}</code> and adding markdown files in it. Don't forget to also add a <code>${draftsFolder}</code> folder for your drafts.</p><p>Read the README for more informations.</p>`;

  const writePermission = await Deno.permissions.query({
    name: "write",
    path: ".",
  });

  if (writePermission.state === "granted") {
    return (
      baseMessage +
      `<p><a class="button" href="/init">Let smallblog do it for you!</a></p>`
    );
  }

  return baseMessage;
}

/**
 * The function to create your blog, you configure your blog with the options
 * and then you just have to write your files
 *
 * @param options The parameters to create the blog.
 * @returns A smallweb/hono app with a fetch method
 */
export function createSmallblog(options: SmallblogOptions = {}): App {
  const {
    postsFolder = "posts/",
    draftsFolder = "drafts/",
    pagesFolder = "pages/",
    favicon,
    siteTitle = "Smallblog",
    siteDescription = `The blog: ${siteTitle}`,
    cacheEnabled = true,
    indexTitle,
    indexSubtitle,
    locale,
    customHeaderScript,
    customBodyScript,
  } = options;

  const app = new Hono();

  const postsRoute = path.join("/", postsFolder);
  const draftsRoute = path.join("/", draftsFolder);
  const faviconIsUrl = isUrl(favicon || "");

  const customPages = getArticles(pagesFolder, "/")
    .map((article) => ({
      name: article.title,
      path: article.metadata?.redirect || article.url,
      external: !!article.metadata?.redirect,
      order: article.metadata?.order || Infinity,
    }))
    .sort((a, b) => {
      if (a?.order && b?.order) {
        return a?.order - b?.order;
      }
      return -1;
    });

  const completeOptions = {
    ...options,
    postsFolder,
    draftsFolder,
    pagesFolder,
    siteTitle,
    siteDescription,
    cacheEnabled,
  };

  app.use(compress());

  app.use("*", async (c, next) => {
    if (!cacheEnabled) {
      await next();
      return;
    }

    let filePath: string | undefined = undefined;
    const urlPath = new URL(c.req.url).pathname;

    if (urlPath === "/favicon" && !faviconIsUrl) {
      filePath = favicon;
    }
    if (urlPath.startsWith(postsRoute)) {
      filePath = path.join(
        ".",
        urlPath + (path.extname(c.req.url) ? "" : ".md"),
      );
    }
    if (urlPath.startsWith(draftsRoute)) {
      filePath = path.join(
        ".",
        urlPath + (path.extname(c.req.url) ? "" : ".md"),
      );
    }
    if (urlPath === "/") {
      filePath = postsFolder;
    }
    if (urlPath.startsWith("/")) {
      const filename = c.req.path.slice(1);
      const tmpPath = path.join(
        pagesFolder,
        filename + (!path.extname(filename) ? ".md" : ""),
      );
      if (filename && fs.existsSync(tmpPath)) {
        filePath = tmpPath;
      }
    }
    if (!filePath || !fs.existsSync(filePath)) {
      await next();
      return;
    }

    const cache = await caches.open("smallblog");
    const cachedResponse = await cache.match(c.req.url);

    const lastUpdateTime = new Date((await getMtime(filePath)) * 1000);

    if (cachedResponse) {
      const cacheLastUpdate = new Date(
        cachedResponse.headers.get("X-Last-Update") || 0,
      );

      if (cacheLastUpdate >= lastUpdateTime) {
        return cachedResponse;
      } else {
        await cache.delete(c.req.url);
      }
    }

    await next();

    const response = c.res.clone();
    response.headers.set("X-Last-Update", lastUpdateTime.toISOString());
    await cache.put(c.req.url, response);
  });

  app.get("/", async (c) => {
    const page = c.req.query("page") || 1;
    const search = c.req.query("search") || "";
    const itemsPerPage = 5;
    const posts = getArticles(postsFolder);

    const filteredPosts = filterArticlesFTS(posts, search);

    const hxRequest = c.req.header("hx-request");
    const hxBoosted = c.req.header("hx-boosted");

    if (hxRequest && !hxBoosted) {
      return c.html(
        <Articles
          posts={filteredPosts}
          search={search}
          page={Number(page)}
          itemsPerPage={itemsPerPage}
        />,
        200,
        {
          "HX-Push-Url": search ? "/?page=1&search=" + search : "/?page=1",
        },
      );
    }

    return c.html(
      `<!DOCTYPE html>` +
      (
        <Index
          posts={filteredPosts}
          page={Number(page)}
          itemsPerPage={itemsPerPage}
          search={search}
          siteTitle={siteTitle}
          indexTitle={indexTitle}
          indexSubtitle={indexSubtitle}
          url={c.req.url}
          locale={locale}
          description={siteDescription}
          noArticlesMessage={await getNoArticlesMessage(completeOptions)}
          bodyScript={customBodyScript}
          headScript={customHeaderScript}
          favicon={!!favicon}
          faviconLink={faviconIsUrl ? favicon : undefined}
          customPages={customPages}
        />
      ),
    );
  });

  app.get(path.join(postsRoute, ":filename{.+$}"), (c) => {
    const filename = c.req.param("filename");

    if (!filename) {
      // if the route is /posts/
      return new Response("Not found", { status: 404 });
    }
    if (path.extname(filename)) {
      // if the name contains an ext this is not an article
      return serveStaticFile(filename, postsFolder);
    }
    return servePage(
      c,
      filename,
      postsFolder,
      faviconIsUrl,
      customPages,
      completeOptions,
    );
  });

  app.get(path.join(draftsRoute, ":filename{.+$}"), (c) => {
    const filename = c.req.param("filename");

    if (!filename) {
      // if the route is /article/
      return new Response("Not found", { status: 404 });
    }
    if (path.extname(filename)) {
      // if the name contains an ext this is not an article
      return serveStaticFile(filename, draftsFolder);
    }
    return servePage(
      c,
      filename,
      draftsFolder,
      faviconIsUrl,
      customPages,
      completeOptions,
    );
  });

  app.get("/rss.xml", (c) => {
    const baseUrl = getBaseUrl(c);
    const articles = getArticles(postsFolder);
    const xml = getRSS(baseUrl, articles);
    return new Response(xml, {
      headers: {
        "content-type": "application/xml",
      },
    });
  });

  app.get("/sitemap.xml", (c) => {
    const baseUrl = getBaseUrl(c);
    const articles = getArticles(postsFolder);
    const customPages = getArticles(pagesFolder, "/").filter(
      (page) => !!page?.metadata?.redirect !== true,
    );
    const xml = getSitemap(baseUrl, articles.concat(customPages));
    if (xml) {
      return new Response(xml, {
        headers: {
          "content-type": "application/xml",
        },
      });
    }
    return new Response("Not found", { status: 404 });
  });

  app.get("/robots.txt", (c) => {
    const baseUrl = getBaseUrl(c);
    const robotTxt = `
      User-agent: *
      Disallow: /drafts
      Sitemap: ${new URL("/sitemap.xml", baseUrl).href}
      `
      .replace(/  +/g, "")
      .trim();
    return new Response(robotTxt, {
      headers: {
        "content-type": "text/plain",
      },
    });
  });

  app.on("GET", ["/favicon", "/favicon.ico"], () => {
    return serveStaticFile(favicon);
  });

  app.get("/init", async (c) => {
    fs.ensureDirSync(draftsFolder);
    fs.ensureDirSync(postsFolder);
    fs.ensureDirSync(pagesFolder);
    if (await isDirectoryEmpty(postsFolder)) {
      storeArticle(postsFolder, "first-article.md", {
        title: "My first article",
        content:
          "This is my first article. This is an image:\n\n![RSS](first-article/exampleImage.svg)",
      });
    }

    return c.redirect("/");
  });

  app.get("/:filename{.+$}", (c) => {
    const filename = c.req.param("filename");

    return servePage(
      c,
      filename,
      pagesFolder,
      faviconIsUrl,
      customPages,
      completeOptions,
      false,
    );
  });

  return {
    ...app,
    run: generateCli(postsFolder, draftsFolder),
  };
}
```
