import { DataAPIClient } from '@datastax/astra-db-ts'
import { Schema } from '../../data/resource'

export type Vehicle = {
  id: string
  makeModel: string
  variant: string
  price: number
  miles: number
}

export const handler: Schema['search']['functionHandler'] = async (event) => {
  if (!process.env.ASTRA_DB_APPLICATION_TOKEN) {
    throw new Error('Missing Astra DB Token')
  }
  if (!process.env.ASTRA_DB_API_ENDPOINT) {
    throw new Error('Missing Astra DB API Endpoint')
  }

  const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN)
  const db = client.db(process.env.ASTRA_DB_API_ENDPOINT)

  const { searchString } = event.arguments

  if (!searchString || searchString.length <= 10) {
    throw new Error('Missing search string')
  }

  const cursor = await db.collection('vehicle-search').find(
    {},
    {
      sort: { $vectorize: searchString },
      limit: 10, // TODO: pagination
      includeSimilarity: true,
    }
  )

  const vehicles = await cursor.toArray()

  return vehicles.map((vehicle) => ({
    id: vehicle.id,
    makeModel: vehicle.makeModel,
    variant: vehicle.variant,
    price: vehicle.price,
    miles: vehicle.miles,
  }))
}
