import React, { useEffect, useState } from 'react'
import AnimationWrapper from '../common/page-animation'
import InPageNavigation from '../components/inpage-navigation.component'
import Loader from '../components/loader.component'
import axios from 'axios'
import BlogPostCard from '../components/blog-post.component'
import MinimalBlogPost from '../components/nobanner-blog-post.component'

const HomePage = () => {

    let [blogs , setBlogs] = useState(null);
    let [trendingBlogs , setTrendingBlogs] = useState(null);

    const fetchLatestBlogs = () =>{

        axios.get(import.meta.env.VITE_DOMAIN_SERVER + "/latest-blogs")
        .then(({data: {blogs}}) =>{
         setBlogs(blogs);
        })
        .catch(err =>{
            console.log(err)
        })

    }

    const fetchTrendingBlogs = () =>{

      axios.get(import.meta.env.VITE_DOMAIN_SERVER + "/trending-blogs")
      .then(({data: {blogs}}) =>{
       setTrendingBlogs(blogs);
      })
      .catch(err =>{
          console.log(err)
      })

  }

    useEffect(()=>{

        fetchLatestBlogs();
        fetchTrendingBlogs();

    },[])

  return (
    <AnimationWrapper>

    <section className='h-cover flex justify-center gap-10'>

      <div className='w-full'>

        <InPageNavigation routes={["home","trending blogs"]}
        defaultHidden={['trending blogs']}
        >
            <>

           {
            blogs == null ? <Loader /> : 
            blogs.map((blog , i) =>{
                return <AnimationWrapper transition={{duration:1, delay:i*.1}} key={i}>

                    <BlogPostCard
                    content={blog}
                    author={blog.author.personal_info}
                    />

                </AnimationWrapper>
            })
           }

            </>
            {
               trendingBlogs == null ? <Loader /> : 
               blogs.map((blog , i) =>{
                   return <AnimationWrapper transition={{duration:1, delay:i*.1}} key={i}>
                     <MinimalBlogPost blog={blog} index={i} />
                   </AnimationWrapper>
               })

            }


        </InPageNavigation>

      </div>

    </section>

    </AnimationWrapper>
  )
}

export default HomePage
