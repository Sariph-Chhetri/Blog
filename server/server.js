import { configDotenv } from "dotenv";
import express from "express";
import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import { nanoid } from "nanoid";
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { GridFSBucket , ObjectId ,  MongoClient } from "mongodb";
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

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];
  
    if (token == null) {
      return res.status(401).json({ error: "No access token" });
    }

    jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Access token is invalid" });
      }
      req.user = user.id; // Make sure this line is executed and the token is valid
      next();
    });
  }; 

// after user sign up, these data are given access to the user.
const formatDataToSend = (user)=>{

    const access_token = jwt.sign({id: user._id},process.env.SECRET_ACCESS_KEY)

return {
    access_token,
    profile_img : user.personal_info.profile_img ,
    username : user.personal_info.username,
    fullname : user.personal_info.fullname
}}  

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
  
// retrieving images from GridFS
server.get('/uploads/:id', (req, res) => {
    const fileId = new mongoose.Types.ObjectId(req.params.id);

    // Open download stream from the bucket (before checking files)
    const downloadStream = bucket.openDownloadStream(fileId);

    // Handle any errors in case the file does not exist
    downloadStream.on('error', (err) => {
        console.error('Error while downloading file:', err);  // Detailed error logging
        return res.status(404).json({ error: 'File not found' });  // Return file not found if error
    });

    // Set the appropriate content type for the file
    downloadStream.on('file', (file) => {
        res.set('Content-Type', file.contentType);  // Ensure the correct content type is sent
    });

    // Pipe the download stream to the response
    downloadStream.pipe(res);

    // The 'end' event should be handled by the pipe, but just in case, you can handle it
    downloadStream.on('end', () => {
        res.end();  // Ensure the response is closed when download finishes
    });
});

server.get('/latest-blogs',(req,res)=>{

    let maxLimit = 5;

    Blog.find({draft:false})
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({ "publishedAt": -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .limit(maxLimit)
    .then(blogs =>{
        return res.status(200).json({blogs})
    })
    .catch(err =>{
        return res.status(500).json({error:err.message})
    })

}) 

server.get('/trending-blogs', (req,res) =>{

    Blog.find({draft:false})
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({ "activity.total_read": -1, "activity.total_likes":-1, "publishedAt":-1 })
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then(blogs =>{
        return res.status(200).json({blogs})
    })
    .catch(err=>{
        return res.status(500).json({error:err.message})
    })

})

server.post('/create-blog', verifyJWT, (req, res) => {
    const authorId = req.user;
    let { title, des, banner, tags, content, draft } = req.body;;

    if (!title || !title.length) {
        console.error("Error: Missing title");
        return res.status(403).json({ error: "You must provide a title" });
    }

    if (!draft) {
        if (!des || des.length > 200) {
            console.error("Error: Invalid description length");
            return res.status(403).json({ error: "You must provide a blog description under 200 characters" });
        }
        if (!banner || !banner.length) {
            console.error("Error: Missing banner");
            return res.status(403).json({ error: "You must provide a blog banner to publish it" });
        }

        if (!content || !content.blocks || content.blocks.length === 0) {
            console.error("Error: Missing content or empty content blocks");
            return res.status(403).json({ error: "You must provide blog content to publish it" });
        }
        if (!tags || tags.length === 0 || tags.length > 10) {
            console.error("Error: Invalid tags count");
            return res.status(403).json({ error: "You must provide tags to publish it, max 10" });
        }
    }

    // Ensure tags are in lowercase
    tags = tags.map(tag => tag.toLowerCase());

    const blog_id = title.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, "-").trim() + nanoid();

    const blog = new Blog({
        title,
        des,
        banner,
        content,
        tags,
        author: authorId,
        blog_id,
        draft: Boolean(draft),
    });

    blog.save()
        .then(blog => {
            let incrementVal = draft ? 0 : 1;

            User.findOneAndUpdate(
                { _id: authorId },
                { $inc: { "account_info.total_posts": incrementVal }, $push: { "blogs": blog._id } }
            ).then(() => {
                return res.status(200).json({ id: blog.blog_id });
            }).catch((err) => {
                console.error('Error updating user:', err);
                return res.status(500).json({ error: "Failed to update user posts count." });
            });
        })
        .catch(err => {
            console.error('Error saving blog:', err); // Log the exact error message here
            return res.status(500).json({ error: err.message });
        });
});


server.listen(PORT , ()=>{
    console.log(`listening on port ${PORT}`)
})