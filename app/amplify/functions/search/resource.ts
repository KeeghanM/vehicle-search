import { defineFunction } from '@aws-amplify/backend'

export const search = defineFunction({
  name: 'search',
  entry: './handler.ts',
})
