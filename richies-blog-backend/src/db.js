import { MongoClient } from "mongodb";

let db;

async function connectToDb(cb) {
    const client = new MongoClient(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@richiesblog.8s2m2no.mongodb.net/?retryWrites=true&w=majority`)   
    await client.connect();
    db = client.db('richies-blog')
    cb()
}

export {
    db,
    connectToDb,
}