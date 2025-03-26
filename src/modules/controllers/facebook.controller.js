import { Post, Page } from "../schemas/post.schema.js";
import { User } from "../schemas/user.schema.js";
import AppError from "../../common/utils/appError.js";
import { catchAsync } from "../../common/utils/errorHandler.js";
import { topic as Topic } from "./news.js";
import Session from "./session.js";
import { FacebookPost } from "./facebook.js";
import axios from "axios";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import fs from 'fs'
export async function validatePage(req, res) {
  const { token, accountId } = req.body;
  const Facebook = new FacebookPost(token, accountId);
  let response = Facebook.validatePage();
  res.json(response);
}
export async function saveDetails(req, res) {
  try {
    const { pageToken : pageToken,pageId: userId,contentType } = req.body;
    const Facebook = new FacebookPost(pageToken, userId);
    let response = await Facebook.validatePage();
    if(!response.error){
      await Page.create({
        pageName: response.name,
        pageToken: pageToken,
        pageId: response.id,
        contentType: contentType ? contentType : 'entertainment',
        ownerId: req.userId
      });
      return res.status(200).json({ pageToken, pageId:  response.id})
    } else {
      console.log(response.error)
      return res.status(400).json('Invalid page token or id')
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.log(err);
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
      console.log(response.data);
      fs.writeFileSync('doc.html', response.data)
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
    } catch (error) {
      console.log(error);
    }
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

      if (page.contentType) {
        const user = await User.findOne({ _id: page.ownerId });
        let content = await getNews(
          page.contentType,
          user.countryCode || "ng",
          "en",
        );

        content = content.filter((e) => e);
        const post = content[0];

        if (content.length != 0 && post) {
          if (!(await Post.findOne({ content: post.content }))) {
            await Post.create({ content: post.content });
            await fb.postToFacebook(
              page.pageToken,
              page.pageId,
              post.content,
              post.imageUrl[0],
            );
          }
        }
      } else {
      }
    }
    return res.status(200).json("done");
  } catch (error) {
    console.error(error);
  }
}
export async function getPages(req, res) {
  try {
    const pages = await Page.find({ ownerId: req.userId });
    if (pages.length == 0) {
      return res.status(200).json([]);
    } else {
      return res
        .status(200)
        .json(
          pages.map((page) => ({
            pageName: page.pageName,
            pageId: page.pageId,
            pageType: !!page.contentType,
            pageToken: page.pageToken
          })),
        );
    }
  } catch (err) {
    console.error(err);
    res.status(400).json("Error occurred somewhere ");
  }
}
export async function getSavedPages(req, res) {
  try {
    let pages = await Page.find({ ownerId: req.userId });
   // pages = pages.filter((e) => e.contentType);
    if (pages.length == 0) {
      return res.status(200).json([]);
    } else {
      return res
        .status(200)
        .json(
          pages.map((page) => ({
            pageName: page.pageName,
            pageId: page.pageId,
          })),
        );
    }
  } catch (err) {
    console.error(err);
    res.status(400).json("Error occurred somewhere ");
  }
}
