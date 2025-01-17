import { useContext, useState } from "react"
import { UserContext } from "../App";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { blogContext } from "../pages/blog.page";

const CommentField = ( { action } ) => {

    let {blog, setBlog, blog:{_id, comments,activity, activity:{ total_comments, total_parent_comments }, author : { _id : blog_author }}, setTotalParentCommentsLoaded} = useContext(blogContext);
    let { userAuth:{access_token, username, fullname, profile_img} } = useContext(UserContext)

    const [comment, setComment] = useState("");

    const handleComment = () => {

    if (access_token) {
        if(!comment.length){
            toast.error("Write something to leave a comment");
        }

        axios.post(import.meta.env.VITE_DOMAIN_SERVER + "/add-comment",{ _id, blog_author, comment },{
            headers :{
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then( ({ data }) =>{
          
            setComment('');
            data.commentedBy = { personal_info : { username, profile_img, fullname}}

            let newCommentArr;

            data.childrenLevel = 0;

            newCommentArr = [ data ]

            let parentCommentIncrementval = 1;

            setBlog( { ...blog, comments :{...comments, results : newCommentArr}, activity:{...activity, total_comments:total_comments+1, total_parent_comments: total_parent_comments + parentCommentIncrementval } } )
          
            setTotalParentCommentsLoaded( prevVal = prevVal + parentCommentIncrementval)

        })
        .catch( err=>{
            console.log(err)
        })

    } 
    if(!access_token){
      toast.error("You need an account to comment on this blog!");
    }
   
  };

  return (
    <>
    <Toaster />
    <textarea value={comment}
    onChange={(e)=> setComment(e.target.value)}
     placeholder="Leave a comment..."
    className="input-box pl-5 placeholder:text-dark-grey resize-none h-[150px] overflow-auto "
   
    ></textarea>
    <button 
    onClick={handleComment}
    className=" btn-dark mt-5 px-10 "> {action} </button>
    </>
  )
}

export default CommentField
