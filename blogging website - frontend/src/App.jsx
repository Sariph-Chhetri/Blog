import { Route, Routes } from "react-router-dom";
import Navbar from "./components/navbar.component";
import UserAuthForm from "./pages/userAuthForm.page";
import { createContext, useEffect, useState } from "react";
import { lookInSession } from "./common/session";
import Editor from "./pages/editor.pages";


export const UserContext = createContext({})

const App = () => {

    const [userAuth ,setUserAuth] = useState({});

    useEffect(()=>{

        let userInSession = lookInSession("user");

        userInSession ? setUserAuth(JSON.parse(userInSession)) : setUserAuth({access_token : null})

    },[])

    return (
        <UserContext.Provider value={{userAuth , setUserAuth}}>
        <Routes>
            <Route path="/" element={<Navbar/>} >
            <Route path="/signin" element={<UserAuthForm type={"signin"} />} />
            <Route path="/signup" element={<UserAuthForm type={"signup"} />} />
            </Route>
            <Route path="/editor" element={<Editor />} />
        </Routes>
        </UserContext.Provider>
    )
}

export default App;



// const handleBannerUpload = async (e) => { 
//     const file = e.target.files[0]; // Get the file selected by the user
//     const BASE_URL = import.meta.env.VITE_DOMAIN_SERVER;
  
//     if (!file) {
//       console.log('No file selected');
//       return; // Exit if no file is selected
//     }
  
//     // If file exists, proceed with FormData
//     const formData = new FormData();
//     formData.append('banner', file); // Append the file to FormData
  
//     // Send the file to the backend using a POST request
//     try {
//       const response = await fetch(`${BASE_URL}/upload-banner`, {
//         method: 'POST',
//         body: formData,
//       });
  
//       const data = await response.json();
//       if (data.success) {
//         setBlog((prev) => {
//           console.log('Updated blog state:', { ...prev, banner: data.url }); // Log updated state
//           return { ...prev, banner: data.url };  // Set the banner URL in state
//         });
//         toast.success('Banner uploaded successfully!');
//       } else {
//         toast.error('Banner upload failed.');
//       }
//     } catch (error) {
//       console.error('Error uploading banner:', error);
//       toast.error('Error uploading banner.');
//     }
//   };