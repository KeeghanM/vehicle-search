import { defineBackend } from '@aws-amplify/backend'
import { search } from './functions/search/resource'

defineBackend({
  search,
})
