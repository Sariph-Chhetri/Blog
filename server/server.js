import { configDotenv } from "dotenv";
import express from "express";
import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import { nanoid } from "nanoid";
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { GridFSBucket } from "mongodb";
import multer from "multer";
// import admin from 'firebase-admin'
// import serviceAccountKey from "./react-blog-webite"
// import getAuth from 'firebase-admin/auth'

//schemas
import Blog from "./Schema/Blog.js"
import User from './Schema/User.js'

configDotenv();
const server = express();
let PORT = process.env.PORT;

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccountKey);
// })

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

server.use(express.json());
server.use(cors({
    origin: 'http://localhost:5173',  // Frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

mongoose.connect(process.env.DB_LOCATION , {
    autoIndex:true
})

// MongoDB connection for GridFS setup
const db = mongoose.connection;
const bucket = new GridFSBucket(db, { bucketName: 'banners' }); // 'banners' is the name of the GridFS bucket

// File upload setup using Multer
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

// after user sign up, these data are given access to the user.
const formatDataToSend = (user)=>{

    const access_token = jwt.sign({id: user._id},process.env.SECRET_ACCESS_KEY)

return {
    access_token,
    profile_img : user.personal_info.profile_img ,
    username : user.personal_info.username,
    fullname : user.personal_info.fullname
}
}  

const generateUsername = async (email)=>{
   let username = email.split('@')[0];

   let isUsernameExists = await User.exists({"personal_info.username":username}).then((result)=> result)

    isUsernameExists ? username += nanoid().substring(0,5) : "";
    
    return username;
}

server.post("/signup",(req,res)=>{

    let {fullname ,email,password} = req.body;

    //validating data from frontend
    if(fullname.length < 3) {
        return res.status(403).json({"error" : "Fullname must be three characters long."})
    }
    if(!email.length ){
        return res.status(403).json({"error" : "Enter your email."})
    }
    if (!emailRegex.test(email)){
        return res.status(403).json({"error" : "Email is invalid."})
    }
    if (!passwordRegex.test(password)){
        return res.status(403).json({"error" : "password must be 6 to 20 characters long with 1 uppercase,1 lowercase and 1 integer"})
    }
    
    bcrypt.hash(password,10,async(err,hashed_password)=>{
        
        if (err) {
            return res.status(500).json({ "error": "Error hashing the password." });
        }

        let username = await generateUsername(email);

        let user = new User({
            personal_info:{fullname,email,password:hashed_password,username}
        })

        user.save().then((data)=>{
              return res.status(200).json(formatDataToSend(data))
        })
        .catch((err) => {
            if(err.code === 11000){
                return res.status(500).json({"error":"Email already exists"})
            }

            return res.status(500).json({"error" : err.message})
        })

    })

})

server.post("/signin",(req,res)=>{

    const{email,password} = req.body;

    User.findOne({"personal_info.email":email})
    .then((user)=>{
         if(!user){
            return res.status(403).json({"error":"User not found"})
         }

         bcrypt.compare(password,user.personal_info.password, (err,result)=>{

            if(err){
                res.status(403).json({"error":"error occured ehile login ,please try again later"})
            }

            if(!result){
                res.status(403).json({"error":"Incorrect Password"})
            }
            else{
                res.status(200).json(formatDataToSend(user))
            }

         })

    })
   .catch((err)=>{
       return res.status(500).json({"error" :err.message})
   })

})

// server.post("/google-auth" , (req,res) =>{

//     let {access_token} = req.body;

//     getAuth()
//     .verifyIdToken(access_token)
//     .then(async(decodedUser)=>{

//         let {email, name , picture} = decodedUser;

//         picture = picture.replace("s96-c" , "s384-c");

//         let user = await user.findOne({"personal_info.email": email})
//         .select("personal_info.fullname personal_info.fullname")

//     })

// })



// Endpoint to upload image (blog banner) to MongoDB using GridFS
server.post("/upload-banner", upload.single('banner'), (req, res) => {
    const file = req.file;
    
    if (!file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    // Proceed with GridFS upload
    const uploadStream = bucket.openUploadStream(file.originalname);
    uploadStream.end(file.buffer);

    uploadStream.on('finish', () => {
        // Return the image URL
        const imageUrl = `/uploads/${uploadStream.id}`;
        res.status(200).json({ success: true, url: imageUrl }); // Send the URL back to the frontend
      });
      
  
    uploadStream.on('error', (err) => {
      console.error('Error uploading file:', err);
      res.status(500).json({ error: "Error uploading file" });
    });
  });
  
// Serve uploaded files from GridFS
server.get('/uploads/:id', (req, res) => {
    const fileId = new mongoose.Types.ObjectId(req.params.id);

    // Check if the file exists in GridFS
    bucket.find({ _id: fileId }).toArray((err, files) => {
        console.log(files)
        if (err || files.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const fileId = new mongoose.Types.ObjectId(req.params.id);
        console.log("Requested file ID:", fileId);  // Log fileId to check if it's correctly formed

        const downloadStream = bucket.openDownloadStream(fileId);

        downloadStream.on('data', (chunk) => {
            res.write(chunk);
        });

        downloadStream.on('end', () => {
            res.end();
        });

        downloadStream.on('error', (err) => {
            console.error('Error while downloading file:', err);  // Add detailed error logging
            res.status(500).json({ error: 'Error retrieving file' });
        });
    });
});


server.listen(PORT , ()=>{
    console.log(`listening on port ${PORT}`)
})