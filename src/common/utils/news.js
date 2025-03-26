import Parser from 'rss-parser';

const parser = new Parser();

export async function scrapeGoogleNewsRSS(topic = "technology", country = "US", language = "en") {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=${language}&gl=${country}&ceid=${country}:${language}`;

    try {
        const feed = await parser.parseURL(url);

        const articles = feed.items.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            source: item.creator || "Unknown",
        }));
  return articles;
    } catch (error) {
        console.error("Error fetching Google News RSS:", error);
    }
}