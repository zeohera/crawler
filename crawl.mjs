import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import { URL } from 'url';
import PQueue from 'p-queue';

// Configuration
const BASE_DOMAIN = 'trendingcustom.com/products/grandkids-crossword-puzzle-art-psnl-2layer-wooden-ornament-christmas-gift-for-grandma-gift-for-mom-0921703?ref=flash-sale&variant=46890139779314'; // Change to the target domain
const MAX_CRAWL_DURATION = 10 * 60 * 1000; // Set crawling duration to 10 minutes
const VISITED_FILE = 'visitedData.json'; // JSON file for visited links and images

// Load visited data if it exists
let visitedData = { urls: [], images: [] };
if (fs.existsSync(VISITED_FILE)) {
    visitedData = fs.readJsonSync(VISITED_FILE);
}

const visitedUrls = new Set(visitedData.urls);
const visitedImages = new Set(visitedData.images);
const queue = new PQueue({ concurrency: 5 }); // Limit to 5 concurrent requests

// Function to save visited data to JSON
async function saveVisitedData() {
    await fs.writeJson(VISITED_FILE, {
        urls: Array.from(visitedUrls),
        images: Array.from(visitedImages),
    });
}

// Check if a URL belongs to the same domain
function isSameDomain(link) {
    const parsedUrl = new URL(link);
    return parsedUrl.hostname === BASE_DOMAIN;
}

// Check if an image is valid (not too small and not an asset)
function isValidImage(imgUrl) {
    const isAsset = imgUrl.includes('/assets/') || imgUrl.includes('/icons/');
    return !isAsset; // Exclude asset links
}

// Crawl a single page
async function crawlPage(pageUrl) {
    try {
        const { data } = await axios.get(pageUrl);
        const $ = cheerio.load(data);

        // Extract and save images
        $('img').each((_, el) => {
            let imgUrl = $(el).attr('src');
            if (imgUrl) {
                imgUrl = new URL(imgUrl, pageUrl).href; // Resolve relative URLs
                if (!visitedImages.has(imgUrl) && isValidImage(imgUrl)) {
                    visitedImages.add(imgUrl);
                }
            }
        });

        // Extract and save links
        const newLinks = [];
        $('a').each((_, el) => {
            let link = $(el).attr('href');
            if (link) {
                link = new URL(link, pageUrl).href; // Resolve relative URLs
                if (isSameDomain(link) && !visitedUrls.has(link)) {
                    visitedUrls.add(link);
                    newLinks.push(link);
                }
            }
        });

        return newLinks; // Return new links to crawl
    } catch (error) {
        console.error(`Failed to crawl ${pageUrl}: ${error.message}`);
        return [];
    }
}

// Controller function to manage crawling
async function startCrawl(startUrl) {
    const startTime = Date.now(); // Record the start time
    const urlQueue = [startUrl]; // Initialize the queue with the starting URL
    visitedUrls.add(startUrl); // Mark the starting URL as visited

    const processQueue = async () => {
        while (urlQueue.length > 0 && (Date.now() - startTime) < MAX_CRAWL_DURATION) {
            const currentUrl = urlQueue.shift(); // Get the next URL from the queue

            await queue.add(async () => {
                const newLinks = await crawlPage(currentUrl); // Crawl the current URL
                urlQueue.push(...newLinks); // Add new links to the queue
            });

            // Wait for the queue to finish processing before continuing
            await queue.onIdle();
        }

        // Save visited data at the end of the crawl
        await saveVisitedData();
        console.log('Crawling completed or time limit reached.');
    };

    // Start the crawling process
    await processQueue();
}

// Start crawling from the base URL
startCrawl(`https://${BASE_DOMAIN}`);