import express from "express";

const app = express();
let sleep = ms => new Promise(r => setTimeout(r, ms))
app.get('/',async (req,res)=>{
 res.sendStatus(200);
 await sleep(20000);
 console.log(req,res)
})
app.listen(2000)
