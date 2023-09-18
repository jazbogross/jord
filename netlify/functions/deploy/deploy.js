const fetch = require('node-fetch')
import { schedule } from '@netlify/functions'

// This is sample build hook
const BUILD_HOOK = process.env.DEPLOY_HOOK;


const handler = schedule('15 12 18 * *', async () => {
    await fetch(BUILD_HOOK, {
      method: 'POST'
    }).then(response => {
      console.log('Build hook response:', response)
    })
  
    return {
      statusCode: 200
    }
  })
  
  export { handler }