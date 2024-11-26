import { Smallblog } from "jsr:@tayzendev/smallblog@1.2.0";

export default new Smallblog({
  siteDescription:
    "A blog to demonstrate the capabilities of smallblog, the blog engine build for smallweb",
  siteTitle: "Smallblog demo",
  indexTitle: "A blog about nothing",
  indexSubtitle: "A nice demo of smallblog",
  defaultAuthors: ["Owner"],
  noArticlesMessage: "<h3>Coming soon!</h3>",
});
