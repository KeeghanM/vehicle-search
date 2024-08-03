import fs from 'fs'
import { stringify } from 'csv-stringify'
import puppeteer from 'puppeteer'
import type { Page } from 'puppeteer'

let pageCounter = 0
const maxPages = 8 //4 // low for testing, set to infinity for production
const maxVehicles = 1000 // low for testing, set to infinity for production

type Vehicle = {
  id: number
  makeModel: string
  variant: string
  price: number
  miles: number
  managersComment: string
  summaryItems: {
    title: string
    value: string
  }[]
  specs: {
    title: string
    values: string[]
  }[]
  features: string[]
  performance: string[]
}

async function runScraping() {
  console.log('Starting scraping')
  // Launch a new browser and open a new page
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--disable-features=site-per-process'], // this prevents the browser from crashing, not sure why
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

  // Loop through each vehicle link, and get the details
  const vehicles: Vehicle[] = []
  let vehicleCounter = 0
  for (const link of vehicleLinks) {
    vehicleCounter++
    if (vehicleCounter > maxVehicles) break
    console.log(`Scraping vehicle ${vehicleCounter} of ${vehicleLinks.length}`)
    await page.goto(link)
    const vehicle = await getVehicleDetails(page)
    vehicles.push(vehicle)
    // TODO: Write the vehicles to the file as we go, rather than all at once at the end
    // should help with memory usage when run on 10k+ vehicles
  }

  // Convert the vehicles into a CSV where property names are used as the headers,
  // and arrays/JSON objects are converted to strings
  stringify(vehicles, { header: true }, (err, output) => {
    if (err) throw err
    fs.writeFileSync('vehicles.csv', output)
    console.log('CSV file written')
  })

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

async function getVehicleDetails(page: Page): Promise<Vehicle> {
  const vehicle: Vehicle = {
    id: 0,
    makeModel: '',
    variant: '',
    price: 0,
    miles: 0,
    managersComment: '',
    summaryItems: [],
    specs: [],
    features: [],
    performance: [],
  }

  // Get the vehicle ID from the URL
  try {
    const url = page.url().replace('https://www.bristolstreet.co.uk/', '')
    vehicle.id = parseInt(url.split('/')[1]) // /used-cars/12345/audi-a3 -> 12345
  } catch (e) {
    vehicle.id = 0
  }

  console.log(`Vehicle ID: ${vehicle.id}`)

  // Get the vehicle make and model
  try {
    const makeModel = await page.$eval('h1', (el) => el.innerText)
    if (!makeModel) throw new Error('Could not find make and model')
    vehicle.makeModel = makeModel
  } catch (e) {
    vehicle.makeModel = ''
  }

  // Get the vehicle variant
  try {
    const variant = await page.$eval(
      '.vehicle-detail__heading h3',
      (el) => el.innerText
    )
    if (!variant) throw new Error('Could not find variant')
    vehicle.variant = variant
  } catch (e) {
    vehicle.variant = ''
  }

  // Get the vehicle price
  try {
    const price = await page.$eval('span.price', (el) => el.innerText)
    if (!price) throw new Error('Could not find price')
    vehicle.price = parseInt(price.replace('£', '').replace(',', ''))
  } catch (e) {
    vehicle.price = 0
  }

  // Get the vehicle miles
  try {
    const miles = await page.$eval('span.js-mileage', (el) => el.innerText)
    if (!miles) throw new Error('Could not find miles')
    vehicle.miles = parseInt(miles.replace(',', ''))
  } catch (e) {
    vehicle.miles = 0
  }

  // Get the managers comment
  try {
    const comment = await page.$eval('p.comment__quote', (el) => el.innerText)
    if (!comment) throw new Error('Could not find comment')
    vehicle.managersComment = comment
  } catch (e) {
    vehicle.managersComment = ''
  }

  // Get the vehicle specs
  // This is all the "accordians" on the page
  try {
    const specs = await page.$$eval('.accordion', (accordians) => {
      return accordians.map((accordian) => {
        const title = accordian.querySelector('h4')?.innerText ?? ''
        const values = Array.from(accordian.querySelectorAll('li')).map(
          (li) => li.innerText
        )
        return { title, values }
      })
    })
    vehicle.specs = specs
  } catch (e) {
    vehicle.specs = []
  }

  // Get Features & performance all in one go
  // They're two tables, both with the selector tbody.feature-table__table-body
  // The first table is the features, the second is the performance
  try {
    const [features, performance] = await page.$$eval(
      'tbody.feature-table__table-body',
      (tables) => {
        return tables.map((table) => {
          return Array.from(table.querySelectorAll('tr')).map((row) => {
            return row.innerText ?? row.textContent
          })
        })
      }
    )
    vehicle.features = features
    vehicle.performance = performance //TODO: This is not working for some reason
  } catch (e) {
    vehicle.features = []
    vehicle.performance = []
  }

  // Get the "summary items" which are a bunch of content cards
  // at the top of the page
  try {
    const summaryItems = await page.$$eval(
      '.summary-card__content',
      (items) => {
        return items.map((item) => {
          const title =
            item.querySelector('.summary-card__title')?.textContent ?? '' // TODO: Only need the first line, split on /n to remove unwanted text
          const value =
            item.querySelector('.summary-card__value')?.textContent ?? ''
          return { title, value }
        })
      }
    )
    vehicle.summaryItems = summaryItems
  } catch (e) {
    vehicle.summaryItems = []
  }

  return vehicle
}

runScraping()
