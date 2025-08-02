const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const logger = (req, res, next) =>{
  console.log('inside the logger');
  next();
}

const verifyToken = (req, res, next) =>{
  const token = req?.cookies?.token;
  if(!token){
    return res.status(401).send({message: "Unauthorized access"});
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({message: "Unauthorized access"});
    }
    req.user = decoded;
    next()
  })
   
}

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.4utyr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const database = client.db('docHouseDB');
    const doctorsCollection = database.collection('doctors');
    const servicesCollection = database.collection('services');
    const usersCollection = database.collection('users');
    const appointmentsCollection = database.collection('appointments');

    // Auth related API's
    app.post('/jwt', (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: '1h'})
      res.cookie('token', token,{
        httpOnly: true,
        secure: false,
        sameSite: 'strict'
      })
      .send({success: true})
    })
    app.get('/doctors', async(req, res)=>{
      const result = await doctorsCollection.find().toArray();
      res.send(result);
    })
    app.get('/services', async(req, res)=>{
      const result = await servicesCollection.find().toArray();
      res.send(result);
    })
    app.get(`/doctor/:id`, async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await doctorsCollection.findOne(query);
      res.send(result);
    })
    app.post('/users', async(req, res) =>{
      const {name, userName, email, uid, createdAt} = req.body;
      const user = {name, userName, email, uid, createdAt: new Date(createdAt)}
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })
    app.post('/appointments', async(req, res)=>{
      const body = req.body;
      const result = await appointmentsCollection.insertOne(body);
      res.send(result);
    })
    app.get('/myappointments', verifyToken, async(req, res)=>{
      const email = req.query.email;
      const query = {usersEmail: email};
      if(req.user.email !== email){
        return res.status(403).send({message: "Forbidden access"});
      }
      const result = await appointmentsCollection.find(query).toArray();
      res.send(result);
    })
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) =>{
  res.send('Doc House server is running')
})

app.listen(port, (req, res) =>{
  console.log(`Doc house server is running on ${port}`)
})

