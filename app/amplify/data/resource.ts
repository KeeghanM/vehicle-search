import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { search } from '../functions/search/resource'

const schema = a.schema({
  search: a
    .query()
    .arguments({
      searchString: a.string().required(),
    })
    .returns([
      {
        id: a.string().required(),
        makeModel: a.string().required(),
        variant: a.string().required(),
        price: a.integer().required(),
        miles: a.integer().required(),
      },
    ])
    .handler(a.handler.function(search)),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'iam',
  },
})
