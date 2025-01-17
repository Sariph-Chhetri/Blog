import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import { getDay } from "../common/date";
import BlogInteraction from "../components/blog-interaction.component";
import BlogPostCard from "../components/blog-post.component";
import BlogContent from "../components/blog-content.component";
import CommentsContainer from "../components/comments.component";
import { fetchComments } from "../components/comments.component";

export const blogStructure = {
  title: "",
  des: "",
  content: [],
  banner: "",
  author: { personal_info: {} },
  publishedAt: "",
};

export const blogContext = createContext({  });

const BlogPage = () => {
  const { blog_id } = useParams();

  const [blog, setBlog] = useState(blogStructure);
  const [similarBlog, setSimilarBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ isLikedByUser, setIsLikedByUser]  = useState(false);
  const [ commentsWrapper, setCommentsWrapper] = useState(true);
  const [totalParentCommentsLoaded, setTotalParentCommentsLoaded] = useState(0);

  let {
    title,
    des,
    content,
    banner,
    author: {
      personal_info: { fullname, username: author_username, profile_img },
    },
    publishedAt,
  } = blog;

  const fetchBlog = () => {
    axios
      .post(import.meta.env.VITE_DOMAIN_SERVER + "/get-blog", { blog_id })
      .then(async ({data:{blog}, data: { blog : { tags}} }) => {

        blog.commments = await fetchComments({ blog_id : blog._id, setParentCommentCountFunc : setTotalParentCommentsLoaded})

        setBlog(blog);

        axios.post(import.meta.env.VITE_DOMAIN_SERVER + "/search-blogs",{ tag: tags[0], limit:6, eliminate_blog:blog_id })
        .then( ( { data}) =>{
          
               setSimilarBlog(data.blogs)
        })
    
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  };

  useEffect(() => {

    resetState();
    fetchBlog();

  }, [blog_id]);

  const resetState = () =>{
    setBlog(blogStructure);
    setSimilarBlog(null);
    setLoading(true);
    setIsLikedByUser(false);
    setCommentsWrapper(true);
    setTotalParentCommentsLoaded(0);
  }

  return (
    <AnimationWrapper>
      {loading ? (
        <Loader />
      ) : (
        <blogContext.Provider value={{ blog, setBlog, isLikedByUser, setIsLikedByUser, commentsWrapper, setCommentsWrapper, totalParentCommentsLoaded, setTotalParentCommentsLoaded }}>

         <CommentsContainer />

        <div className="max-w-[900px] center py-10 max-lg:px-[5vw] ">
          <img
            src={banner}
            className="aspect-video"
          />

          <div className="mt-12">
            <h2>{title}</h2>

            <div className="flex max-sm:flex-col justify-between my-8 ">
              <div className="flex gap-5 items-start">
                <img src={profile_img} className="w-12 h-12 rounded-full" />

                <p>
                  {fullname}
                  <br />@
                  <Link className="underline" to={`/user/${author_username}`}>
                    {" "}
                    {author_username}{" "}
                  </Link>
                </p>
              </div>

              <p className="text-dark-grey opacity-75 max-sm:mt-6 max-sm:ml-12 max-sm:pl-5 ">
                Published on {getDay(publishedAt)}{" "}
              </p>

            </div>
          </div>

           <BlogInteraction  />

              <div className=" my-12 font-gelasio blog-page-content ">
                {
                  content[0].blocks.map((block, i) =>{
                    return <div key={i} className="my-4 md:my-8">
                       <BlogContent block={block} />
                       </div>
                  })
                }
              </div>
          
           <BlogInteraction  />

           {
            similarBlog != null && similarBlog.length ? 
            <>

               <h1 className="text-2xl mt-14 mb-10 font-medium  ">Similar Blogs</h1>

               {
                similarBlog.map((blog, i) => {
                  let {author:{personal_info}} = blog;

                  return <AnimationWrapper
                  key={i}
                  transition={{duration:1, delay:i*0.08}}
                  >
                    <BlogPostCard content={blog} author={personal_info} />

                  </AnimationWrapper>

                })
               }

            </>
            : ""
           }

        </div>
      
      </blogContext.Provider>
      )}
    </AnimationWrapper>
  );
};

export default BlogPage;
