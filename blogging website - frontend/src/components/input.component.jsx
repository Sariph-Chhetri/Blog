import React, { useState } from 'react'

const InputBox = (props) => {
  const [passwordVisible , setPasswordVisible] = useState(false)
  return (
    <div className='relative w-[100%] mb-4'>
     <input 
     name={props.name}
     type={props.type === "password" ? passwordVisible ? "text": "password" : props.type}
     placeholder={props.placeholder}
     defaultValue={props.value}
     id={props.id}
     className='input-box'
     disabled = {props.disable}
      />
      <i className={`fi ${props.icon} input-icon`} />

       {
             
             props.type == "password" && 
             <i className={`fi fi-rr-eye${!passwordVisible ? "-crossed" : ""} input-icon left-[auto]
             right-4 cursor-pointer`}
             onClick={()=>setPasswordVisible(prevVal => !prevVal)}
             />
       }
    </div>
  )
}

export default InputBox
