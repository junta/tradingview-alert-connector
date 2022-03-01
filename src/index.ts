import express from 'express'
import messageController from './controllers/message'
const app: express.Express = express()
const port = 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/", messageController)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})