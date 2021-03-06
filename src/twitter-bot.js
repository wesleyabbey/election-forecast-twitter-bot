const https = require('https')
const Twitter = require('twitter')
const differenceInDays = require('date-fns/differenceInDays')

const MAX_CHARACTER_LIMIT = 280
const electionDay = new Date('2020-11-03T23:00:00')
const now = new Date()

const daysUntilElection = differenceInDays(electionDay, now)

const chancesIndicator = (bidenPercentage, trumpPercentage) => {
  const bidenBlock = '▓'
  const trumpBlock = '░'
  const totalBlocks = 16
  const bidenBlocks = bidenBlock.repeat(
    Math.floor(bidenPercentage * totalBlocks)
  )
  const trumpBlocks = trumpBlock.repeat(
    Math.floor(trumpPercentage * totalBlocks)
  )

  return bidenBlocks + trumpBlocks
}

const execute = async (event, context) => {
  let body = ''
  const electionForecasts2020 =
    'https://projects.fivethirtyeight.com/2020-general-data/presidential_national_toplines_2020.csv'

  const promise = new Promise(function (resolve, reject) {
    https
      .get(electionForecasts2020, (res) => {
        res.on('data', (d) => {
          body += d
        })

        res.on('end', async () => {
          const data = body.toString('utf8')
          const rows = data.split('\n')
          if (data.length <= 1) {
            console.error('[Error] No data.')
            return
          }
          const headers = rows[0].split(',')
          const dateIndex = headers.indexOf('modeldate')
          const bidenScoreIndex = headers.indexOf('ecwin_chal')
          const trumpScoreIndex = headers.indexOf('ecwin_inc')

          const todaysData = rows[1].split(',')
          const bidenPercentage = todaysData[bidenScoreIndex]
          const bidenScore = parseFloat(bidenPercentage * 100)
          const trumpPercentage = todaysData[trumpScoreIndex]
          const trumpScore = parseFloat(trumpPercentage * 100)
          let winnerMessage = ''

          const scoreDiff = Math.abs(bidenScore - trumpScore)

          if (scoreDiff <= 10) {
            winnerMessage = 'Its a toss-up.'
          } else {
            let favorabilityMessage = scoreDiff < 42 ? 'slightly ' : ''
            favorabilityMessage =
              scoreDiff > 80 ? 'heavily ' : favorabilityMessage
            let predictedWinner = bidenScore > trumpScore ? 'Biden' : 'Trump'
            winnerMessage = `${predictedWinner} is ${favorabilityMessage}favored to win.`
          }

          const date = todaysData[dateIndex]
          const status =
            `${date}\n` +
            `${winnerMessage}\n` +
            `Biden ${chancesIndicator(
              bidenPercentage,
              trumpPercentage
            )} Trump\n\n` +
            `Biden: ${bidenScore.toFixed(2)}%\n` +
            `Trump: ${trumpScore.toFixed(2)}%\n\n` +
            `${daysUntilElection} days until the election.\n` +
            `#2020Election #polls #Biden2020 #Trump2020`

          console.info(status)
          console.info('Status length: ', status.length)

          const client = new Twitter({
            consumer_key: process.env.TwitterForecastApiKey,
            consumer_secret: process.env.TwitterForecastApiSecretKey,
            access_token_key: process.env.TwitterForecastAccessToken,
            access_token_secret: process.env.TwitterForecastAccessTokenSecret,
          })

          const post = await client.post(
            'statuses/update',
            { status },
            (error, tweet, response) => {
              if (error) {
                console.error('Error', error)
                throw error
              }
              console.info('Posting tweet: ', tweet) // Tweet body.
              resolve(res.statusCode)
            }
          )
        })
      })
      .on('error', (e) => {
        reject(Error(e))
      })
  })

  return promise
}

exports.handler = execute
// execute() // testing
