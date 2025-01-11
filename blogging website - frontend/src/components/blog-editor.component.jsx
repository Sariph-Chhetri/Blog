import React, { useContext, useEffect,useState } from "react";
import { Link } from "react-router-dom";
import logo from "../imgs/logo.png";
import AnimationWrapper from "../common/page-animation";
import defaultBanner from "../imgs/blog banner.png";
import { EditorContext } from "../pages/editor.pages";
import EditorJS from "@editorjs/editorjs";
import { tools } from "./tools.component";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";

const BlogEditor = () => {
  const {blog,blog: { title, banner, content, tags, des },setBlog,textEditor,setTextEditor,setEditorState,} = useContext(EditorContext);

  const [loading, setLoading] = useState(false);


  useEffect(() => {
    setTextEditor(
      new EditorJS({
        holder: "editorjs",
        data: "",
        placeholder: "Write Your Blog Here",
        tools: tools,
      })
    );
  }, []);

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0]; // Get the file uploaded by the user
    if (!file) return;

    const formData = new FormData();
    formData.append("banner", file); // Append the file to formData

    setLoading(true);
   
    try {
      const response = await axios.post("http://localhost:3000/upload-banner", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data && response.data.url) {
        setBlog({ ...blog, banner: response.data.url }); // Set the banner URL in the state
        toast.success("Banner uploaded successfully!");
      }
    } catch (error) {
      console.error("Error uploading banner:", error);
      toast.error("Error uploading banner. Please try again.");
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.keycode == 11) {
      e.preventDefault();
    }
  };

  const handleTitleChange = (e) => {
    let input = e.target;

    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
    setBlog({ ...blog, title: input.value });
  };

  const handlePublishEvent = () => {
    // if(banner.length){
    //     return toast.error("Upload a blog banner before publishing")
    // }

    if (!title.length) {
      return toast.error("Give blog a title before publishing");
    }

    if (textEditor.isReady) {
      textEditor
        .save()
        .then((data) => {
          if (data.blocks.length) {
            setBlog({ ...blog, content: data });
            setEditorState("publish");
          } else {
            return toast.error("Write something in your blog to publish it");
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="flex-nonr w-10">
          <img src={logo} alt="logo blogeditor" />
        </Link>

        <p className="max-md:hidden text-black line-clamp-1 w-full">
          {title.length > 0 ? title : "New Blog"}
        </p>

        <div className="flex gap-4 ml-auto">
          <button onClick={handlePublishEvent} className="btn-dark py-2 ">
            Publish
          </button>

          <button className="btn-light py-2 ">Save Draft</button>
        </div>
      </nav>
      <Toaster />

      <AnimationWrapper>
        <section>
          {/* BannerDiv */}
          <div className="mx-auto max-w=[900px] w-full">
            <div className="relative aspect-video hover:opacity-80 bg-white border-4 border-grey">
              <label htmlFor="uploadBanner">

                {banner ? (
                <img src={`http://localhost:3000${banner}`} alt="Blog Banner" />             
                ) : (
                  <img src={defaultBanner} alt="blog banner" />
                )}

                <input
                  id="uploadBanner"
                  type="file"
                  accept=".png , .jpg , .jpeg"
                  hidden
                  onChange={handleBannerUpload}
                />
              </label>
            </div>
          </div>

          <textarea
            className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40 "
            placeholder="Blog Title"
            onKeyDown={handleTitleKeyDown}
            onChange={handleTitleChange}
          ></textarea>

          <hr className="w-full opacity-10 my-5" />

          <div id="editorjs" className="font-gelasio"></div>
        </section>
      </AnimationWrapper>
    </>
  );
};

export default BlogEditor;
