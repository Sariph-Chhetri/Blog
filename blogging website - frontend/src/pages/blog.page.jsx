import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import { getDay } from "../common/date";
import BlogInteraction from "../components/blog-interaction.component";

export const blogStructure = {
  title: "",
  des: "",
  content: [],
  tags: [],
  banner: "",
  author: { personal_info: {} },
  publishedAt: "",
};

export const blogContext = createContext({  });

const BlogPage = () => {
  const { blog_id } = useParams();

  const [blog, setBlog] = useState(blogStructure);
  const [loading, setLoading] = useState(true);

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
      .then(({ data: { blog } }) => {
        setBlog(blog);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBlog();
  }, []);

  return (
    <AnimationWrapper>
      {loading ? (
        <Loader />
      ) : (
        <blogContext.Provider value={{ blog, setBlog }}>
        <div className="max-w-[900px] center py-10 max-lg:px-[5vw] ">
          <img
            src={`http://localhost:3000${banner}`}
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

        </div>
      
      </blogContext.Provider>
      )}
    </AnimationWrapper>
  );
};

export default BlogPage;
