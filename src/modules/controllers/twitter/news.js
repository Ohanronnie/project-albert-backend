import axios from 'axios';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const NEWS_API_KEY = 'd709f77921d940d69e356c013d24945e';
const GEMINI_API_KEY = 'AIzaSyDx0sg4m6AVd4kTMtJOIRO_RebCBCTMqeQ'         ;
const BASE_URL = 'https://newsapi.org/v2/top-headlines';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const STORE_FILE = 'processed.json';

// Load processed topics from file
const loadProcessedTopics = () => {
    if (!fs.existsSync(STORE_FILE)) return {};
    return JSON.parse(fs.readFileSync(STORE_FILE));
};

// Save processed topics to file
const saveProcessedTopics = (data) => {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
};

// Check if an article has already been processed
const isAlreadyProcessed = (topic, url) => {
    const processedStore = loadProcessedTopics();
    return processedStore[topic]?.includes(url);
};

// Mark an article as processed
const markAsProcessed = (topic, url) => {
    const processedStore = loadProcessedTopics();
    if (!processedStore[topic]) processedStore[topic] = [];
    processedStore[topic].push(url);
    saveProcessedTopics(processedStore);
};

// Main function
export const fetchRecentNews = async (topic = 'technology', language = 'en', country = 'us') => {
    try {
        const { data } = await axios.get(BASE_URL, {
            params: { category: topic, language, country, apiKey: NEWS_API_KEY }
        });

        if (data.status !== 'ok' || data.articles.length === 0) return null;

        const latestArticle = data.articles
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];

            console.log(latestArticle)
        if (!latestArticle || isAlreadyProcessed(topic, latestArticle.url)) {
          console.log(latestArticle)
            console.log('No new articles.');
            return null;
        }

        markAsProcessed(topic, latestArticle.url);

        const { excerpt, imageUrl } = await extractContent(latestArticle.url);
        if (!excerpt) return null;
console.log(latestArticle)
        const summary = await generateGeminiSummary(excerpt);
        if (!summary) return null;

        return { topic, summary, image: latestArticle.urlToImage };
    } catch (error) {
        console.error('❌ Error:', error || error.message);
        return null;
    }
};

const extractContent = async (url) => {
    try {
        const { data } = await axios.get(url);
        const dom = new JSDOM(data);
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (!article) return { excerpt: null, imageUrl: null };

        return { excerpt: article.excerpt, imageUrl: findLargestOrFirstImage(dom) };
    } catch (error) {
        console.error('❌ Error extracting article:', error.response?.data || error.message);
        return { excerpt: null, imageUrl: null };
    }
};

const findLargestOrFirstImage = (dom) => {
    const images = Array.from(dom.window.document.querySelectorAll('img'));
    if (images.length === 0) return null;

    let largestImage = null;
    let maxArea = 0;

    for (const img of images) {
        const width = img.width || parseInt(img.getAttribute('width')) || 0;
        const height = img.height || parseInt(img.getAttribute('height')) || 0;
        const area = width * height;
        if (area > maxArea) {
            maxArea = area;
            largestImage = img.src;
        }
    }

    return largestImage || images[0]?.src || null;
};

const generateGeminiSummary = async (excerpt) => {
    try {
        const response = await axios.post(
            GEMINI_URL,
            { contents: [{ parts: [{ text: `Summarize this for a tweet: "${excerpt}"` }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
        console.error('❌ Error generating AI summary:', error.response?.data || error.message);
        return null;
    }
};
