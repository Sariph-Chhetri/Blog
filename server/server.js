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

    let maxLimit = limit ? limit : 2;

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

    let { _id, comment, blog_author, replying_to } = req.body;
    console.log(replying_to)

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
         .then( blog =>{
            console.log('New comment created in DB')
         })
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

        }

        new Notification(notificationObj).save().then(notification =>{
            console.log('new notification created');
            return res.status(200).json({
                comment, commentedAt, _id: commentFile._id, user_id, children
            })
        })

    })
    .catch( err=>{
        return res.status(500).json({error:err.message})
    })

})

server.post("/get-blog-comments", (req, res) =>{

    let {blog_id, skip} = req.body;

    let maxLimit = 5;

    Comment.find( { blog_id, isReply: false})
    .populate('commented_by', 'personal_info.username personal_info.fullname personal_info.profile_img')
    .skip(skip)
    .limit(maxLimit)
    .sort({
        'commentedAt': -1
    })
    .then( comment =>{
      
        return res.status(200).json(comment)
    })
    .catch( err=>{
        console.log(err)
        return res.status(500).json({error:"error in get-blog-comments route"})
    })

})

server.post('/get-replies', (req,res) =>{

    let { _id, skip } = req.body;

    let maxLimit=5;

    Comment.findOne( { _id })
    .populate({
        path : "children",
        option :{
            limit:maxLimit,
            skip:skip,
            sort : {'commentedAt': -1}
        },
        populate: {
            path:"commented_by",
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
            .then( data =>{
                console.log('comment deleted from parent')
            })
            .catch( err=>{
                return res.status(500).json({error:err.message})
            })       
        }

        Notification.findOneAndDelete ( { comment: _id })
        .then( notification => console.log('comment notification deleted') )

        Notification.findOneAndDelete ( { reply : _id})
        .then( notification => console.log('reply notification deleted') )

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

server.listen(PORT , ()=>{
    console.log(`listening on port ${PORT}`)
})