import puppeteer from "puppeteer"

async function runScraping() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto("https://www.bristolstreet.co.uk/used-cars/")

  // The search results are loaded in after initial page load
  // so wait to ensure we have at least one result
  await page.waitForSelector("app-vehicle-detail")

  // Get all the vehicle links in an array
  const links = await page.$$eval(
    ".row h4 > a:not(.body-link--underline)",
    (elems) => {
      return elems.map((el) => {
        return el.href
      })
    }
  )
  links.forEach(async (link) => {
    await page.goto(link)
  })

  // Finally, close everything down
  await browser.close()
}

runScraping()
