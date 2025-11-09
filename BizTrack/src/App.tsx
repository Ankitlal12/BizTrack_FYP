import React from "react";
import { useAuth } from "./contexts/AuthContext";
import {Toaster} from 'sonner'
import { lazy } from "react";

const Login=lazy(()=>import('./Pages/Login'))