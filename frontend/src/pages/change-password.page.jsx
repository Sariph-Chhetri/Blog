import React, { useContext, useRef } from 'react'
import AnimationWrapper from '../common/page-animation';
import InputBox from '../components/input.component';
import { Toaster, toast } from 'react-hot-toast';
import axios from 'axios';
import { UserContext } from '../App';

const ChangePassword = () => {

  let { userAuth:{access_token}} = useContext(UserContext);

  let changePasswordForm = useRef();
  let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

  const handleSubmit =(e) =>{
    e.preventDefault();

    let form = new FormData(changePasswordForm.current);
    let formData =  {};

    form.forEach((value, key) => {
      formData[key] = value;
    });

    let { currentPassword, newPassword} = formData;

    if(!currentPassword.length || !newPassword.length){
      return toast.error(' Fill all the inputs')
    }

    if(!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)){
      return toast.error('Password must be 6 to 20 characters long with 1 uppercase,1 lowercase and 1 integer')
    }

    e.target.setAttribute( 'disabled', true);

    let loadingToast = toast.loading("Updating....")

    axios.post(import.meta.env.VITE_DOMAIN_SERVER + "/change-password", formData, {
      headers:{
        'Authorization': `Bearer ${access_token}`
      }
    })
    .then(()=>{
      changePasswordForm.current.reset();
      toast.dismiss(loadingToast);
      e.target.removeAttribute('disabled');
       toast.success('Password Updated!')
     
    })
    .catch(({response}) =>{
      toast.dismiss(loadingToast);
      e.target.removeAttribute('disabled');
    toast.error(response.data.error);
    })

  }

  return (
    <AnimationWrapper>
      <Toaster />
      <form ref={changePasswordForm}>

        <h1 className='max-md:hidden'>Change Password</h1>

        <div className='py-10 w-full md:max-w-[400px] '>
          <InputBox 
          name='currentPassword'
          type='password'
          placeholder='Current Password'
          icon='fi-rr-unlock'
          className='profile-edit-input'
          />
          <InputBox 
          name='newPassword'
          type='password'
          placeholder='New Password'
          icon='fi-rr-unlock'
          className='profile-edit-input'
          />

          <button onClick={handleSubmit} className='btn-dark px-10' type='submit'>Change Password</button>
        </div>

      </form>
    </AnimationWrapper>
  )
}

export default ChangePassword;
