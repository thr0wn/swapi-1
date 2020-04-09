const Koa = require('koa')
const json = require('koa-json')
const { print, chalk: { yellow } } = require('@ianwalter/print')
const Router = require('koa-router')
const pkg = require('./package.json')

// Import the JSON data copied from http://github.com/phalt/swapi.
const people = require('./data/people.json')
const starships = require('./data/starships.json')
const planets = require('./data/planets.json')
const species = require('./data/species.json')
const vehicles = require('./data/vehicles.json')
const films = require('./data/films.json')

// Create the Koa app instance.
const app = new Koa()

// Add error-handling middleware.
app.use(async function errorHandlingMiddleware (ctx, next) {
  try {
    await next()
  } catch (err) {
    print.error(err)
    ctx.status = err.statusCode || err.status || 500
  }
})

// Use middleware that automatically pretty-prints JSON responses.
app.use(json())

// Add the Access-Control-Allow-Origin header that accepts all requests to the
// response.
app.use(async function disableCorsMiddleware (ctx, next) {
  ctx.set('Access-Control-Allow-Origin', '*')
  return next()
})

// Create the router instance.
const specifiedPort = process.env.SWAPI_PORT
const router = new Router()

// Add a root route that provides information about the service.
router.get('/', ctx => {
  ctx.body = {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version
  }
})

// Add a route handler that returns 10 people per page.
router.get('/api/people', (ctx) => {
  const page = ctx.query.page || 1
  const peopleSlice = people.slice((page - 1) * 10, page * 10)
    .map(p => ({ pk: p.pk, ...p.fields }))
    .map(p => {
      p.starships = starships
        .filter(s => s.fields.pilots.some(pilotPk => pilotPk === p.pk))
        .map(s => s.fields)
      p.vehicles = vehicles
        .filter(v => v.fields.pilots.some(pilotPk => pilotPk === p.pk))
        .map(s => s.fields)
      p.homeworldDetails = planets.find(planet => planet.pk === p.homeworld).fields
      p.specieDetails = (species
        .find(s => s.fields.people.some(charPk => charPk === p.pk)) || {}).fields
      p.films = films
        .filter(s => s.fields.characters.some(charPk => charPk === p.pk))
        .map(s => s.fields)
      return p
    })

  ctx.body = {
    count: people.length,
    results: peopleSlice
  }
})

// Add a 404 Not Found handler that is executed when no routes match.
// function notFoundHandler (ctx) {
//   ctx.status = 404
// }

// Handle the request by allowing the router to route it to a handler.
app.use(router.routes())

// Start listening on the specified (or randomized) port.
const server = app.listen(specifiedPort)
const { port } = server.address()
print.log('💫', yellow(`Let the force be with you: http://localhost:${port}`))

module.exports = server
