import puppeteer from 'puppeteer'
import type { Page } from 'puppeteer'

let pageCounter = 0
let maxPages = 2 // low for testing, set to infinity for production

type Vehicle = {
  id: number
  makeModel: string
  variant: string
  price: number
  miles: number
  managersComment: string
  specs: {
    title: string
    values: string[]
  }
  features: string[]
  performance: string
}

async function runScraping() {
  console.log('Starting scraping')
  // Launch a new browser and open a new page
  const browser = await puppeteer.launch({
    headless: false,
  })
  const page = await browser.newPage()

  // Load up the Used Cars page, then collect all the search
  // results from ALL pages into one list of URL's
  console.log('Loading page')
  await page.goto('https://www.bristolstreet.co.uk/used-cars/')
  console.log('Accepting cookies')
  await page.locator('button[data-cookiefirst-action="accept"]').click()

  // Fetch all the links from the search results, and remove any duplicates
  const vehicleLinks = [...Array.from(new Set(await fetchAllLinks(page, [])))]
  console.log(`Found ${vehicleLinks.length} links`)

  //   vehicleLinks.forEach(async (link) => {
  //     await page.goto(link)
  //   })

  // Finally, close everything down
  await browser.close()
}

async function fetchAllLinks(page: Page, links: string[]): Promise<string[]> {
  pageCounter++
  if (pageCounter > maxPages) return links

  // Some logging to show progress
  console.log(`Scraping page ${pageCounter}`)
  console.log(`Found ${links.length} links so far`)
  console.log('---')

  // The search results are loaded in after initial page load
  // so wait to ensure we have at least one result
  await page.waitForSelector('app-vehicle-detail')

  // Get all the vehicle links in an array, and add them
  // to the existing Links array
  const newLinks = await page.$$eval(
    '.row h4 > a:not(.body-link--underline)',
    (elems) => {
      return elems.map((el) => {
        return el.href
      })
    }
  )
  links.push(...newLinks)

  // The next page button is part of the "app" so it doesn't trigger a new page load, instead
  // we need to check for the network to be idle - this indicates the new vehicles have loaded
  // If there is no next page button, we have reached the end of the search results
  const nextPageButton = await page.$('a.pagination__item--next')
  if (nextPageButton !== null) {
    try {
      await Promise.all([
        await nextPageButton.click(),
        await page.waitForNetworkIdle({
          timeout: 5000,
        }),
      ])
    } catch (e) {
      // If there is an error, log it and return the links we have so far
      console.log('Error:', e)
      return links
    }
    return fetchAllLinks(page, links)
  }
  return links
}

runScraping()
