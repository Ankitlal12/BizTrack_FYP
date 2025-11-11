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
            icon:<LuShoppingBag size={20} />,
        }
        const purchasesItem={
            name:'Purchases',
            path:'/purchases',
            icon:<CiDeliveryTruck size={20} />,

        }
        if(user?.role==='owner'){
            return [
                {
                    name:'Dashboard',
                    path:'/dashboard',
                    icon:<TbLayoutDashboard size={20} />,
                },
                ...inventoryItems,
                {
                    name:'Sales',
                    path:'/sales',
                    icon:<FiShoppingCart size={20} />
                },
                purchasesItem,
                billingItem,
                {
                name: 'Invoices',
                path: '/invoices',
                icon: <FiFileText size={20} />,
                },
                {
                name: 'Transaction History',
                path: '/transactions',
                icon: <FaHistory size={20} />,
                },
                {
                name: 'Reports',
                path: '/reports',
                icon: <IoBarChartSharp size={20} />,
                },
                {
                name: 'Settings',
                path: '/settings',
                icon: <CiSettings size={20} />,
                },
            ]
        }
        if(user?.role==='manager'){
            return [
                {
                name:'Inventory',
                path:'/inventory',
                icon: <FiPackage size={20} />,
                },
                purchasesItem,
                billingItem
            ]
        }
    })
})