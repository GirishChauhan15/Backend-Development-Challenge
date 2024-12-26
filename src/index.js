import connectDB from "./db/index.js";
import { app } from "./app.js";
import 'dotenv/config'

let port = process.env.PORT || 8000

connectDB()
.then(()=>{
    app.on('error',(err)=>{
        console.log(`Error while connecting to server, ${err}`)
    })

    app.listen(port, ()=>{
        console.log(`Port is listening at ${port}`)
    })

}
)
.catch((err)=>{
    console.log(`MongoDB connection error ${err}`)
})