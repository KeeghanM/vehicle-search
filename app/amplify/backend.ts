import { defineBackend } from '@aws-amplify/backend'
import { search } from './functions/search/resource'
import { data } from './data/resource'

defineBackend({
  data,
  search,
})
