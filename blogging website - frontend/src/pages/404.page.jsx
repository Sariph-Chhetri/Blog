import { Link } from 'react-router-dom'
import pageNotFoundImg from '../imgs/404.png'
import fullLogo from'../imgs/full-logo.png'

const PageNotFound = () => {
  return (
    
    <section className='h-cover relative p-10 flex flex-col items-center gap-20 text-center'>

        <img 
        className='select-none border-2 border-grey w-72 aspect-square object-cover rounded '
        src={pageNotFoundImg} 
        alt="error" />

        <h1 className='text-4xl font-gelasio leading-7'>Page not found</h1>
        <p className='text-dark-grey text-xl leading-7 -mt-8'>The page you are looking for doesn't exist. Head back to <Link className='text-black underline' to={'/'}>home page</Link></p>

         <div className='mt-auto'>
               <img className='h-8 object-contain block mx-auto select-none' src={fullLogo} alt="error" />
               <p className='text-dark-grey mt-5 '>Read millions of stories around the world</p>
         </div>

    </section>

  )
}

export default PageNotFound
