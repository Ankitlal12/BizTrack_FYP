import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import { CiLock, CiUser } from "react-icons/ci";

const Login = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();
  const [password,setPassword]=useState("");
  const [error,setError]=useState('');
  const[isLoading,setIsLoading]=useState(false);

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try{
        const succcess =await login(username,password)
        if(succcess){
            navigate('/',{
                replace:true,
            })
        }else{
            setError('Invalid username or password')
        }
        
    }catch(err){
            setError('An error occured. Please try again. ')
        }finally{
            setIsLoading(false)
        }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            BizTrack
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inventory & Business Management System
          </p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md">
            <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                   <div className="bg-red-50 border-l-4     border-red-500 p-4 rounded-md">
                     <p className="text-sm text-red-700">{error}</p>
                   </div>
                )}
            </form>
        </div>
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700"
          >
            Username
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CiUser className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="username"
              name="username"
              autoComplete="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10 block w-full border border-gray-300 rounded-md py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="Username"
            />
          </div>
        </div>
        <div>
            <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
            >
               Password 
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                 type="paswword"
                 name="password"
                 required
                 autoComplete="password"
                 id="password"
                 value={password}
                 onChange={(e)=>setPassword(e.target.value)}
                 className="pl-10 block w-full border border-gray-300 rounded-md py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="Password"
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
