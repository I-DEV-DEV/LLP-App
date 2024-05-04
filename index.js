import express from "express";
import {dirname} from "path";
import { fileURLToPath } from "url";


const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST="127.0.0.1";
const PORT = process.env.PORT || 3000;
const APP = express();

APP.use(express.static("public"));

// ROUTES

// '/' -> Homepage
APP.get("/",(req, res)=> {
                                    //res.send("<h1>THE APP IS GOING LIVE</h1>");
                                    res.sendFile(__dirname+"/public/home.html");
                                }
);

// '/register' -> Registration
APP.post("/register",(req,res) => {
        res.send("Welcome to the User Dashboard");
    }
);


// Server listening
APP.listen(PORT,HOST,()=> {
        console.log(`App listening on ${HOST}:${PORT}`);
    }
);
