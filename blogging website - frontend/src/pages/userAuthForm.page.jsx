import React from 'react'
import InputBox from '../components/input.component'
import googleIcon from '../imgs/google.png'
import {Link} from 'react-router-dom'
import AnimationWrapper from '../common/page-animation'

const UserAuthForm = ({type}) => {
  return (
    <AnimationWrapper key={type}>
    <section className='h-cover flex items-center justify-center'>
       <form className='w-[80%] max-w-[400px]'>
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
         className='btn-dark center mt-14
         '>
          {type === "signin" ? "Log In" : "Sign Up"}
          </button>     

           <div className='relative w-full flex items-center gap-2 my-10 opacity-10
           uppercase text-black font-bold '>
               <hr className='w-1/2 border-black' />
                <p>or</p>      
               <hr className='w-1/2 border-black' />
           </div>

           <button className='btn-dark flex justify-center items-center gap-4 w-[90%] center'>
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
