import type { Handler } from 'aws-lambda'

export type Vehicle = {
  id: string
  makeModel: string
  variant: string
  price: number
  miles: number
}

export const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify([
      {
        id: '1',
        makeModel: 'Ford Focus',
        variant: '1.6 Zetec',
        price: 2000,
        miles: 100000,
      },
      {
        id: '2',
        makeModel: 'Ford Focus',
        variant: '1.8 TDCi',
        price: 2500,
        miles: 120000,
      },
      {
        id: '3',
        makeModel: 'Ford Focus',
        variant: '2.0 ST',
        price: 3000,
        miles: 80000,
      },
    ] as Vehicle[]),
  }
}
