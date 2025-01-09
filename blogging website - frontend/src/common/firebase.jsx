// import { initializeApp } from "firebase/app";
// import {GoogleAuthProvider,getAuth, signInWithPopup } from 'firebase/auth'

// const firebaseConfig = {
//   apiKey: "AIzaSyCbJHSVZ4hRAqFyAOIFRmSDoh0NX-x7Bi8",
//   authDomain: "react-blog-project-db782.firebaseapp.com",
//   projectId: "react-blog-project-db782",
//   storageBucket: "react-blog-project-db782.firebasestorage.app",
//   messagingSenderId: "82390696110",
//   appId: "1:82390696110:web:a6cf9dc0878920fc4dad3f"
// };

// const app = initializeApp(firebaseConfig);

// const provider = new GoogleAuthProvider();

// const auth = getAuth();

// export const authWithGoogle= async ()=>{

//     let user = null;

//     await signInWithPopup(auth, provider)
//     .then((result) =>{
//         user = result.user
//     })
//     .catch((err)=>{
//         console.log(err)
//     })

//     return user;
// }
