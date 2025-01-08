import { Route, Routes } from "react-router-dom";
import Navbar from "./components/navbar.component";
import UserAuthForm from "./pages/userAuthForm.page";

const App = () => {
    return (
        <Routes>
            <Route path="/" element={<Navbar/>} >
            <Route path="/signin" element={<UserAuthForm type={"signin"} />} />
            <Route path="/signup" element={<UserAuthForm type={"signup"} />} />
            </Route>
            <Route path="/editor" element={<h1>editor</h1>} />
        </Routes>
    )
}

export default App;