'use strict';
const axios = require('axios');

module.exports.hello = async (event) => {
  const resp = await axios.get('https://randomuser.me/api/');
  return {
    statusCode: 200,
    body: JSON.stringify(
        {
          message: 'Function executed successfully',
          randomUser: resp.data,
        },
        null,
        2,
    ),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
