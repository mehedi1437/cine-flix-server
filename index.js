const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();

const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// jwt
function createToken(user) {
  const token = jwt.sign(
    {
      email: user.email,
    },
    "secret",
    { expiresIn: "7d" }
  );
  return token;
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  const verify = jwt.verify(token, "secret");
  if (!verify?.email) {
    return res.send("you are not authorized");
  }
  req.user = verify.email;
  next();
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5pbosvq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("CINE-FLIX");
    const moviesCollection = database.collection("movie");
    const usersCollection = database.collection("user");

    // Movie related Routes

    // creating index on tWo fields
    const indexKeys = { name: 1 };
    const indexOption = { name: "name" };

    const result = await moviesCollection.createIndex(indexKeys, indexOption);
    app.get("/movieSearch/:text", async (req, res) => {
      const searchText = req.params.text;
      const result = await moviesCollection
        .find({
          $or: [
            { name: { $regex: searchText, $options: "i" } },
            { genre: { $regex: searchText, $options: "i" } },
          ],
        })
        .toArray();
      res.send(result);
    });

    // Add a Movie
    app.post("/movie", verifyToken, async (req, res) => {
      const body = req.body;
      body.createdAt = new Date();
      if (!body) {
        return res.status(404).send({ message: "body data is not found" });
      }
      const result = await moviesCollection.insertOne(body);
      res.send(result);
      // console.log(result);
    });

    // get allMovie
    app.get("/movies", async (req, res) => {
      const cursor = moviesCollection.find().sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });
    // get allMovies by catrgory
    app.get("/movies/:category", async (req, res) => {
      const category = req.params.category;
      const cursor = moviesCollection
        .find({ genre: category })
        .sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    // get singleMovies by id
    app.get("/singleMovies/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await moviesCollection.findOne(query);
      res.send(result);
    });
    // get singleMovies by email
    app.get("/singleMovie/:email", async (req, res) => {
      const email = req.params.email;
      const result = await moviesCollection
        .find({ email: email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // Update a Movie
    app.put("/update-movies/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const movie = req.body;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedMovie = {
        $set: {
          name: movie.name,
          email: movie.email,
          img: movie.img,
          rating: movie.rating,
          genre: movie.genre,
          language: movie.language,
          releaseDate: movie.releaseDate,
          description: movie.description,
        },
      };
      const result = await moviesCollection.updateOne(
        filter,
        updatedMovie,
        option
      );
      res.send(result);
    });

    // Delete A movie
    app.delete("/movie/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await moviesCollection.deleteOne(query);
      res.send(result);
    });

    // User related Routes

    // post user Data

    app.post("/users", verifyToken, async (req, res) => {
      const user = req.body;
      const token = createToken(user);
      console.log(token);
      const isUserExit = await usersCollection.findOne({ email: user?.email });
      if (isUserExit) {
        return res.send({
          status: "Success",
          message: "Login success",
          token,
        });
      }
      await usersCollection.insertOne(user);
      res.send({ token });
    });

    app.get("/users/get/:id", async (req, res) => {
      const id = req.params.id;
      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      res.send(user);
    });

    // get user data by Email

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      res.send(user);
    });

    // Update a user
    app.patch("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email };
      const option = { upsert: true };
      const updatedUser = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedUser,
        option
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("MOVIE IS RUNNING");
});

app.listen(port, () => {
  console.log(`Movie IS RUNNING ON PORT ${port}`);
});
