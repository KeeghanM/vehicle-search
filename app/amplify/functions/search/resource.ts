import { defineFunction, secret } from '@aws-amplify/backend'

export const search = defineFunction({
  name: 'search',
  entry: './handler.ts',
  environment: {
    ASTRA_DB_APPLICATION_TOKEN: secret('ASTRA_DB_APPLICATION_TOKEN'),
    ASTRA_DB_API_ENDPOINT: process.env.ASTRA_DB_API_ENDPOINT ?? '',
  },
})
