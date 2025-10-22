import React, { useContext } from 'react'
import InputBox from '../components/input.component'
import googleIcon from '../imgs/google.png'
import { Link, Navigate} from 'react-router-dom'
import AnimationWrapper from '../common/page-animation'
import {Toaster ,toast} from 'react-hot-toast'
import axios from 'axios'
import { storeInSession } from '../common/session'
import { UserContext } from '../App'
// import { authWithGoogle } from '../common/firebase'

const UserAuthForm = ({type}) => { 

  let {userAuth : {access_token}, setUserAuth} = useContext(UserContext)

  const BASE_URL=import.meta.env.VITE_DOMAIN_SERVER 

  const userAuthThroughServer = async(serverRoute , formData) =>{
   
    await axios.post(`${BASE_URL}${serverRoute}`, formData)
    .then(({data})=>{
      
      storeInSession("user",JSON.stringify(data))  
      setUserAuth(data);

    })
    .catch(({response}) => {
      console.log(response)
      toast.error(response.data.error);
    })

  }

  const handlesubmit = (e)=>{

   e.preventDefault();

   if (!type) {
    return toast.error("Invalid form type");
  }

   let serverRoute = type === "signin" ? "/signin":"/signup";

   let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
   let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

   let form = new FormData(formElement)
   let formData = {};

   form.forEach((value,key) =>{
    formData[key] = value;
   })

   let {fullname , email, password} = formData;
   
   //form validation

   if(fullname){
   if(fullname.length < 3) {
    return toast.error( "Fullname must be three characters long.")
}
   }

if(!email.length ){
    return toast.error("Enter your email.")
}

if (!emailRegex.test(email)){
    return toast.error( "Email is invalid.")
}

if (!passwordRegex.test(password)){
    return toast.error( "password must be 6 to 20 characters long with 1 uppercase,1 lowercase and 1 integer")
}

userAuthThroughServer(serverRoute ,formData)

  }
  
  // const handleGoogleAuth =  (e) => {

  //   e.preventDefault();
  
  //   authWithGoogle().then(user =>{
  //     console.log(user);
  //   })
  //   .catch(err=>{
  //     toast.error("trouble login in through google");
  //     return console.log(err)
  //   })
  
  // }

  const handleGoogleAuth = (e) =>{
    e.preventDefault();
    toast.error("This is not currently available !")
  }

  return (
    access_token ? 
  <Navigate to='/' />
   :
    <AnimationWrapper key={type}>
    <section className='h-cover flex items-center justify-center'>
      <Toaster />
       <form id='formElement'  className='w-[80%] max-w-[400px]'>
        <h1 className='text-4xl font-gelasio capitalize text-center mb-24'>
               {type == "signin" ? "Welcome back" : "Join us today"}
        </h1>

        {
            type != "signin" && 
            <InputBox
            name="fullname"
            type="text"
            placeholder="Full name"
            icon="fi-rr-user"
              /> 
        }
              <InputBox
            name="email"
            type="email"
            placeholder="Email"
            icon="fi-rr-envelope"
              /> 
        
        <InputBox
            name="password"
            type="password"
            placeholder="Password"
            icon="fi-rr-key"
              /> 

         <button 
         type='submit'
         className='btn-dark center mt-14'
         onClick={handlesubmit}
         >
          {type === "signin" ? "Log In" : "Sign Up"}
          </button>     

           <div className='relative w-full flex items-center gap-2 my-10 opacity-10
           uppercase text-black font-bold '>
               <hr className='w-1/2 border-black' />
                <p>or</p>      
               <hr className='w-1/2 border-black' />
           </div>

           <button className='btn-dark flex justify-center items-center gap-4 w-[90%] center'
           onClick={handleGoogleAuth}
           >
            <img src={googleIcon}
            className='w-5' 
             alt="googleicon" />
            continue with google
           </button>

         {
          type === "signin" ?
          <p className='mt-6 text-dark-grey text-xl text-center'>
            Don't have an account ?
            <Link to='/signup' className='underline text-black text-xl ml-1'>
            Join us today
            </Link>
            </p>
            :
            <p className='mt-6 text-dark-grey text-xl text-center'>
            Already a member ?
            <Link to='/signin' className='underline text-black text-xl ml-1'>
            Log in here
            </Link> 
          </p>
         }

       </form>
    </section>
    </AnimationWrapper>
  )
}

export default UserAuthForm
