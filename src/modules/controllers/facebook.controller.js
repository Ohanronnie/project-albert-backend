import { Post, Page } from "../schemas/post.schema.js";
import { User } from "../schemas/user.schema.js";
import AppError from "../../common/utils/appError.js";
import { catchAsync } from "../../common/utils/errorHandler.js";
import { topic as Topic } from "./news.js";
import Session from "./session.js";
import { FacebookPost } from "./facebook.js";
export async function LoginDetails(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Fill all details please " });
    const Facebook = new FacebookPost(email, password);
    let cookie = await Facebook.getCookie();
    if (!cookie) return res.status(400).json("Incorrect password");
    let token = await Facebook.getToken();
    if (!token) return res.status(400).json("Incorrect password or re-login");
    let pages = await Facebook.getPages();
    if (!pages)
      return res.status(400).json("Error occurred somewhere! Re-login");
    if (!pages.page.length < 1)
      return res.status(200).json({ message: "No Page Available" });
    for (let i = 0; i < pages.page.length; i++) {
      let _page = pages.page[i];
      const page = new Page({
        pageId: _page.id,
        pageToken: _page.token,
        pageCookie: pages.cookie,
        pageName: _page.name,
        ownerId: req.userId,
      });
      await page.save();
    }
    return res.status(200).json({
      page: pages.page.map((val) => ({ name: val.name, id: val.id })),
    });
  } catch (err) {
    console.log(error);
    res.status(400).json("Error occurred somewhere");
  }
}

export async function pageSelect(req, res) {
  try {
    const { pageId, contentType } = req.body;
    if (!pageId || !contentType)
      return res.status(400).json({ message: "Fill all form to continue." });
    const page = await Page.findOne({ pageId });
    if (!page) return res.status(400).json({ message: "Page not found" });

    await Page.findOneAndUpdate({ pageId }, { contentType });

    return res.status(200).json({ message: "Completed." });
  } catch (err) {
    console.error(err);
    res.status(400).json("Error occurred somewhere");
  }
}

async function getNews(topic, country, language) {
  const kHeadline = await Topic(topic, { n: 5, language, country });
  const TOPIC = [];
  for (let i = 0; i < kHeadline.length; i++) {
    let headline = kHeadline[i];
    try {
      let kURL = headline.link;
      let response = await axios.get(kURL);
      let doc = new JSDOM(response.data, { url: kURL });

      kURL = doc.window.document.querySelector("a").href;
      response = await axios.get(kURL);
      doc = new JSDOM(response.data, { url: kURL });

      const document = doc.window.document;
      const read = new Readability(document);
      const content = read.parse();
      const imageURLs = [];

      const $ = cheerio.load(content.content);
      $("img").each(function (index, element) {
        const src = $(element).attr("src");
        imageURLs.push(src);
      });

      TOPIC.push({
        content: content.excerpt,
        imageUrl: imageURLs,
      });
    } catch (error) {}
  }
  return TOPIC;
}
async function PostFromDB() {
  const pages = ToPost.find();
  for (let i = 0; i < pages.length; i++) {
    let page = pages[i];
    let content = await getNews(page.content, "ng", "en");
    content = content.filter((e) => e);
    const post = content[2];
    if (content.length != 0 && post) {
      if (!Posts.findOne({ content: post.content })) {
        Posts.insert({ content: post.content });
        await fb.postToFacebook(
          page.cookie,
          page.token,
          page.id,
          post.content,
          post.imageUrl[0],
        );
      }
    }
  }
}
export async function postContent(req, res) {
  try {
    const pages = await Page.find({});
    const fb = new FacebookPost();
    for (let i = 0; i < pages.length; i++) {
      let page = pages[i];
      let content = await getNews(page.content, "ng", "en");
      content = content.filter((e) => e);
      const post = content[0];
      if (content.length != 0 && post) {
        if (!(await Post.findOne({ content: post.content }))) {
          await Post.create({ content: post.content });
          await fb.postToFacebook(
            page.pageCookie,
            page.pageToken,
            page.pageId,
            post.content,
            post.imageUrl[0],
          );
        }
      }
    }
  } catch (error) {}
}
