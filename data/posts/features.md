---
title: Features overview
description: A quick explaination of the features of smallblog.
tags:
    - smallblog
    - features
date: 2024-11-21
---

Smallblog is made to be very intuitive to use, you just write your Markdown and everything is automatically generated. However, not everyone knows the syntax and there are other features dedicated to more advanced users.

This post aims to help everyone, don't run away if you're not accustomed to Markdown! We will discuss syntax, additions to standard markdown, hiding a post and creating a custom page.

> [!NOTE] I will link to GitHub in this post to see some markdown examples. Don't hesitate to click on the `raw` button to see the unformatted code.

## Syntax

Smallblog uses the basic Markdown syntax, everything you know you can do with Markdown is also available to you with smallblog. This includes:

- Headings
- Lists
- Images
- Links
- Code blocks
- Tables
- Blockquotes

There is more, you can also use alerts and link videos just as images (which a special handler for YouTube) and transform mermaid code blocks into diagrams automagically.

Everything related to the syntax is available in [this post](/posts/post_test.md) and the corresponding code is available [on the GitHub repo](https://github.com/Tayzendev/smallblog/tree/main/data/posts/post_test.md).

## Hide a post

If you are reading this, you are probably a little bit familiar with Markdown syntax and maybe you are considering using Smallblog to start your blog journey.

I exmplain at the start of this document and in the README that you just need to write a markdown file and you have a post. This is totally true but maybe you don't want your visitors to see it during the redaction. You don't want all your drafts to be publicly available.

Well, Smallblog allows you to hie some posts easily for that exact reason. To hide a post, add a `_` symbol at the beginning of the filename, for example: `post.md` is not hidden but `_post.md` is.

Hidden posts are not indexed in the site but the URL is still available. This enables you to easily share your posts with others for proofreading purposes, private access for your closer community or anything you want.

There is an example of hidden post in this instance of Smallblog: [`/posts/_hidden`](/posts/_hidden), the corresponding code is available [on the GitHub repo](https://github.com/Tayzendev/smallblog/tree/main/data/posts/_hidden.md).

## Create a custom page

Smallblog allows you to create pages which are not blog posts. These can be accessed from the navbar at the top of the page (as you can see with `github`, `JSR` and `contact` pages).

The code for these pages is available [on the GitHub repo](https://github.com/Tayzendev/smallblog/tree/main/data/pages).
