import { useContext, useEffect } from "react";
import { blogContext } from "../pages/blog.page";
import { Link } from "react-router-dom";
import { UserContext } from "../App";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";

const BlogInteraction = () => {
  let {
    blog,
    blog: {
      title,
      _id,
      blog_id,
      activity,
      activity: { total_likes, total_comments },
      author: {
        personal_info: { username: author_username },
      },
    },
    setBlog,
    isLikedByUser,
    setIsLikedByUser,
    setCommentsWrapper
  } = useContext(blogContext);

  let {
    userAuth: { username, access_token },
  } = useContext(UserContext);

  useEffect(() => {
    
    if(access_token){

      axios.post(import.meta.env.VITE_DOMAIN_SERVER + "/isliked-by-user",{_id},{
        headers:{
          'Authorization': `Bearer ${access_token}`
        }
      })
      .then(({ data :{result} }) => {
        setIsLikedByUser(Boolean(result))
      })
      .catch((err) => {
         console.log(err)
      });

    }
    
  }, [])
  

  const handleLike = () => {
    if (access_token) {
      setIsLikedByUser(prevval => !prevval);

      !isLikedByUser ? total_likes++ : total_likes--;

      setBlog({ ...blog, activity: { ...activity, total_likes } });

      axios
        .post(
          import.meta.env.VITE_DOMAIN_SERVER + "/like-blog",
          {_id, isLikedByUser },
          {
            headers: {
              'Authorization' : `Bearer ${access_token}`
            }
          }
        )
        .then(({ data }) => {
          console.log(data);
        })
        .catch((err) => {
           console.log(err)
        });

    } else {
      toast.error("You need an account to like on this blog!");
    }
  };

  

  return (
    <>
      <Toaster />
      <hr className="border-grey my-2" />

      <div className="flex gap-6 justify-between">
        <div className=" flex gap-3 items-center ">
          <button
            onClick={handleLike}
            className={
              "w-10 h-10 rounded-full flex items-center justify-center " +
              (isLikedByUser ? "text-red bg-red/20" : "bg-grey/80")
            }
          >
            <i
              className={
                "fi " + (isLikedByUser ? "fi-sr-heart" : "fi-rr-heart")
              }
            ></i>
          </button>

          <p className="text-xl text-dark-grey"> {total_likes} </p>

          <button
            onClick={( ) => setCommentsWrapper(prevval => !prevval)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-grey/80 "
          >
            <i className="fi fi-rr-comment-dots"></i>
          </button>
          <p className="text-xl text-dark-grey"> {total_comments} </p>
        </div>

        <div className="flex gap-6 items-center">
          {username == author_username ? (
            <Link
              to={`/editor/${blog_id}`}
              className=" underline hover:text-purple "
            >
              Edit
            </Link>
          ) : (
            ""
          )}

          <Link
            to={`https://twitter.com/intent/tweet?text=Read ${title}&url=${location.href}`}
          >
            <i className="fi fi-brands-twitter text-2xl hover:text-twitter"></i>
          </Link>
        </div>
      </div>

      <hr className="border-grey my-2" />
    </>
  );
};

export default BlogInteraction;
