import { useState } from 'react'
import type { Schema } from '../amplify/data/resource'
import { generateClient } from 'aws-amplify/data'
import type { Vehicle } from '../amplify/functions/search/handler'
import { SearchField } from '@aws-amplify/ui-react'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
Amplify.configure(outputs)

function App() {
  const client = generateClient<Schema>({
    authMode: 'apiKey',
  })
  const [searchString, setSearchString] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Vehicle[]>([])
  const [searching, setSearching] = useState<boolean>(false)

  const handleSearch = async () => {
    if (searchString.length <= 10) return

    try {
      setSearching(true)
      const result = await client.queries.search({
        searchString,
      })
      const cleanData = result.data
        ?.filter((vehicle) => vehicle !== null && vehicle !== undefined)
        .map((vehicle) => ({
          id: vehicle?.id,
          makeModel: vehicle.makeModel,
          variant: vehicle.variant,
          price: vehicle.price,
          miles: vehicle.miles,
        }))
      setSearchResults(cleanData ?? [])
    } catch (error) {
      console.error(error)
    } finally {
      setSearching(false)
    }
  }

  return (
    <main>
      <SearchField
        label="Search"
        value={searchString}
        onChange={(e) => setSearchString(e.target.value)}
        onSubmit={handleSearch}
        onClear={() => setSearchString('')}
      />
      {searching && <p>Searching...</p>}
      <ul>
        {searchResults.map((vehicle) => (
          <li key={vehicle.id}>
            <h3>{vehicle.makeModel}</h3>
            <h4>{vehicle.variant}</h4>
            <p>Price: {vehicle.price}</p>
            <p>Miles: {vehicle.miles}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App
