const fetch = require('node-fetch')


// This is sample build hook
const BUILD_HOOK = process.env.DEPLOY_HOOK;


exports.handler = async (event, context) => {
    await fetch(BUILD_HOOK, {
      method: 'POST'
    }).then(response => {
      console.log('Build hook response:', response)
    })
  
    return {
      statusCode: 200
    }
  }
  
