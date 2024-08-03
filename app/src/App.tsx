import { useState } from 'react'
import type { Schema } from '../amplify/data/resource'
import { generateClient } from 'aws-amplify/data'
import type { Vehicle } from '../amplify/functions/search/handler'
import { SearchField } from '@aws-amplify/ui-react'

const client = generateClient<Schema>()

function App() {
  const [searchString, setSearchString] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Vehicle[]>([])

  const handleSearch = async () => {
    if (searchString.length <= 10) return

    const result = await client.queries.search({
      searchString,
    })
    console.log(result.data)
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
    </main>
  )
}

export default App
