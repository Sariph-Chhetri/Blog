import { configDotenv } from "dotenv";
import express from "express";
import mongoose from "mongoose";
import bcrypt, { hash } from 'bcrypt'
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
import Notification from './Schema/Notification.js'
import Comment from './Schema/Comment.js'

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
    origin: 'https://blog-one-drab.vercel.app' || "http://localhost:5173",  // Frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


mongoose.connect(process.env.DB_LOCATION , {
    autoIndex:true
})

// MongoDB connection for GridFS setup
const db = mongoose.connection;
const bucket = new GridFSBucket(db, { bucketName: 'banners' }); // 'banners' is the name of the GridFS bucket
const profileImageBucket = new GridFSBucket(db, { bucketName: 'profile_images' });


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
        // Return the image URL - force production URL if not localhost
        let serverUrl = process.env.SERVER;
        
        // If SERVER env var is not set or contains localhost, use production detection
        if (!serverUrl || serverUrl.includes('localhost')) {
            const host = req.get('host');
            // If host contains render.com or onrender.com, use it; otherwise use env default
            if (host && (host.includes('render.com') || host.includes('onrender.com'))) {
                serverUrl = `${req.protocol}://${host}`;
            } else {
                // Fallback - you should replace this with your actual Render URL
                serverUrl = process.env.RENDER_URL || 'https://your-app-name.onrender.com';
            }
        }
        
        const imageUrl = `${serverUrl}/uploads/${uploadStream.id}`;
        console.log('Generated banner image URL:', imageUrl); // Debug log
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

