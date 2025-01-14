import { Route, Routes } from "react-router-dom";
import Navbar from "./components/navbar.component";
import UserAuthForm from "./pages/userAuthForm.page";
import { createContext, useEffect, useState } from "react";
import { lookInSession } from "./common/session";
import Editor from "./pages/editor.pages";
import HomePage from "./pages/home.page";
import SearchPage from "./pages/search.page";


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
            <Route index element={<HomePage />} />
            <Route path="/signin" element={<UserAuthForm type={"signin"} />} />
            <Route path="/signup" element={<UserAuthForm type={"signup"} />} />
            <Route path="search/:query" element={<SearchPage />} />
            </Route>
            <Route path="/editor" element={<Editor />} />
        </Routes>
        </UserContext.Provider>
    )
}

export default App;


