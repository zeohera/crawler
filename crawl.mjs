import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import { URL } from 'url';
import PQueue from 'p-queue';
import * as puppeteer from 'puppeteer';


const BASE_DOMAIN = 'trendingcustom.com/products/animated-family-sitting-on-crossword-puzzle-board-psnl-2layer-wooden-ornament-1015945?ref=flash-sale&variant=46985879355634'; // Change to the target domain
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

// Save visited data to JSON
// async function saveVisitedData() {
//     await fs.writeJson(VISITED_FILE, {
//         urls: Array.from(visitedUrls),
//         images: Array.from(visitedImages),
//     });
// }

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

// Crawl a single page using Puppeteer

// Controller function to manage crawling
async function startCrawl(startUrl) {
    const startTime = Date.now(); // Record the start time
    const urlQueue = [startUrl]; // Initialize the queue with the starting URL
    // visitedUrls.add(startUrl); // Mark the starting URL as visited

    const browser = await puppeteer.launch();
    const BASE_DOMAIN = 'example.com'; // Change to the target domain
    const MAX_CRAWL_DURATION = 10 * 60 * 1000; // Set crawling duration to 10 minutes
    const VISITED_FILE = 'visitedData.json'; // JSON file for visited links and images/ JSON file for visited links and images
    
    // Load visited data if it exists
    let visitedData = { urls: [], images: [] };
    if (fs.existsSync(VISITED_FILE)) {
        visitedData = fs.readJsonSync(VISITED_FILE);
    }
    
    const visitedUrls = new Set(visitedData.urls);
    const visitedImages = new Set(visitedData.images);
    const queue = new PQueue({ concurrency: 5 }); // Limit to 5 concurrent requests
    
    // Save visited data to JSON
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
    
    // Crawl a single page using Puppeteer
    async function crawlPage(pageUrl, browser) {
        try {
            const page = await browser.newPage();
            await page.goto(pageUrl, { waitUntil: 'networkidle2' });
    
            // Extract images
            const images = await page.$$eval('img', imgs =>
                imgs.map(img => img.src).filter(src => src)
            );
    
            for (let imgUrl of images) {
                if (!visitedImages.has(imgUrl) && isValidImage(imgUrl)) {
                    visitedImages.add(imgUrl);
                }
            }
    
            // Extract links to other pages
            const newLinks = await page.$$eval('a', links =>
                links.map(link => link.href).filter(href => href)
            );
    
            await page.close();
            return newLinks.filter(link => isSameDomain(link) && !visitedUrls.has(link));
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
    
        const browser = await puppeteer.launch();
    
        const processQueue = async () => {
            while (urlQueue.length > 0 && (Date.now() - startTime) < MAX_CRAWL_DURATION) {
                const currentUrl = urlQueue.shift(); // Get the next URL from the queue
    
                await queue.add(async () => {
                    const newLinks = await crawlPage(currentUrl, browser); // Crawl the current URL
                    urlQueue.push(...newLinks); // Add new links to the queue
                });
    
                // Wait for the queue to finish processing before continuing
                await queue.onIdle();
            }
    
            // Save visited data at the end of the crawl
            await saveVisitedData();
            console.log('Crawling completed or time limit reached.');
            await browser.close();
        };
    
        // Start the crawling process
        await processQueue();
    }
    
    // Start crawling from the base URL
    startCrawl(`https://${BASE_DOMAIN}`);

    const processQueue = async () => {
        while (urlQueue.length > 0 && (Date.now() - startTime) < MAX_CRAWL_DURATION) {
            const currentUrl = urlQueue.shift(); // Get the next URL from the queue

            await queue.add(async () => {
                const newLinks = await crawlPage(currentUrl, browser); // Crawl the current URL
                urlQueue.push(...newLinks); // Add new links to the queue
            });

            // Wait for the queue to finish processing before continuing
            await queue.onIdle();
        }

        // Save visited data at the end of the crawl
        await saveVisitedData();
        console.log('Crawling completed or time limit reached.');
        await browser.close();
    };

    // Start the crawling process
    await processQueue();
}

// Start crawling from the base URL
startCrawl(`https://${BASE_DOMAIN}`);