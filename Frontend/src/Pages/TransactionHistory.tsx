import React from 'react'
import Layout from '../layout/Layout'

const TransactionHistory = () => {
    return (
        <Layout>
            <div className='p-4'>
                <h2 className="text-2xl font-semibold text-gray-800">Transaction History</h2>
                <p className='text-gray-600 mt-2'>Welcome to your Transaction History</p>
            </div>
        </Layout>
    );
};

export default TransactionHistory;
