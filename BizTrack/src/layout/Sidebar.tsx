import React, { useCallback, useMemo, useState, memo } from 'react'
import { NavLink } from 'react-router-dom'
 
import { FaHistory } from "react-icons/fa";
import { TbLayoutDashboard } from "react-icons/tb";
import { FiPackage } from "react-icons/fi";
import { FiShoppingCart } from "react-icons/fi";
import { CiDeliveryTruck } from "react-icons/ci";
import { FiFileText } from "react-icons/fi";
import { CiSettings } from "react-icons/ci";
import { LuShoppingBag } from "react-icons/lu";
import { IoBarChartSharp } from "react-icons/io5";
import { FiMenu } from "react-icons/fi";
import { RxCross2 } from "react-icons/rx";


import { useAuth } from '../contexts/AuthContext';
const Sidebar=memo(()=>{
    const [collapsed,setCollapsed]=useState(false)
    const {user}=useAuth()
    const navItems=useMemo(()=>{
        const inventoryItems=[
            {
                name:'Inventory',
                path:'/inventory',
                icon: <FiPackage size={20} />,
            },
        ]
        const billingItem={
            name:'Billing',
            path:'billing',
            icon:<LuShoppingBag size={20} />
        }
    })
})