// Endpoint to upload profile image to MongoDB using GridFS
server.post("/upload-profile-image", upload.single('profile_images'), (req, res) => {
    const file = req.file;
    
    if (!file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    // Proceed with GridFS upload
    const uploadStream = profileImageBucket.openUploadStream(file.originalname);
    uploadStream.end(file.buffer);

    uploadStream.on('finish', () => {
        // Return the image URL for profile image - force production URL if not localhost
        let serverUrl = process.env.SERVER;
        
        // If SERVER env var is not set or contains localhost, use production detection
        if (!serverUrl || serverUrl.includes('localhost')) {
            const host = req.get('host');
            // If host contains render.com or onrender.com, use it; otherwise use env default
            if (host && (host.includes('render.com') || host.includes('onrender.com'))) {
                serverUrl = `${req.protocol}://${host}`;
            } else {
                // Fallback - you should replace this with your actual Render URL
                serverUrl = process.env.RENDER_URL || 'https://your-app-name.onrender.com';
            }
        }
        
        const imageUrl = `${serverUrl}/get-profile/${uploadStream.id}`;  // Path to the profile image using 'get-profile'
        console.log('Generated profile image URL:', imageUrl); // Debug log
        res.status(200).json({ success: true, url: imageUrl });  // Send the URL back to the frontend
    });
  
    uploadStream.on('error', (err) => {
        console.error('Error uploading file:', err);
        res.status(500).json({ error: "Error uploading profile image" });
    });
});

  // Retrieving profile image from GridFS
server.get('/get-profile/:id', (req, res) => {
    const fileId = new mongoose.Types.ObjectId(req.params.id);

    // Open download stream from the bucket (before checking files)
    const downloadStream = profileImageBucket.openDownloadStream(fileId);

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

server.post('/update-profile-img', verifyJWT , (req, res)=>{

    let { url} = req.body;

    User.findOneAndUpdate( { _id: req.user}, { "personal_info.profile_img":url })
    .then( ()=>{
        return res.status(200).json( {profile_img: url})
    })
    .catch( err =>{
        return res.status(500).json( {error: err.message })
    })

})
  
server.post('/change-password', verifyJWT,(req,res)=>{

    let { currentPassword, newPassword} = req.body;

    let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;


    if(!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)){
        return res.status(403).json({error:'Password must be 6 to 20 characters long with 1 uppercase,1 lowercase and 1 integer'})
    }

    User.findOne( { _id: req.user})
    .then( user =>{

        bcrypt.compare(currentPassword, user.personal_info.password, (err, result)=>{
            if(err){
                return res.status(500).json({ error:'some error occured while changing password!'})
            }
            if(!result){
                return res.status(403).json( {error:"Incorrect current password" })
            }

            bcrypt.hash(newPassword, 10, (err, hashed_password)=>{

                User.findOneAndUpdate({_id:req.user},{'personal_info.password': hashed_password})
                .then( (u)=>{
                    return res.status(200).json( {status :"Password Changed" })
                })
                .catch( err =>{
                    return res.status(500).json( {error: err.message })
                })

            })

        })

    })
    .catch( err =>{
        return res.status(500).json( {error: err.message })
    })

})

server.post('/latest-blogs',(req,res)=>{

    let { page } = req.body;

    let maxLimit = 5;

    Blog.find({draft:false})
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({ "publishedAt": -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit) // skip the document if skip(5) then it skips 5 document and starts from 6th
    .limit(maxLimit)
    .then(blogs =>{
        return res.status(200).json({blogs})
    })
    .catch(err =>{
        return res.status(500).json({error:err.message})
    })

}) 

server.post('/all-latest-blogs-count', (req,res) =>{

    Blog.countDocuments({ draft:false })
    .then( count =>{
        return res.status(200).json({ totalDocs : count })
    } )
    .catch(err=>{
        console.log(err)
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

server.post('/search-blogs',(req,res) =>{
    let { tag, author, query ,page, limit, eliminate_blog }  = req.body;

    let findQuery ;

    if(tag){
        findQuery = { tags: tag, draft:false, blog_id: { $ne : eliminate_blog } };
    }else if(query){
        findQuery = {draft:false, title: new RegExp(query, 'i') }
    }else if(author){
         findQuery = {author, draft:false}
    }

    let maxLimit = limit ? limit : 5;

    Blog.find(findQuery)
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({ "publishedAt": -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then(blogs =>{
        return res.status(200).json({ blogs })
    })
    .catch(err =>{
        return res.status(500).json({error:err.message})
    })

})

server.post('/search-blogs-count', (req,res) =>{

    let {tag,author, query} = req.body;
    let findQuery ;

    if(tag){
        findQuery = { tags: tag, draft:false };
    }else if(query){
        findQuery = {draft:false, title: new RegExp(query, 'i') }
    }else if(author){
        findQuery = {author, draft:false}
   }
    Blog.countDocuments(findQuery)
    .then( count => {

        return res.status(200).json({ totalDocs : count})

    })
    .catch( err =>{
        console.log(err)
        return res.status(500).json({ error:err.message})
    })

})

server.post('/search-users', (req,res) =>{
    let {query} = req.body;

    User.find({"personal_info.username": new RegExp(query, 'i')})
    .limit(50)
    .select("personal_info.fullname personal_info.username personal_info.profile_img -_id")
    .then( users =>{
        return res.status(200).json({users})
    })
    .catch( err =>{
        console.log(err)
        return res.status(500).json({error:err.message})
    })

})

server.post ( '/get-profile' , (req,res) =>{

    let {username} = req.body;

    User.findOne({ "personal_info.username": username})
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then( user =>{
        return res.status(200).json(user)
    })
    .catch( err =>{
      console.log(err)
      return res.status(500).json({error:err.message})
    })

})

server.post('/update-profile', verifyJWT , (req,res)=>{
    let {username, bio, social_links} = req.body;
    let bioLimit = 150;

    if(username.length < 3){
        return res.status(403).json({ error : "Username should be at least 3 characters long"})
    }

    if(bio.lenght > bioLimit){
        return res.status(403).json({error:`Bio should not be more than ${bioLimit} `})
      }
     
    let socialLinksArr = Object.keys(social_links);
    
    try{

        for(let i=0;  i < socialLinksArr.length ; i++){
            if(social_links[socialLinksArr[i]].length){
               let hostname = new URL(social_links[socialLinksArr[i]]).hostname;
               
               if(!hostname.includes(`${socialLinksArr[i]}.com`) && socialLinksArr[i] != 'website'){
                return res.status(403).json({ error: `${socialLinksArr[i]} link is invalid. You must enter full link`})
               }

            }

        }

    }
    catch(err){
       return res.status(500).json({ error: 'You must provide full social links with http(s) included'})
    }

    let updateObj = {
        "personal_info.username": username,
        "personal_info.bio": bio,
        social_links
    }

    User.findOneAndUpdate( { _id: req.user}, updateObj, {
        runValidators: true
    })
    .then( ()=>{
        return res.status(200).json( { username})
    })
    .catch ( err =>{
        if(err.code == 1100){
            return res.status(409).json({ error : "Username already exists" })
        }
        return res.status(500).json({ error : err.message })
    })

})

server.post('/create-blog', verifyJWT, (req, res) => {
    const authorId = req.user;
    let { title, des, banner, tags, content, draft, id } = req.body;;

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

   let blog_id = id || title.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, "-").trim() + nanoid();

   if(id) {

    Blog.findOneAndUpdate({ blog_id }, {title, des, banner, content, tags, draft: draft ? draft : false})
    .then( () =>{
        return res.status(200).json({ id: blog_id})
    })
    .catch( err =>{
        return res.status(500).json({ error: err.message})
    })

   }
   else
   {

    let blog = new Blog({
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
   }
   
});

server.post('/get-blog', (req,res)=>{

    let { blog_id, draft, mode } = req.body;

    let incrementVal = mode != "edit" ? 1 : 0;

    Blog.findOneAndUpdate ( { blog_id }, { $inc :{"activity.total_reads": incrementVal } })
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname ")
    .select( " title des content banner activity publishedAt blog_id tags ")
    .then( blog =>{

        User.findOneAndUpdate ( { "personal_info.username": blog.author.personal_info.username }, { $inc : { " account_info.total_reads": incrementVal }
        })
        .catch ( err =>{
            return res.status(500).json({ error : err.message })
        })

        if(blog.draft && !draft){
            return res.status(500).json( { error : `You can't access draft blogs`})

        }

        return res.status(200).json( { blog })
    })
    .catch( err =>{
        return res.status(500).json({ error : err.message })
    })

})

server.post( '/like-blog' , verifyJWT , (req,res)=>{

    let user_id = req.user;

    let { _id, isLikedByUser } = req.body;

    let incrementVal = !isLikedByUser ? 1 : -1;

    Blog.findOneAndUpdate( { _id }, { $inc : { "activity.total_likes": incrementVal } })
    .then( blog =>{
       

        if(!isLikedByUser){
            let like = new Notification({
                type : "like",
                blog : _id,
                notification_for : blog.author,
                user : user_id
            })

            like.save()
            .then( notification => {
                return res.status(200).json( { liked_by_user : true})
            })
            .catch(err=>{
                return res.status(500).json({error : err.message })
            })
        }
        else{

            Notification.findOneAndDelete ({ user: user_id, blog:_id, type: 'like' })
            .then( data =>{
                return res.status(200).json({ liked_by_user:false})
            })
            .catch(err=>{
                return res.status(500).json({error : err.message })
            })

        }

    })

})

server.post( '/isliked-by-user', verifyJWT , (req,res) =>{

    let user_id = req.user;
    let { _id } = req.body;

    Notification.exists( { user : user_id , type: 'like', blog: _id})
    .then( result =>{
        return res.status(200).json({ result })
    })
    .catch( err=>{
        return res.status(500).json({ error:err.message})
    })

})

server.post( '/add-comment',verifyJWT ,(req,res)=>{

    let user_id = req.user;

    let { _id, comment, blog_author, replying_to, notification_id } = req.body;

    if(!comment.length){
        return res.status(403).json({error :"Write something to leave a comment"});
    }

    // Creating a comment doc
    let commentObj = {
        blog_id : _id, blog_author, comment, commented_by : user_id, 
    }

    if(replying_to){
        commentObj.parent = replying_to;
        commentObj.isReply = true;
    }

    new Comment(commentObj).save().then(async commentFile =>{
        
         let {comment, commentedAt, children } = commentFile;

         Blog.findOneAndUpdate( { _id },{ $push : { "comments": commentFile._id }, $inc : {"activity.total_comments": 1, "activity.total_parent_comments": replying_to ? 0 : 1 } })
         .then()
         .catch( err=>{
            return res.status(500).json({error:"error while updating comment in DB"})
        })

        let notificationObj = {
            type : replying_to ? "reply" : "comment",
            blog :_id,
            notification_for: blog_author,
            user : user_id,
            comment : commentFile._id
        }

        if(replying_to){

            notificationObj.replied_on_comment = replying_to;

            await Comment.findOneAndUpdate ( {_id: replying_to }, {$push: { children : commentFile._id } })
            .then( replyingToCommentDoc =>{
                notificationObj.notification_for = replyingToCommentDoc.commented_by
            })

            if(notification_id){
                Notification.findOneAndUpdate( { _id: notification_id }, { reply: commentFile._id })
                .then( )
                .catch( err=>{
                    return res.status(500).json({error:err.message})
                })
            }

        }

        new Notification(notificationObj).save().then(notification =>{
            return res.status(200).json({
                comment, commentedAt, _id: commentFile._id, user_id, children
            })
        })

    })
    .catch( err=>{
        return res.status(500).json({error:err.message})
    })

})

// server.post("/get-blog-comments", (req, res) =>{

//     let {blog_id, skip} = req.body;

//     let maxLimit = 5;

//     Comment.find( { blog_id, isReply: false})
//     .populate('commented_by', 'personal_info.username personal_info.fullname personal_info.profile_img')
//     .skip(skip)
//     .limit(maxLimit)
//     .sort({
//         'commentedAt': -1
//     })
//     .then( comment =>{
      
//         return res.status(200).json(comment)
//     })
//     .catch( err=>{
//         console.log(err)
//         return res.status(500).json({error:"error in get-blog-comments route"})
//     })

// })

server.post("/get-blog-comments", (req, res) => {
    let { blog_id, skip } = req.body;
    let maxLimit = 5;

    Comment.find({ blog_id, isReply: false })
        .populate('commented_by', 'personal_info.username personal_info.fullname personal_info.profile_img')
        .then(comments => {
            // Step 1: Add reply count to each comment based on the length of the 'children' array
            comments.forEach(comment => {
                comment.replyCount = comment.children ? comment.children.length : 0;
            });

            // Step 2: Sort comments by reply count (desc) and then by commentedAt (desc)
            comments.sort((a, b) => {
                // First sort by reply count in descending order
                if (b.replyCount !== a.replyCount) {
                    return b.replyCount - a.replyCount;
                }

                // If reply count is the same, sort by commentedAt in descending order
                return new Date(b.commentedAt) - new Date(a.commentedAt);
            });

            // Step 3: Apply pagination (skip and limit)
            const paginatedComments = comments.slice(skip, skip + maxLimit);

            // Step 4: Return the sorted and paginated comments, including the 'comment' field
            const response = paginatedComments.map(comment => ({
                _id: comment._id,
                comment: comment.comment, // Include the comment text
                blog_id: comment.blog_id,
                commented_by: comment.commented_by,
                commentedAt: comment.commentedAt,
                replyCount: comment.replyCount,
                children: comment.children, // Include children (replies) if you want to send them as well
                isReply: comment.isReply
            }));

            return res.status(200).json(response);
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: "Error in get-blog-comments route" });
        });
});

server.post('/get-replies', (req,res) =>{

    let { _id, skip } = req.body;



    Comment.findOne( { _id })
    .populate({
        path : "children",
        options: {
           
            skip: skip,
            sort: {'commentedAt': -1}
        },
        populate: {
            path: "commented_by",
            select: "personal_info.profile_img personal_info.fullname personal_info.username "
        },
        select : "-blog_id -updatedAt"
    })
    .select("children")
    .then( doc =>{
        return res.status(200).json({ replies : doc.children })
    })
    .catch( err=>{
        return res.status(500).json({error:err.message})
    })

})

const deleteComments = ( _id) =>{

    Comment.findOneAndDelete ( { _id})
    .then( comment =>{
        if(comment.parent){
            Comment.findOneAndUpdate ( {_id : comment.parent },{ $pull :{ children:_id} } )
            .then()
            .catch( err=>{
                return res.status(500).json({error:err.message})
            })       
        }

        Notification.findOneAndDelete ( { comment: _id })
        .then( )

        Notification.findOneAndUpdate ( { reply : _id}, { $unset: { reply: 1 } })
        .then(  )

        Blog.findOneAndUpdate ( { _id : comment.blog_id}, { $pull : {comments : _id}, $inc : { "activity.total_comments": -1 }, "activity.total_parent_comments": comment.parent ? 0 : -1 })
        .then( blog =>{

            if(comment.children.length){
                comment.children.map( replies =>{
                    deleteComments(replies);
                })
            }
             
        })

    })
    .catch( err=>{
        return res.status(500).json({error:err.message})
    })

}

server.post('/delete-comment', verifyJWT, (req,res) =>{

    let user_id = req.user;

    let { _id} = req.body;

    Comment.findOne ( { _id})
    .then( comment =>{

        if ( user_id == comment.commented_by || user_id == comment.blog_author){

            deleteComments(_id)

            return res.status(200).json({status : "done"})

        }
        else
        {
            return res.status(403).json( { error : "You can't delete this comment."})
        }

    })

})

server.get("/new-notification", verifyJWT , (req,res)=>{

    let user_id = req.user;

    Notification.exists( { notification_for: user_id, seen:false, user: { $ne: user_id } })
    .then( result => {
        if(result){
            return res.status(200).json({ new_notification_available : true})
        }
        else{
            return res.status(200).json({ new_notification_available : false})
        }
    })
    .catch( err=>{
        return res.status(500).json({error: err.message})
    })

})

server.post("/notification" , verifyJWT ,(req, res) =>{
    let user_id = req.user;

    let { page, filter, deletedDocCount } = req.body;

    let maxLimit = 10;

    let findQuery = { notification_for: user_id, user: { $ne : user_id} }

    let skipDocs = (page - 1) * maxLimit;

    if(filter != 'all'){
        findQuery.type = filter;
    }

    if(deletedDocCount){
       skipDocs -= deletedDocCount;
    }

    Notification.find( findQuery )
    .skip(skipDocs)
    .limit(maxLimit)
    .populate("blog", "title blog_id ")
    .populate("user", "personal_info.fullname personal_info.username personal_info.profile_img")
    .populate("comment", "comment")
    .populate("replied_on_comment", "comment")
    .populate("reply", "comment")
    .sort( { createdAt: -1 })
    .select("createdAt type seen reply ")
    .then( notifications =>{

        Notification.updateMany(findQuery, { seen : true})
        .skip(skipDocs)
        .limit(maxLimit)

        return res.status(200).json({ notifications})

    })
    .catch(err =>{
        console.log(err.message)
        return res.status(500).json ( { error: err.message})
    })

})

server.post("/all-notifications-count", verifyJWT , (req,res) =>{

    let user_id = req.user;

    let { filter }= req.body;

    let findQuery = { notification_for: user_id, user: {$ne : user_id}}

    if( filter != 'all'){
        findQuery.type = filter;
    }

    Notification.countDocuments(findQuery)
    .then( count =>{
        return res.status(200).json({ totalDocs : count})
    })
    .catch ( err=>{
        return res.status(500).json({error: err.message})
    })

})

server.post("/user-written-blogs", verifyJWT,(req,res)=>{
    let user_id = req.user;

    let { page, draft, query, deletedDocCount } = req.body;

    let maxLimit = 5;
    let skipDocs = (page - 1) * maxLimit;

    if(deletedDocCount){
        skipDocs -= deletedDocCount;
    }

    Blog.find({ author: user_id, draft, title: new RegExp(query, 'i')  })
    .skip(skipDocs)
    .limit(maxLimit)
    .sort( { publishedAt : -1})
    .select(" title banner publishedAt blog_id activity des draft -_id")
    .then( blogs =>{
        return res.status(200).json( { blogs})
    })
    .catch ( err=>{
        console.log(err)
        return res.status(500).json({error: err.message})
    })

})

server.post("/user-written-blogs-count", verifyJWT, (req,res)=>{

    let user_id = req.user;

    let { draft, query } = req.body;

    Blog.countDocuments( { author: user_id, draft, title: new RegExp(query, 'i')  })
    .then( count =>{
        return res.status(200).json( { totalDocs: count})
    })
    .catch ( err=>{
        console.log(err)
        return res.status(500).json({error: err.message})
    })

})

// server.post("/delete-blog", verifyJWT , (req, res) =>{

//     let user_id = req.user;
//     let { blog_id } = req.body;

//     Blog.findOneAndDelete ( { blog_id })
//     .then( blog =>{

//         Notification.deleteMany( { blog: blog._id }).then( data =>{
//             return res.status(200).json({ message: "Blog notification deleted" })
//         })

//         Comment.deleteMany( { blog_id : blog._id }).then( data =>{
//             return res.status(200).json({ message: "Blog comments deleted" })
//         })

//         User.findOneAndUpdate ( { _id: user_id}, { $pull: { blog: blog._id }, $inc : { "account_info.total_posts": -1} }).then( data =>{
//             return res.status(200).json({ message: "Blog deleted and user updateed" })
//         })

//         return res.status(200).json({ message: "Blog deleted" })
//     })
//     .catch( err =>{
//         return res.status(500).json({ error: err.message})
//     })

// })

server.post("/delete-blog", verifyJWT, (req, res) => {
    let user_id = req.user;
    let { blog_id } = req.body;

    Blog.findOneAndDelete({ blog_id })
        .then(blog => {
            // Start deleting notifications, comments, and updating the user
            return Promise.all([
                Notification.deleteMany({ blog: blog._id }),
                Comment.deleteMany({ blog_id: blog._id }),
                User.findOneAndUpdate({ _id: user_id }, { $pull: { blog: blog._id }, $inc: { "account_info.total_posts": blog.draft ? 0 : -1 } })
            ])
                .then(() => {
                    // Once all promises are resolved, send a single response
                    return res.status(200).json({ message: "Blog, notifications, comments deleted, and user updated" });
                })
                .catch(err => {
                    // Catch any errors from the above operations
                    return res.status(500).json({ error: err.message });
                });
        })
        .catch(err => {
            // Catch errors related to deleting the blog itself
            return res.status(500).json({ error: err.message });
        });
});


server.listen(PORT , ()=>{
    console.log(`listening on port ${PORT}`)
})