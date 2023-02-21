import fs from 'fs'
import path from 'path'
import admin from 'firebase-admin'
import express from 'express'
import 'dotenv/config'
import { db, connectToDb } from './db.js'

import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const credentials = JSON.parse(
    fs.readFileSync('../credentials.json')
)

// Initialize firebase admin package and conect to firebase project
admin.initializeApp({
    credential: admin.credential.cert(credentials),
})

// Create new express app
const app = express();


// Middleware: Whenever a JSON body is received, the data is parsed
app.use(express.json())

// User Build folder as static folder
app.use(express.static(path.join(__dirname, '../build')))


// Add a route handler for receiving a request that isn't to one of the API routes
// Send back index.html file
app.get(/^(?!\/api).+/), (req, res) => {
    res.sendfile(path.join(__dirname, '../build/index.html'))
}



// Middleware
app.use(async (req, res, next) =>{
    const { authtoken } = req.headers;

    if (authtoken) {
        try {
            req.user = await admin.auth().verifyIdToken(authtoken);
        } catch (e) {
            return res.sendStatus(400)
        }
    }
    req.user = req.user || {}
    next()
})



// ENDPOINTS

app.get('/api/articles/:name', async (req, res) => {
    const { name } = req.params
    const { uid } = req.user
    const article = await db.collection('richies-blog').findOne({ name })

    if (article) {
        const upvoteIds = article.upvoteIds || [];
        article.canUpvote = uid && !upvoteIds.includes(uid);
        res.json(article);
    } else {
        res.sendStatus(404);
    }
})


// Prevent non-users from making requests to the endpoints below
app.use((req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.sendStatus(401)
    }
})

// Defining the 'upvote article' endpoint
app.put('/api/articles/:name/upvote', async (req, res) => {
    const { name } = req.params;
    const { uid } = req.user;

    const article = await db.collection('richies-blog').findOne({ name })

    if (article) {
        const upvoteIds = article.upvoteIds || [];
        const canUpvote = uid && !upvoteIds.includes(uid);
        
        if (canUpvote) {
            await db.collection('richies-blog').updateOne({ name }, { 
                $inc: { upvotes: 1 }, 
                $push: { upvoteIds: uid } 
            });
        }
        
    // Use MongoDB operator to incremement the amount of upvotes per article
        const updatedArticle = await db.collection('richies-blog').findOne({ name })
        res.json(updatedArticle)
    } else {
        res.send('That article does not exist')
    }
})

app.post('/api/articles/:name/comments', async (req, res) => {
    const { name } = req.params;
    const { text } = req.body;
    const { email } = req.user;

    await db.collection('richies-blog').updateOne({ name },
        { $push: { comments: { email, text } } }
    )

    const article = await db.collection('richies-blog').findOne({ name })

    if (article) {
        res.json(article)
    } else {
        res.send('That article does not exist!')
    }
})


const PORT = process.env.PORT || 8000

connectToDb(() => {
    console.log('Successfully connected to MongoDB!')
    app.listen(PORT, () => {
        console.log("Server is listening on port " + PORT);
    })
})