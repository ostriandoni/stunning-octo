const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const Promise = require("bluebird");

const BASEURL = "https://www.cermati.com";

const fetchHtml = async (url) => {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch (e) {
    console.error(
      `ERROR: An error occurred while trying to fetch the URL: ${url}`
    );
  }
};

const scrapArticle = async () => {
  const html = await fetchHtml(`${BASEURL}/artikel`);
  const selector = cheerio.load(html);
  const elements = selector("body")
    .find(
      ".container.content > div > .col-lg-9.md-margin-bottom-40 > .list-of-articles > .article-list-item > a"
    )
    .toArray();
  const promises = [];

  for (const el of elements) {
    promises.push(await extractData(selector, el));
  }

  await Promise.all(promises);
  return promises;
};

const extractData = async (selector, element) => {
  const elementSelector = selector(element);
  const link = await getLink(elementSelector);
  const url = `${BASEURL}${link}`;
  const article = await fetchHtml(url);
  const articleSelector = cheerio.load(article);
  const relatedArticles = await getSidebar(articleSelector);
  const result = {
    url,
    title: await getTitle(articleSelector),
    author: await getAuthor(articleSelector),
    postingDate: await getPostingDate(articleSelector),
    relatedArticles,
  };
  return result;
};

const getLink = async (selector) => {
  return selector.attr("href").trim();
};

const getTitle = async (selector) => {
  return selector("body")
    .find(
      ".container.content > div > .col-lg-9.md-margin-bottom-40 > section > h1"
    )
    .text()
    .trim();
};

const getAuthor = async (selector) => {
  return selector("body")
    .find(
      ".container.content > div > .col-lg-9.md-margin-bottom-40 > section > .post-info > .post-author > .author-name"
    )
    .text()
    .trim();
};

const getPostingDate = async (selector) => {
  return selector("body")
    .find(
      ".container.content > div > .col-lg-9.md-margin-bottom-40 > section > .post-info > .post-date"
    )
    .text()
    .trim();
};

const getSidebar = async (selector) => {
  const panelItems = selector("body")
    .find(
      ".container.content > div > div.col-lg-3 > div:nth-child(3) > div > ul > li > a"
    )
    .toArray();
  const result = [];

  for (const item of panelItems) {
    result.push({
      url: `${BASEURL}${selector(item).attr("href").trim()}`,
      title: `${selector(item).find("h5").text().trim()}`,
    });
  }

  return result;
};

scrapArticle()
  .then((result) => {
    const output = JSON.stringify({ articles: result }, null, 2);
    fs.writeFile("solution.json", output, "utf8", function (err) {
      if (err) throw err;
      console.log("consider it done");
    });
  })
  .catch((err) => {
    console.error(err);
  });
