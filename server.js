const express = require('express')
const Upload = require('s3-uploader');

const app = express()
const bodyParser = require('body-parser')
const fs = require('fs')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

const environment = process.env.NODE_ENV || 'development';
const configuration = require('./knexfile')[environment];
const database = require('knex')(configuration);


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))
app.use(function(request, response, next) {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var client = new Upload('adoptfund', {
  aws: {
    path: 'images/',
    region: 'us-east-1',
    acl: 'public-read'
  },

  cleanup: {
    versions: true,
    original: false
  },

  original: {
    awsImageAcl: 'private'
  },

  versions: [{
    maxHeight: 1040,
    maxWidth: 1040,
    format: 'jpg',
    suffix: '-large',
    quality: 80,
    awsImageExpires: 31536000,
    awsImageMaxAge: 31536000
  }]
});

client.upload('/some/image.jpg', {}, function(err, versions, meta) {
  if (err) { throw err; }

  versions.forEach(function(image) {
    console.log(image.width, image.height, image.url);
    // 1024 760 https://my-bucket.s3.amazonaws.com/path/110ec58a-a0f2-4ac4-8393-c866d813b8d1.jpg
  });
});

app.set('port', process.env.PORT || 3000)

app.get('/api/v1/users', (request, response) => {
  database('users').select()
  .then((users) => {
    response.status(200).json(users)
  })
  .catch((error) => {
    response.status(404).json({'Response 404': 'Not Found'})
  })
})

app.get('/api/v1/comments/:familyId', (request, response) => {
  const {familyId} = request.params

  database('comments').where('familyId', familyId).select()
  .then((comments) => {
    response.status(200).json(comments)
  })
  .catch((error) => {
    response.status(404).json({'Response 404': 'Not Found'})
  })
})

// this gets the NUMBER of families requested back
app.get('/api/v1/family/all', (request, response) => {
  database('family').select()
  .then((comments) => {
    response.status(200).json(comments)
  })
  .catch((error) => {
    response.status(404).json({'Response 404': 'Not Found'})
  })
})


app.get('/api/v1/family/:familyName', (request, response) => {
  const {familyName} = request.params

  database('family').where('name', familyName).select()
  .then((family) => {
    response.status(200).json(family)
  })
  .catch((error) => {
    response.status(404).json({'Response 404': 'Not Found'})
  })
})

app.get('/api/v1/donation/:familyId', (request, response) => {
  const {familyId} = request.params

  database('donation').where('familyId', familyId).select()
  .then((donations) => {
    response.status(200).json(donations)
  })
  .catch((error) => {
    response.status(404).json({'Response 404': 'Not Found'})
  })
})

//QUERY PARAM ?userId=5
app.get('/api/v1/family', (request, response) => {
  const { limit } = request.query
  database('family').limit(limit).select()
  .then((family) => {
    response.status(200).json(family)
  })
  .catch((error) => {
    response.status(404).json({'Response 404': 'Not Found'})
  })
})

app.post('/api/v1/users', (request, response) => {
  const { email, password, firstName, lastName } = request.body
  const user = { email, password, firstName, lastName }

  database('users').insert(user)
  .then(function() {
    database('users').where('email', email).select()
      .then(function(user) {
        response.status(201).json(user)
      })
      .catch(function(error) {
        response.status(422).json({'Response 422': 'Unprocessable Entity'})
      });
  })
})

app.post('/api/v1/comments', (request, response) => {
  const { body, familyId, userId } = request.body
  const comment = { body, familyId, userId }
  database('comments').insert(comment)
  .then(function() {
    database('comments').where('familyId', familyId).select()
      .then(function(comments) {
        response.status(201).json(comments)
      })
      .catch(function(error) {
        response.status(422).json({'Response 422': 'Unprocessable Entity'})
      });
  })
})

app.post('/api/v1/family', (request, response) => {
  const {
    expiration,
    location,
    name,
    title,
    story,
    links,
    image,
    cost,
    userId
  } = request.body

  const family = {
    expiration,
    location,
    name,
    title,
    story,
    links,
    image,
    cost,
    userId
  }
  database('family').insert(family)
  .returning('id')
  .then((id) => {
    const firstId = id[0]
    database('family').where('id', firstId).select()
      .then(function(family) {
        response.status(201).json(family)
      })
      .catch(function(error) {
        response.status(422).json({'Response 422': 'Unprocessable Entity'})
      });
  })
})

app.post('/api/v1/donation', (request, response) => {
  const {
    donationAmount,
    userId,
    familyId
  } = request.body

  const donation = {
    donationAmount,
    userId,
    familyId
  }
  database('donation').insert(donation)
  .then(()=> {
    database('donation').where('familyId', familyId).select()
    .then(function(donations) {
      response.status(201).json(donations)
    })
    .catch(function(error) {
      response.status(422).json({'Response 422': 'Unprocessable Entity'})
    });
  })
})

app.delete('/api/v1/users/:id', (request, response)=> {
  const { id } = request.params
    database('users').where('id', id).select().del()
    .then(function(count) {
      if (count === 0) {
        response.status(422).json({'Response 422': 'Unprocessable Entity'})
      } else {
        response.status(200).json({'Response 200': 'OK' })
      }
    })
})
app.delete('/api/v1/donation/:id', (request, response)=> {
  const { id } = request.params
    database('donation').where('id', id).select().del()
    .then(function(count) {
      if (count === 0) {
        response.status(422).json({'Response 422': 'Unprocessable Entity'})
      } else {
        response.status(200).json({'Response 200': 'OK' })
      }
    })
})

app.delete('/api/v1/comments/:id', (request, response)=> {
  const { id } = request.params
    database('comments').where('id', id).select().del()
    .then(function(count) {
      if (count === 0) {
        response.status(422).json({'Response 422': 'Unprocessable Entity'})
      } else {
        response.status(200).json({'Response 200': 'OK' })
      }
    })
})

app.delete('/api/v1/family/:id', (request, response)=> {
  const { id } = request.params
    database('family').where('id', id).select().del()
    .then(function(count) {
      if (count === 0) {
        response.status(422).json({'Response 422': 'Unprocessable Entity'})
      } else {
        response.status(200).json({'Response 200': 'OK' })
      }
    })
})

app.patch('/api/v1/users/:id', (request, response)=> {
  const { id } = request.params
  const { email } = request.body
  database('users').where('id', id).select()
    .then((user)=> {
      database('users').where('id', id).select().update({ email })
      .then(function(users) {
        response.status(201).json({success: 'true'})
      })
      .catch(function(error) {
        response.status(422).json({success: 'false'})
      })
  })
})

app.patch('/api/v1/comments/:id', (request, response)=> {
  const { id } = request.params
  const { body } = request.body
  database('comments').where('id', id).select()
    .then((comment)=> {
      database('comments').where('id', id).select().update({ body })
      .then(function(comments) {
        response.status(201).json({success: 'true'})
      })
      .catch(function(error) {
        response.status(422).json({success: 'false'})
      })
  })
})
app.patch('/api/v1/donation/:id', (request, response)=> {
  const { id } = request.params
  const { donationAmount } = request.body
  database('donation').where('id', id).select()
    .then((donation)=> {
      database('donation').where('id', id).select().update({ donationAmount })
      .then(function(donation) {
        response.status(201).json(donation)
      })
      .catch(function(error) {
        response.status(422).json({success: 'false'})
      })
  })
})

app.patch('/api/v1/family/:id', (request, response)=> {
  const { id } = request.params
  const {
    expiration,
    location,
    name,
    title,
    links,
    story,
    image,
    cost
  } = request.body

  const family = {
    expiration,
    location,
    name,
    title,
    links,
    story,
    image,
    cost
  }
    database('family').where('id', id).select().update({ family })
    .then(function(family) {
      response.status(201).json({success: 'true'})
    })
    .catch(function(error) {
      response.status(422).json({success: 'false'})
    })
  })

app.listen(app.get('port'), () => {
  console.log(`This thing is running on ${app.get('port')}.`)
})

module.exports = app;
